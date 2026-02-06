import { useEffect, useRef } from 'react'

interface MinimapProps {
  cameraX: number
  cameraZ: number
  cameraYaw: number
  size?: number
}

export function Minimap({ cameraX, cameraZ, cameraYaw, size = 152 }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scale = window.devicePixelRatio || 1
    canvas.width = size * scale
    canvas.height = size * scale
    ctx.scale(scale, scale)

    // Clear with dark green (ocean/land base)
    ctx.fillStyle = '#1a3d1a'
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
    ctx.fill()

    // Draw simple world representation
    // Map tile coords to minimap: each tile is roughly 1 unit
    // World is roughly 0-12800 tiles wide
    // Minimap shows ~200 tile radius around player

    const viewRadius = 200 // tiles visible on minimap
    const centerX = cameraX
    const centerZ = cameraZ

    // Draw some basic terrain colors based on rough regions
    // Green for land
    ctx.fillStyle = '#2d5a2d'
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2)
    ctx.fill()

    // Draw grid lines for map squares (every 64 tiles)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.lineWidth = 0.5

    const gridSpacing = 64 // RS map square size
    const pixelsPerTile = (size / 2 - 4) / viewRadius

    // Calculate grid lines relative to camera
    const startGridX = Math.floor((centerX - viewRadius) / gridSpacing) * gridSpacing
    const startGridZ = Math.floor((centerZ - viewRadius) / gridSpacing) * gridSpacing

    for (let gx = startGridX; gx <= centerX + viewRadius; gx += gridSpacing) {
      const screenX = size / 2 + (gx - centerX) * pixelsPerTile
      ctx.beginPath()
      ctx.moveTo(screenX, 0)
      ctx.lineTo(screenX, size)
      ctx.stroke()
    }

    for (let gz = startGridZ; gz <= centerZ + viewRadius; gz += gridSpacing) {
      const screenY = size / 2 - (gz - centerZ) * pixelsPerTile
      ctx.beginPath()
      ctx.moveTo(0, screenY)
      ctx.lineTo(size, screenY)
      ctx.stroke()
    }

    // Draw player position indicator (arrow pointing in look direction)
    const arrowSize = 8
    ctx.save()
    ctx.translate(size / 2, size / 2)
    ctx.rotate(-cameraYaw) // Rotate arrow based on camera yaw

    // Red arrow (like OSRS)
    ctx.fillStyle = '#ff0000'
    ctx.beginPath()
    ctx.moveTo(0, -arrowSize)
    ctx.lineTo(-arrowSize / 2, arrowSize / 2)
    ctx.lineTo(arrowSize / 2, arrowSize / 2)
    ctx.closePath()
    ctx.fill()

    // White border
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.restore()

    // Circular border
    ctx.strokeStyle = '#3a3a3a'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
    ctx.stroke()

    // Inner gold border
    ctx.strokeStyle = '#8b7355'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2)
    ctx.stroke()

  }, [cameraX, cameraZ, cameraYaw, size])

  return (
    <div style={{
      position: 'relative',
      width: size,
      height: size,
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
        }}
      />
      {/* Compass orb in bottom-left like OSRS */}
      <div style={{
        position: 'absolute',
        bottom: 8,
        left: 8,
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #4a7c59 0%, #2d5a2d 100%)',
        border: '2px solid #3a3a3a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{
          color: '#fff',
          fontSize: 10,
          fontWeight: 'bold',
          textShadow: '1px 1px 1px #000',
        }}>🌍</span>
      </div>
    </div>
  )
}
