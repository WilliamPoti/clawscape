import { ByteBuffer } from '../io/ByteBuffer.ts'

/**
 * Raw model data parsed from RS model binary format.
 * Contains vertices, faces, colors, textures, and other properties.
 */
export class ModelData {
  vertexCount = 0
  faceCount = 0
  texturedFaceCount = 0

  // Vertices (per vertex)
  vertexX: Int32Array = new Int32Array(0)
  vertexY: Int32Array = new Int32Array(0)
  vertexZ: Int32Array = new Int32Array(0)

  // Faces (per face = triangle)
  faceVertexA: Uint16Array = new Uint16Array(0)
  faceVertexB: Uint16Array = new Uint16Array(0)
  faceVertexC: Uint16Array = new Uint16Array(0)

  // Face properties
  faceColors: Int16Array = new Int16Array(0)        // packed HSL
  faceRenderTypes: Int8Array | null = null          // 0=normal, 1=, 2=textured, 3=
  faceAlphas: Int8Array | null = null               // transparency (0=opaque, 255=transparent)
  facePriorities: Int8Array | null = null           // render priority (higher = later)

  // Textured faces
  faceTextures: Int16Array | null = null            // texture IDs (-1 = none)
  textureCoordinates: Int8Array | null = null       // UV mapping type

  // Textured triangles (for UV mapping)
  texturedFaceVertexA: Uint16Array = new Uint16Array(0)
  texturedFaceVertexB: Uint16Array = new Uint16Array(0)
  texturedFaceVertexC: Uint16Array = new Uint16Array(0)

  // Vertex normals (optional, for pre-lit models)
  vertexNormalsX: Int32Array | null = null
  vertexNormalsY: Int32Array | null = null
  vertexNormalsZ: Int32Array | null = null

  // Default priority when no per-face priorities
  priority = 0

  // Debug counters
  private static formatCounts = { new: 0, old: 0, legacy: 0 }
  private static logged = false

  /**
   * Decode model from binary data.
   * RS has multiple model formats: V3, V2, V1, and old/legacy.
   * Format is determined by the last two bytes (footer signature).
   */
  static decode(data: Int8Array): ModelData {
    // Format detection by footer bytes (dennisdev reference):
    // V3: data[length-1] === -3 (0xFD) && data[length-2] === -1 (0xFF)
    // V2: data[length-1] === -2 (0xFE) && data[length-2] === -1 (0xFF)
    // V1: data[length-1] === -1 (0xFF) && data[length-2] === -1 (0xFF)
    // Old: everything else
    const lastByte = data[data.length - 1]
    const secondLastByte = data[data.length - 2]

    let model: ModelData
    let format: string
    if (lastByte === -3 && secondLastByte === -1) {
      // V3 format (newest OSRS)
      ModelData.formatCounts.new++
      format = 'V3'
      model = ModelData.decodeV3(data)
    } else if (lastByte === -2 && secondLastByte === -1) {
      // V2 format
      ModelData.formatCounts.old++
      format = 'V2'
      model = ModelData.decodeV2(data)
    } else if (lastByte === -1 && secondLastByte === -1) {
      // V1 format
      ModelData.formatCounts.legacy++ // Reusing legacy counter for stats
      format = 'V1'
      model = ModelData.decodeV1(data)
    } else {
      format = 'OLD'
      // Old format (pre-V1)
      if (ModelData.formatCounts.legacy <= 3) {
        console.log(`  Model uses old format (len=${data.length}, last bytes: ${lastByte}, ${secondLastByte})`)
      }
      model = ModelData.decodeOld(data)
    }
    
    // Debug: Log first decoded model's details
    if (ModelData.formatCounts.new + ModelData.formatCounts.old + ModelData.formatCounts.legacy <= 3) {
      console.log(`[ModelData] Decoded ${format} model: ${model.vertexCount} verts, ${model.faceCount} faces`)
      if (model.vertexCount > 0) {
        const bounds = model.getBounds()
        console.log(`  Vertex bounds: X[${bounds.minX}, ${bounds.maxX}] Y[${bounds.minY}, ${bounds.maxY}] Z[${bounds.minZ}, ${bounds.maxZ}]`)
        console.log(`  Sample vertex 0: (${model.vertexX[0]}, ${model.vertexY[0]}, ${model.vertexZ[0]})`)
      }
      if (model.faceCount > 0) {
        console.log(`  Sample face 0: indices=(${model.faceVertexA[0]}, ${model.faceVertexB[0]}, ${model.faceVertexC[0]}), color=${model.faceColors[0]}`)
        // Check for invalid indices
        const maxIdx = model.vertexCount - 1
        let invalidCount = 0
        for (let i = 0; i < model.faceCount; i++) {
          if (model.faceVertexA[i] > maxIdx || model.faceVertexB[i] > maxIdx || model.faceVertexC[i] > maxIdx) {
            invalidCount++
          }
        }
        if (invalidCount > 0) {
          console.log(`  WARNING: ${invalidCount} faces have invalid vertex indices!`)
        }
      }
    }
    
    return model
  }

