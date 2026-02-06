import { useEffect, useRef, useState } from 'react'
import { MapViewer } from './mapviewer/MapViewer.ts'
import { CacheSelector } from './ui/CacheSelector.tsx'
import { Minimap } from './ui/Minimap.tsx'

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewerRef = useRef<MapViewer | null>(null)
  const [status, setStatus] = useState('Select a cache to begin')
  const [loading, setLoading] = useState(false)
  const [fps, setFps] = useState(0)
  const [cameraPos, setCameraPos] = useState({ x: 0, z: 0, yaw: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const viewer = new MapViewer(canvas)
    viewerRef.current = viewer

    // Track FPS
    viewer.onFpsUpdate = setFps

    // Track camera position for minimap (poll every frame would be expensive)
    const posInterval = setInterval(() => {
      if (viewer) {
        const pos = viewer.getCameraPosition()
        setCameraPos({ x: pos.x, z: pos.z, yaw: pos.yaw })
      }
    }, 100) // 10 updates per second is enough for minimap

    viewer.start()

    return () => {
      clearInterval(posInterval)
      viewer.dispose()
    }
  }, [])

  const handleCacheSelect = async (scope: string, id: number) => {
    const viewer = viewerRef.current
    if (!viewer) return

    setLoading(true)
    setStatus('Downloading cache...')

    try {
      await viewer.loadCache(scope, id, (receivedMB, totalMB) => {
        if (totalMB > 0) {
          setStatus(`Downloading... ${receivedMB.toFixed(1)} / ${totalMB.toFixed(0)} MB`)
        } else {
          setStatus(`Downloading... ${receivedMB.toFixed(1)} MB`)
        }
      })
      setStatus('Cache loaded')
    } catch (e) {
      setStatus(`Error: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />

      {/* Top-left: Minimap + FPS (like osrs.world) */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        zIndex: 10,
      }}>
        <Minimap
          cameraX={cameraPos.x}
          cameraZ={cameraPos.z}
          cameraYaw={cameraPos.yaw}
          size={152}
        />
        <div style={{
          color: '#fff',
          fontSize: 14,
          fontFamily: 'monospace',
          textShadow: '1px 1px 2px #000',
        }}>
          {fps}
        </div>
      </div>

      {/* Top-right: Controls (like osrs.world) */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
        zIndex: 10,
      }}>
        {/* Minimal control buttons */}
        <div style={{
          display: 'flex',
          gap: 4,
          background: 'rgba(40, 40, 40, 0.8)',
          padding: '4px 8px',
          borderRadius: 4,
        }}>
          <button style={iconButtonStyle} title="Play/Pause">▶</button>
          <button style={iconButtonStyle} title="Settings">⋮</button>
        </div>

        {/* Cache selector (collapsible style) */}
        <div style={{
          background: 'rgba(40, 40, 40, 0.9)',
          borderRadius: 4,
          padding: 8,
          minWidth: 220,
        }}>
          <CacheSelector onSelect={handleCacheSelect} disabled={loading} />
          {status && (
            <div style={{
              color: '#aaa',
              fontSize: 11,
              marginTop: 6,
              fontFamily: 'monospace',
            }}>
              {status}
            </div>
          )}
        </div>
      </div>

      {/* Bottom-left: Controls hint */}
      <div style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11,
        fontFamily: 'monospace',
        zIndex: 10,
      }}>
        WASD move · Space/C up/down · Drag rotate · Scroll zoom
      </div>
    </div>
  )
}

const iconButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#888',
  fontSize: 16,
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: 2,
}
