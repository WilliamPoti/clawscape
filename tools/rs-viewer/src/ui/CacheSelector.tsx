import { useEffect, useState } from 'react'

interface CacheInfo {
  id: number
  scope: string
  game: string
  environment: string
  language: string
  builds: { major: number; minor?: number }[]
  timestamp: string | null
  sources: string[]
  valid_indexes: number
  indexes: number
  valid_groups: number
  groups: number
  valid_keys: number
  keys: number
}

interface Props {
  onSelect: (scope: string, id: number) => void
  disabled: boolean
}

export function CacheSelector({ onSelect, disabled }: Props) {
  const [caches, setCaches] = useState<CacheInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCaches()
  }, [])

  async function fetchCaches() {
    try {
      const base = import.meta.env.DEV ? '/api/openrs2' : 'https://archive.openrs2.org'
      const res = await fetch(`${base}/caches.json`)
      const data: CacheInfo[] = await res.json()

      // Filter to live caches with builds, sorted by game then build number
      const filtered = data
        .filter(c =>
          (c.game === 'oldschool' || c.game === 'runescape') &&
          c.environment === 'live' &&
          c.builds.length > 0 &&
          c.valid_indexes > 0
        )
        .sort((a, b) => {
          // OSRS first, then RS2
          if (a.game !== b.game) return a.game === 'oldschool' ? -1 : 1
          const ba = a.builds[0]?.major ?? 0
          const bb = b.builds[0]?.major ?? 0
          return bb - ba
        })

      setCaches(filtered)
    } catch (e) {
      setError(`Failed to fetch caches: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={boxStyle}>
        Loading cache list...
      </div>
    )
  }

  if (error) {
    return (
      <div style={boxStyle}>
        {error}
      </div>
    )
  }

  return (
    <select
      style={{
        ...boxStyle,
        cursor: 'pointer',
        minWidth: 200,
      }}
      disabled={disabled}
      defaultValue=""
      onChange={(e) => {
        const [scope, id] = e.target.value.split('/')
        onSelect(scope, parseInt(id))
      }}
    >
      <option value="" disabled>Select a cache...</option>
      {caches.map((c) => (
        <option key={`${c.scope}/${c.id}`} value={`${c.scope}/${c.id}`}>
          [{c.game === 'oldschool' ? 'OSRS' : 'RS2'}] Build {c.builds[0]?.major}
          {c.timestamp ? ` (${new Date(c.timestamp).toLocaleDateString()})` : ''}
          {` - ${c.valid_indexes} idx, ${c.valid_keys}/${c.keys} keys`}
        </option>
      ))}
    </select>
  )
}

const boxStyle: React.CSSProperties = {
  background: 'rgba(30, 30, 30, 0.95)',
  color: '#ddd',
  padding: '6px 10px',
  borderRadius: 3,
  fontSize: 12,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  border: '1px solid #444',
  outline: 'none',
}