  static printFormatStats(): void {
    if (!ModelData.logged && (ModelData.formatCounts.new > 0 || ModelData.formatCounts.old > 0 || ModelData.formatCounts.legacy > 0)) {
      console.log(`  ModelData format stats: ${ModelData.formatCounts.new} new, ${ModelData.formatCounts.old} old, ${ModelData.formatCounts.legacy} legacy`)
      ModelData.logged = true
    }
  }

  // Debug counter
  private static debugDecodeCount = 0

  /**
   * Decode V3 model format (newest OSRS).
   * Has texture support and variable-length encoding.
   */
  private static decodeV3(data: Int8Array): ModelData {
    const buf1 = new ByteBuffer(data)
    const buf2 = new ByteBuffer(data)
    const buf3 = new ByteBuffer(data)
    const buf4 = new ByteBuffer(data)
    const buf5 = new ByteBuffer(data)
    const buf6 = new ByteBuffer(data)
    const buf7 = new ByteBuffer(data)
    
    const shouldDebug = ModelData.debugDecodeCount < 2
    if (shouldDebug) {
      ModelData.debugDecodeCount++
      console.log(`[V3 Decode] Data length: ${data.length}, last 4 bytes: [${data[data.length-4]}, ${data[data.length-3]}, ${data[data.length-2]}, ${data[data.length-1]}]`)
    }

    // Read header from end of file
    // Debug: print last 30 bytes to find the real header
    if (shouldDebug) {
      const last30: number[] = []
      for (let i = Math.max(0, data.length - 30); i < data.length; i++) {
        last30.push(data[i] & 0xFF)
      }
      console.log(`[V3 Decode] Last 30 bytes: [${last30.join(', ')}]`)
    }
    
    // V3 format header is typically 26 bytes from end, but can vary
    // Try to find valid header by looking for reasonable vertex/face counts
    let headerPos = data.length - 26
    let vertexCount = 0
    let faceCount = 0
    
    // Try different positions to find valid header
    for (let offset = 26; offset <= 30; offset++) {
      try {
        buf1.pos = data.length - offset
        const testVertexCount = buf1.readUShort()
        const testFaceCount = buf1.readUShort()
        
        // Sanity check: reasonable model sizes
        if (testVertexCount > 0 && testVertexCount < 5000 && 
            testFaceCount > 0 && testFaceCount < 10000) {
          headerPos = data.length - offset
          vertexCount = testVertexCount
          faceCount = testFaceCount
          if (shouldDebug) {
            console.log(`[V3 Decode] Found header at offset ${offset}: verts=${vertexCount}, faces=${faceCount}`)
          }
          break
        }
      } catch (e) {
        // Continue trying
      }
    }
    
    // If we didn't find a valid header, fall back to V1 format
    if (vertexCount === 0 || faceCount === 0) {
      console.log(`[V3 Decode] No valid header found, falling back to V1 format`)
      return ModelData.decodeV1(data)
    }
    
    // Reset buffer and read full header
    buf1.pos = headerPos
    vertexCount = buf1.readUShort()
    faceCount = buf1.readUShort()
    const texturedFaceCount = buf1.readUByte()

    const hasFaceTypes = buf1.readUByte()
    const facePriorityType = buf1.readUByte()
    const hasFaceAlpha = buf1.readUByte()
    const hasFaceSkins = buf1.readUByte()
    const hasVertexSkins = buf1.readUByte()
    const vertexXDataLen = buf1.readUShort()
    const vertexYDataLen = buf1.readUShort()
    const vertexZDataLen = buf1.readUShort()
    const faceIndicesLen = buf1.readUShort()
    const textureCoordLen = buf1.readUShort()
    const vertexSkinsOffset = buf1.readUShort()

    const model = new ModelData()
    model.vertexCount = vertexCount
    model.faceCount = faceCount
    model.texturedFaceCount = texturedFaceCount

    // Calculate offsets
    let offset = 0
    const vertexFlagsOffset = offset
    offset += vertexCount

    const faceTypesOffset = offset
    offset += faceCount

    const facePrioritiesOffset = offset
    if (facePriorityType === 255) {
      offset += faceCount
    }

    const faceSkinsOffset = offset
    if (hasFaceSkins === 1) {
      offset += faceCount
    }

    const faceIndicesOffset = offset
    offset += faceCount

    const vertexSkinsDataOffset = offset
    if (hasVertexSkins === 1) {
      offset += vertexCount
    }

    const faceAlphasOffset = offset
    if (hasFaceAlpha === 1) {
      offset += faceCount
    }

    const faceIndicesDataOffset = offset
    offset += faceIndicesLen

    const faceMaterialsOffset = offset
    if (hasFaceTypes === 1) {
      offset += faceCount * 2
    }

    const textureCoordDataOffset = offset
    offset += textureCoordLen

    const faceColorsOffset = offset
    offset += faceCount * 2

    const vertexXOffset = offset
    offset += vertexXDataLen

    const vertexYOffset = offset
    offset += vertexYDataLen

    const vertexZOffset = offset
    offset += vertexZDataLen

    const texturedFaceOffset = offset

    // Allocate arrays
    model.vertexX = new Int32Array(vertexCount)
    model.vertexY = new Int32Array(vertexCount)
    model.vertexZ = new Int32Array(vertexCount)

    model.faceVertexA = new Uint16Array(faceCount)
    model.faceVertexB = new Uint16Array(faceCount)
    model.faceVertexC = new Uint16Array(faceCount)
    model.faceColors = new Int16Array(faceCount)

    if (hasFaceTypes === 1) {
      model.faceRenderTypes = new Int8Array(faceCount)
    }
    if (facePriorityType === 255) {
      model.facePriorities = new Int8Array(faceCount)
    } else {
      model.priority = facePriorityType
    }
    if (hasFaceAlpha === 1) {
      model.faceAlphas = new Int8Array(faceCount)
    }

    model.texturedFaceVertexA = new Uint16Array(texturedFaceCount)
    model.texturedFaceVertexB = new Uint16Array(texturedFaceCount)
    model.texturedFaceVertexC = new Uint16Array(texturedFaceCount)

    if (texturedFaceCount > 0 && hasFaceTypes === 1) {
      model.textureCoordinates = new Int8Array(faceCount)
      model.faceTextures = new Int16Array(faceCount)
    }

    // Read vertex data
    buf1.pos = vertexFlagsOffset
    buf2.pos = vertexXOffset
    buf3.pos = vertexYOffset
    buf4.pos = vertexZOffset

    if (shouldDebug) {
      console.log(`[V3 Decode] Vertex offsets: flags=${vertexFlagsOffset}, X=${vertexXOffset}, Y=${vertexYOffset}, Z=${vertexZOffset}`)
      console.log(`[V3 Decode] Header: verts=${vertexCount}, faces=${faceCount}, texFaces=${texturedFaceCount}, hasFaceTypes=${hasFaceTypes}`)
    }

    let x = 0, y = 0, z = 0
    for (let i = 0; i < vertexCount; i++) {
      const flags = buf1.readUByte()
      let dx = 0, dy = 0, dz = 0

      if ((flags & 1) !== 0) {
        dx = buf2.readSmart2()
      }
      if ((flags & 2) !== 0) {
        dy = buf3.readSmart2()
      }
      if ((flags & 4) !== 0) {
        dz = buf4.readSmart2()
      }

      x += dx
      y += dy
      z += dz

      model.vertexX[i] = x
      model.vertexY[i] = y
      model.vertexZ[i] = z
      
      if (shouldDebug && i < 5) {
        console.log(`[V3 Decode] Vertex ${i}: flags=${flags}, delta=(${dx},${dy},${dz}) -> pos=(${x},${y},${z})`)
      }
      
      // Sanity check for extreme values
      if (Math.abs(x) > 32768 || Math.abs(y) > 32768 || Math.abs(z) > 32768) {
        console.warn(`[V3 Decode] WARNING: Extreme vertex position at index ${i}: (${x}, ${y}, ${z})`)
      }
    }

    // Read face colors
    buf1.pos = faceColorsOffset
    for (let i = 0; i < faceCount; i++) {
      model.faceColors[i] = buf1.readShort()
    }

    // Read face types (if present)
    if (hasFaceTypes === 1) {
      buf1.pos = faceTypesOffset
      buf2.pos = faceMaterialsOffset
      for (let i = 0; i < faceCount; i++) {
        model.faceRenderTypes![i] = buf1.readByte()

        if (model.faceRenderTypes![i] === 2) {
          model.faceTextures![i] = buf2.readShort() - 1
          model.textureCoordinates![i] = -1
        } else {
          model.faceTextures![i] = -1
        }
      }
    }

    // Read face priorities
    if (facePriorityType === 255) {
      buf1.pos = facePrioritiesOffset
      for (let i = 0; i < faceCount; i++) {
        model.facePriorities![i] = buf1.readByte()
      }
    }

    // Read face alphas
    if (hasFaceAlpha === 1) {
      buf1.pos = faceAlphasOffset
      for (let i = 0; i < faceCount; i++) {
        model.faceAlphas![i] = buf1.readByte()
      }
    }

    // Read face indices
    buf1.pos = faceIndicesOffset
    buf2.pos = faceIndicesDataOffset

    if (shouldDebug) {
      console.log(`[V3 Decode] Face offsets: types=${faceIndicesOffset}, data=${faceIndicesDataOffset}`)
    }

    let va = 0, vb = 0, vc = 0
    let acc = 0

    for (let i = 0; i < faceCount; i++) {
      const type = buf1.readUByte()

      if (type === 1) {
        va = buf2.readSmart() + acc
        acc = va
        vb = buf2.readSmart() + acc
        acc = vb
        vc = buf2.readSmart() + acc
        acc = vc
      } else if (type === 2) {
        vb = vc
        vc = buf2.readSmart() + acc
        acc = vc
      } else if (type === 3) {
        va = vc
        vc = buf2.readSmart() + acc
        acc = vc
      } else if (type === 4) {
        const temp = va
        va = vb
        vb = temp
        vc = buf2.readSmart() + acc
        acc = vc
      }

      model.faceVertexA[i] = va
      model.faceVertexB[i] = vb
      model.faceVertexC[i] = vc
      
      if (shouldDebug && i < 5) {
        console.log(`[V3 Decode] Face ${i}: type=${type}, indices=(${va},${vb},${vc}), valid=${va < vertexCount && vb < vertexCount && vc < vertexCount}`)
      }
    }
    
    // Check for invalid face indices
    let invalidFaceCount = 0
    for (let i = 0; i < faceCount; i++) {
      if (model.faceVertexA[i] >= vertexCount || model.faceVertexB[i] >= vertexCount || model.faceVertexC[i] >= vertexCount) {
        invalidFaceCount++
      }
    }
    if (shouldDebug && invalidFaceCount > 0) {
      console.log(`[V3 Decode] WARNING: ${invalidFaceCount}/${faceCount} faces have invalid vertex indices!`)
    }

    // Read textured face triangle indices
    buf1.pos = texturedFaceOffset
    for (let i = 0; i < texturedFaceCount; i++) {
      model.texturedFaceVertexA[i] = buf1.readUShort()
      model.texturedFaceVertexB[i] = buf1.readUShort()
      model.texturedFaceVertexC[i] = buf1.readUShort()
    }

    // Assign texture coordinates
    if (model.textureCoordinates) {
      buf1.pos = textureCoordDataOffset
      for (let i = 0; i < faceCount; i++) {
        if (model.faceTextures![i] !== -1) {
          model.textureCoordinates[i] = (buf1.readUByte() - 1) & 0xFF
        }
      }
    }
    
    // Check if all vertices are at origin - indicates bad decode
    let allZero = true
    for (let i = 0; i < vertexCount && allZero; i++) {
      if (model.vertexX[i] !== 0 || model.vertexY[i] !== 0 || model.vertexZ[i] !== 0) {
        allZero = false
      }
    }
    
    if (allZero && vertexCount > 0) {
      console.log(`[V3 Decode] All vertices at origin, trying V1 format instead`)
      return ModelData.decodeV1(data)
    }

    return model
  }

