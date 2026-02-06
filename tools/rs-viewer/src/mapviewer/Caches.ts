import pako from 'pako'
import { CacheSystem } from '../rs/cache/CacheSystem.ts'

// Use proxy in dev mode to avoid CORS, direct in production
const OPENRS2_BASE = import.meta.env.DEV
  ? '/api/openrs2'
  : 'https://archive.openrs2.org'

export interface XteaKey {
  archive: number
  group: number
  name_hash: number
  name: string | null
  mapsquare: number
  key: number[]
}

/**
 * Fetch XTEA keys for a cache from OpenRS2.
 * Returns a Map from region ID to key array.
 */
export async function fetchXteas(scope: string, id: number): Promise<Map<number, number[]>> {
  const url = `${OPENRS2_BASE}/caches/${scope}/${id}/keys.json`
  console.log('Fetching XTEA keys from:', url)
  console.log('OPENRS2_BASE:', OPENRS2_BASE)
  console.log('import.meta.env.DEV:', import.meta.env.DEV)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch XTEA keys: ${res.status}`)

  const keys: XteaKey[] = await res.json()
  const map = new Map<number, number[]>()

  for (const entry of keys) {
    if (entry.mapsquare >= 0 && entry.key.length === 4) {
      map.set(entry.mapsquare, entry.key)
    }
  }

  console.log(`Loaded ${map.size} XTEA keys`)
  return map
}

/**
 * Download a full cache ZIP from OpenRS2 and extract into file map.
 */
export async function downloadCache(
  scope: string,
  id: number,
  onProgress?: (receivedMB: number, totalMB: number) => void,
): Promise<Map<string, Uint8Array>> {
  const url = `${OPENRS2_BASE}/caches/${scope}/${id}/disk.zip`
  console.log('Downloading cache from:', url)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download cache: ${res.status}`)

  const contentLength = parseInt(res.headers.get('content-length') ?? '0')
  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  // Read the full response into a buffer
  const chunks: Uint8Array[] = []
  let receivedBytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    receivedBytes += value.length
    if (onProgress) {
      onProgress(receivedBytes / (1024 * 1024), contentLength / (1024 * 1024))
    }
  }

  // Merge chunks
  const zipData = new Uint8Array(receivedBytes)
  let offset = 0
  for (const chunk of chunks) {
    zipData.set(chunk, offset)
    offset += chunk.length
  }

  console.log(`Downloaded ${(receivedBytes / 1024 / 1024).toFixed(1)} MB cache ZIP`)

  // Extract ZIP using the browser's built-in DecompressionStream (for individual entries)
  // We'll use a simple ZIP parser since the files are .dat2 and .idx* files
  return extractZip(zipData)
}

/**
 * ZIP extractor using the central directory (handles data descriptors).
 * Supports stored and deflated entries.
 */
function extractZip(zipData: Uint8Array): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>()
  const view = new DataView(zipData.buffer, zipData.byteOffset, zipData.byteLength)

  // Find End of Central Directory record (scan backwards from end)
  let eocdPos = -1
  for (let i = zipData.length - 22; i >= Math.max(0, zipData.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054B50) {
      eocdPos = i
      break
    }
  }
  if (eocdPos === -1) throw new Error('ZIP: End of Central Directory not found')

  const cdEntries = view.getUint16(eocdPos + 10, true)
  let cdOffset = view.getUint32(eocdPos + 16, true)

  console.log(`ZIP central directory: ${cdEntries} entries at offset ${cdOffset}`)

  // Read central directory entries
  for (let i = 0; i < cdEntries; i++) {
    if (view.getUint32(cdOffset, true) !== 0x02014B50) break

    const compression = view.getUint16(cdOffset + 10, true)
    const compressedSize = view.getUint32(cdOffset + 20, true)
    const uncompressedSize = view.getUint32(cdOffset + 24, true)
    const nameLen = view.getUint16(cdOffset + 28, true)
    const extraLen = view.getUint16(cdOffset + 30, true)
    const commentLen = view.getUint16(cdOffset + 32, true)
    const localHeaderOffset = view.getUint32(cdOffset + 42, true)

    const nameBytes = zipData.subarray(cdOffset + 46, cdOffset + 46 + nameLen)
    const name = new TextDecoder().decode(nameBytes)

    cdOffset += 46 + nameLen + extraLen + commentLen

    // Skip directories
    if (name.endsWith('/') || compressedSize === 0) continue

    // Read local file header to find actual data start
    const localNameLen = view.getUint16(localHeaderOffset + 26, true)
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true)
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen

    const compressedData = zipData.subarray(dataStart, dataStart + compressedSize)

    let fileData: Uint8Array
    if (compression === 0) {
      fileData = compressedData.slice()
    } else if (compression === 8) {
      fileData = pako.inflateRaw(compressedData)
    } else {
      console.warn(`Skipping ${name}: unsupported compression ${compression}`)
      continue
    }

    // Use just the filename (strip directory path)
    const baseName = name.split('/').pop() ?? name
    if (baseName && fileData.length > 0) {
      files.set(baseName, fileData)
    }
  }

  console.log(`Extracted ${files.size} files from ZIP:`, Array.from(files.keys()))
  return files
}

/**
 * Load a cache from OpenRS2, returning the CacheSystem and XTEA keys.
 */
export async function loadCacheFromOpenRS2(
  scope: string,
  id: number,
  onProgress?: (receivedMB: number, totalMB: number) => void,
): Promise<{ cache: CacheSystem; xteas: Map<number, number[]> }> {
  // Download cache and XTEA keys in parallel
  const [files, xteas] = await Promise.all([
    downloadCache(scope, id, onProgress),
    fetchXteas(scope, id),
  ])

  const cache = CacheSystem.fromFiles(files)
  return { cache, xteas }
}