  /**
   * Decode V1 model format (original OSRS/RS2).
   */
  private static decodeV1(data: Int8Array): ModelData {
    const buf1 = new ByteBuffer(data)
    const buf2 = new ByteBuffer(data)
    const buf3 = new ByteBuffer(data)
    const buf4 = new ByteBuffer(data)
    const buf5 = new ByteBuffer(data)

    // Read header
    buf1.pos = data.length - 18
    const vertexCount = buf1.readUShort()
    const faceCount = buf1.readUShort()
    const texturedFaceCount = buf1.readUByte()

    const hasFaceTypes = buf1.readUByte() === 1
    const facePriorityType = buf1.readUByte()
    const hasFaceAlpha = buf1.readUByte() === 1
    const hasFaceSkins = buf1.readUByte() === 1
    const hasVertexSkins = buf1.readUByte() === 1

    const vertexXLen = buf1.readUShort()
    const vertexYLen = buf1.readUShort()
    const vertexZLen = buf1.readUShort()
    const faceIndicesLen = buf1.readUShort()

    const model = new ModelData()
    model.vertexCount = vertexCount
    model.faceCount = faceCount
    model.texturedFaceCount = texturedFaceCount

    // Calculate offsets
    let offset = 0
    const vertexDirOffset = offset
    offset += vertexCount

    const faceTypesOffset = offset
    if (hasFaceTypes) {
      offset += faceCount
    }

    const faceCompOffset = offset
    offset += faceCount

    const facePrioritiesOffset = offset
    if (facePriorityType === 255) {
      offset += faceCount
    }

    const faceSkinsOffset = offset
    if (hasFaceSkins) {
      offset += faceCount
    }

    const vertexSkinsOffset = offset
    if (hasVertexSkins) {
      offset += vertexCount
    }

    const faceAlphasOffset = offset
    if (hasFaceAlpha) {
      offset += faceCount
    }

    const faceIndicesOffset = offset
    offset += faceIndicesLen

    const faceColorsOffset = offset
    offset += faceCount * 2

    const vertexXOffset = offset
    offset += vertexXLen

    const vertexYOffset = offset
    offset += vertexYLen

    const vertexZOffset = offset
    offset += vertexZLen

    const texturedFaceOffset = offset

    // Allocate arrays
    model.vertexX = new Int32Array(vertexCount)
    model.vertexY = new Int32Array(vertexCount)
    model.vertexZ = new Int32Array(vertexCount)

    model.faceVertexA = new Uint16Array(faceCount)
    model.faceVertexB = new Uint16Array(faceCount)
    model.faceVertexC = new Uint16Array(faceCount)
    model.faceColors = new Int16Array(faceCount)

    if (hasFaceTypes) {
      model.faceRenderTypes = new Int8Array(faceCount)
    }
    if (facePriorityType === 255) {
      model.facePriorities = new Int8Array(faceCount)
    } else {
      model.priority = facePriorityType
    }
    if (hasFaceAlpha) {
      model.faceAlphas = new Int8Array(faceCount)
    }

    model.texturedFaceVertexA = new Uint16Array(texturedFaceCount)
    model.texturedFaceVertexB = new Uint16Array(texturedFaceCount)
    model.texturedFaceVertexC = new Uint16Array(texturedFaceCount)

    // Read vertex data
    buf1.pos = vertexDirOffset
    buf2.pos = vertexXOffset
    buf3.pos = vertexYOffset
    buf4.pos = vertexZOffset

    let x = 0, y = 0, z = 0
    for (let i = 0; i < vertexCount; i++) {
      const flags = buf1.readUByte()
      let dx = 0, dy = 0, dz = 0

      if ((flags & 1) !== 0) {
        dx = buf2.readSmart()
      }
      if ((flags & 2) !== 0) {
        dy = buf3.readSmart()
      }
      if ((flags & 4) !== 0) {
        dz = buf4.readSmart()
      }

      x += dx
      y += dy
      z += dz

      model.vertexX[i] = x
      model.vertexY[i] = y
      model.vertexZ[i] = z
    }

    // Read face colors
    buf1.pos = faceColorsOffset
    for (let i = 0; i < faceCount; i++) {
      model.faceColors[i] = buf1.readShort()
    }

    // Read face types
    if (hasFaceTypes) {
      buf1.pos = faceTypesOffset
      for (let i = 0; i < faceCount; i++) {
        model.faceRenderTypes![i] = buf1.readByte()
      }
    }

    // Read face priorities
    if (facePriorityType === 255) {
      buf1.pos = facePrioritiesOffset
      for (let i = 0; i < faceCount; i++) {
        model.facePriorities![i] = buf1.readByte()
      }
    }

    // Read face alphas
    if (hasFaceAlpha) {
      buf1.pos = faceAlphasOffset
      for (let i = 0; i < faceCount; i++) {
        model.faceAlphas![i] = buf1.readByte()
      }
    }

    // Read face indices
    buf1.pos = faceCompOffset
    buf2.pos = faceIndicesOffset

    let va = 0, vb = 0, vc = 0
    let acc = 0

    for (let i = 0; i < faceCount; i++) {
      const type = buf1.readUByte()

      if (type === 1) {
        va = buf2.readSmart() + acc
        acc = va
        vb = buf2.readSmart() + acc
        acc = vb
        vc = buf2.readSmart() + acc
        acc = vc
      } else if (type === 2) {
        vb = vc
        vc = buf2.readSmart() + acc
        acc = vc
      } else if (type === 3) {
        va = vc
        vc = buf2.readSmart() + acc
        acc = vc
      } else if (type === 4) {
        const temp = va
        va = vb
        vb = temp
        vc = buf2.readSmart() + acc
        acc = vc
      }

      model.faceVertexA[i] = va
      model.faceVertexB[i] = vb
      model.faceVertexC[i] = vc
    }

    // Read textured faces
    buf1.pos = texturedFaceOffset
    for (let i = 0; i < texturedFaceCount; i++) {
      model.texturedFaceVertexA[i] = buf1.readUShort()
      model.texturedFaceVertexB[i] = buf1.readUShort()
      model.texturedFaceVertexC[i] = buf1.readUShort()
    }

    return model
  }

  /**
   * Decode V2 model format.
   * Header is 23 bytes from end.
   */
  private static decodeV2(data: Int8Array): ModelData {
    const buf1 = new ByteBuffer(data)
    const buf2 = new ByteBuffer(data)
    const buf3 = new ByteBuffer(data)
    const buf4 = new ByteBuffer(data)
    const buf5 = new ByteBuffer(data)

    // Read header from end of file (23 bytes from end)
    buf1.pos = data.length - 23
    const vertexCount = buf1.readUShort()
    const faceCount = buf1.readUShort()
    const texturedFaceCount = buf1.readUByte()

    const hasFaceTypes = buf1.readUByte() === 1
    const facePriorityType = buf1.readUByte()
    const hasFaceAlpha = buf1.readUByte() === 1
    const hasFaceSkins = buf1.readUByte() === 1
    const hasVertexSkins = buf1.readUByte() === 1
    const hasMayaGroups = buf1.readUByte() === 1

    const vertexXLen = buf1.readUShort()
    const vertexYLen = buf1.readUShort()
    const vertexZLen = buf1.readUShort()
    const faceIndicesLen = buf1.readUShort()
    const textureIndicesLen = buf1.readUShort()

    const model = new ModelData()
    model.vertexCount = vertexCount
    model.faceCount = faceCount
    model.texturedFaceCount = texturedFaceCount

    // Calculate offsets
    let offset = 0
    const vertexFlagsOffset = offset
    offset += vertexCount

    const faceCompOffset = offset
    offset += faceCount

    const facePrioritiesOffset = offset
    if (facePriorityType === 255) {
      offset += faceCount
    }

    const faceSkinsOffset = offset
    if (hasFaceSkins) {
      offset += faceCount
    }

    const faceTypesOffset = offset
    if (hasFaceTypes) {
      offset += faceCount
    }

    const vertexSkinsOffset = offset
    if (hasVertexSkins) {
      offset += vertexCount
    }

    const faceAlphasOffset = offset
    if (hasFaceAlpha) {
      offset += faceCount
    }

    const faceIndicesOffset = offset
    offset += faceIndicesLen

    const faceColorsOffset = offset
    offset += faceCount * 2

    const vertexXOffset = offset
    offset += vertexXLen

    const vertexYOffset = offset
    offset += vertexYLen

    const vertexZOffset = offset
    offset += vertexZLen

    const texturedFaceOffset = offset

    // Allocate arrays
    model.vertexX = new Int32Array(vertexCount)
    model.vertexY = new Int32Array(vertexCount)
    model.vertexZ = new Int32Array(vertexCount)

    model.faceVertexA = new Uint16Array(faceCount)
    model.faceVertexB = new Uint16Array(faceCount)
    model.faceVertexC = new Uint16Array(faceCount)
    model.faceColors = new Int16Array(faceCount)

    if (hasFaceTypes) {
      model.faceRenderTypes = new Int8Array(faceCount)
      model.faceTextures = new Int16Array(faceCount)
      model.textureCoordinates = new Int8Array(faceCount)
    }
    if (facePriorityType === 255) {
      model.facePriorities = new Int8Array(faceCount)
    } else {
      model.priority = facePriorityType
    }
    if (hasFaceAlpha) {
      model.faceAlphas = new Int8Array(faceCount)
    }

    model.texturedFaceVertexA = new Uint16Array(texturedFaceCount)
    model.texturedFaceVertexB = new Uint16Array(texturedFaceCount)
    model.texturedFaceVertexC = new Uint16Array(texturedFaceCount)

    // Read vertex data
    buf1.pos = vertexFlagsOffset
    buf2.pos = vertexXOffset
    buf3.pos = vertexYOffset
    buf4.pos = vertexZOffset
    buf5.pos = vertexSkinsOffset

    let x = 0, y = 0, z = 0
    for (let i = 0; i < vertexCount; i++) {
      const flags = buf1.readUByte()
      let dx = 0, dy = 0, dz = 0

      if ((flags & 1) !== 0) {
        dx = buf2.readSmart2()
      }
      if ((flags & 2) !== 0) {
        dy = buf3.readSmart2()
      }
      if ((flags & 4) !== 0) {
        dz = buf4.readSmart2()
      }

      x += dx
      y += dy
      z += dz

      model.vertexX[i] = x
      model.vertexY[i] = y
      model.vertexZ[i] = z
    }

    // Read face colors
    buf1.pos = faceColorsOffset
    for (let i = 0; i < faceCount; i++) {
      model.faceColors[i] = buf1.readUShort()
    }

    // Read face types and textures
    if (hasFaceTypes) {
      buf1.pos = faceTypesOffset
      for (let i = 0; i < faceCount; i++) {
        const type = buf1.readUByte()
        if ((type & 1) === 1) {
          model.faceRenderTypes![i] = 1
        } else {
          model.faceRenderTypes![i] = 0
        }

        if ((type & 2) === 2) {
          model.textureCoordinates![i] = (type >> 2) & 0xFF
          model.faceTextures![i] = model.faceColors[i]
          model.faceColors[i] = 127
        } else {
          model.textureCoordinates![i] = -1
          model.faceTextures![i] = -1
        }
      }
    }

    // Read face priorities
    if (facePriorityType === 255) {
      buf1.pos = facePrioritiesOffset
      for (let i = 0; i < faceCount; i++) {
        model.facePriorities![i] = buf1.readByte()
      }
    }

    // Read face alphas
    if (hasFaceAlpha) {
      buf1.pos = faceAlphasOffset
      for (let i = 0; i < faceCount; i++) {
        model.faceAlphas![i] = buf1.readByte()
      }
    }

    // Read face indices
    buf1.pos = faceIndicesOffset
    buf2.pos = faceCompOffset

    let va = 0, vb = 0, vc = 0
    let acc = 0

    for (let i = 0; i < faceCount; i++) {
      const type = buf2.readUByte()

      if (type === 1) {
        va = buf1.readSmart2() + acc
        acc = va
        vb = buf1.readSmart2() + acc
        acc = vb
        vc = buf1.readSmart2() + acc
        acc = vc
      } else if (type === 2) {
        vb = vc
        vc = buf1.readSmart2() + acc
        acc = vc
      } else if (type === 3) {
        va = vc
        vc = buf1.readSmart2() + acc
        acc = vc
      } else if (type === 4) {
        const temp = va
        va = vb
        vb = temp
        vc = buf1.readSmart2() + acc
        acc = vc
      }

      model.faceVertexA[i] = va
      model.faceVertexB[i] = vb
      model.faceVertexC[i] = vc
    }

    // Read textured faces
    buf1.pos = texturedFaceOffset
    for (let i = 0; i < texturedFaceCount; i++) {
      model.texturedFaceVertexA[i] = buf1.readUShort()
      model.texturedFaceVertexB[i] = buf1.readUShort()
      model.texturedFaceVertexC[i] = buf1.readUShort()
    }

    return model
  }

  /**
   * Decode very old (pre-V1) model format.
   */
  private static decodeOld(data: Int8Array): ModelData {
    // Old format has simpler structure, read from start
    const buf = new ByteBuffer(data)

    const vertexCount = buf.readUShort()
    const faceCount = buf.readUShort()

    const model = new ModelData()
    model.vertexCount = vertexCount
    model.faceCount = faceCount

    // Allocate arrays
    model.vertexX = new Int32Array(vertexCount)
    model.vertexY = new Int32Array(vertexCount)
    model.vertexZ = new Int32Array(vertexCount)
    model.faceVertexA = new Uint16Array(faceCount)
    model.faceVertexB = new Uint16Array(faceCount)
    model.faceVertexC = new Uint16Array(faceCount)
    model.faceColors = new Int16Array(faceCount)

    // Read vertices directly (no delta encoding in old format)
    for (let i = 0; i < vertexCount; i++) {
      model.vertexX[i] = buf.readShort()
      model.vertexY[i] = buf.readShort()
      model.vertexZ[i] = buf.readShort()
    }

    // Read faces
    for (let i = 0; i < faceCount; i++) {
      model.faceVertexA[i] = buf.readUShort()
      model.faceVertexB[i] = buf.readUShort()
      model.faceVertexC[i] = buf.readUShort()
      model.faceColors[i] = buf.readShort()
    }

    return model
  }

  /**
   * Get bounding box of the model.
   */
  getBounds(): { minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number } {
    let minX = 0, maxX = 0, minY = 0, maxY = 0, minZ = 0, maxZ = 0

    for (let i = 0; i < this.vertexCount; i++) {
      minX = Math.min(minX, this.vertexX[i])
      maxX = Math.max(maxX, this.vertexX[i])
      minY = Math.min(minY, this.vertexY[i])
      maxY = Math.max(maxY, this.vertexY[i])
      minZ = Math.min(minZ, this.vertexZ[i])
      maxZ = Math.max(maxZ, this.vertexZ[i])
    }

    return { minX, maxX, minY, maxY, minZ, maxZ }
  }
}
