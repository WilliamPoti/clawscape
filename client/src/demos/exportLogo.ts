// Export Future Buddy logo composition as PNG

export async function exportLogoComposition(): Promise<void> {
  // Load the original logo
  const logo = new Image();
  logo.src = '/assets/logo.png';

  await new Promise<void>((resolve, reject) => {
    logo.onload = () => resolve();
    logo.onerror = reject;
  });

  // Use original logo size as base
  const logoSize = logo.naturalWidth;
  const scale = logoSize / 67; // Scale factor from demo size (67px) to original

  // Canvas size with padding for text
  const padding = 60 * scale;
  const canvasWidth = logoSize + padding * 2;
  const canvasHeight = logoSize + padding * 2;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;

  // Transparent background
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Center point
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  // Draw logo with glow
  ctx.shadowColor = 'rgba(0, 240, 255, 0.6)';
  ctx.shadowBlur = 20 * scale;
  ctx.drawImage(logo, centerX - logoSize / 2, centerY - logoSize / 2, logoSize, logoSize);
  ctx.shadowBlur = 0;

  // Scale text size proportionally (13px at 67px logo = ~19% of logo size)
  const fontSize = Math.round(logoSize * 0.19);

  // FUTURE text - above logo, shifted left, -6deg slant
  const futureOffsetX = -10 * scale;
  const futureOffsetY = -18 * scale;
  const futureX = centerX + futureOffsetX;
  const futureY = centerY + futureOffsetY;

  ctx.save();
  ctx.translate(futureX, futureY);
  ctx.rotate(-6 * Math.PI / 180);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${fontSize}px Bungee, sans-serif`;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2 * scale;
  ctx.strokeText('FUTURE', 0, 0);
  ctx.shadowColor = 'rgba(113, 255, 0, 0.8)';
  ctx.shadowBlur = 10 * scale;
  ctx.fillStyle = '#71FF00';
  ctx.fillText('FUTURE', 0, 0);
  ctx.shadowBlur = 0;
  ctx.restore();

  // BUDDY text - below logo, shifted right, +6deg slant
  const buddyOffsetX = 10 * scale;
  const buddyOffsetY = 18 * scale;
  const buddyX = centerX + buddyOffsetX;
  const buddyY = centerY + buddyOffsetY;

  ctx.save();
  ctx.translate(buddyX, buddyY);
  ctx.rotate(6 * Math.PI / 180);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${fontSize}px Bungee, sans-serif`;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2 * scale;
  ctx.strokeText('BUDDY', 0, 0);
  ctx.shadowColor = 'rgba(113, 255, 0, 0.8)';
  ctx.shadowBlur = 10 * scale;
  ctx.fillStyle = '#71FF00';
  ctx.fillText('BUDDY', 0, 0);
  ctx.shadowBlur = 0;
  ctx.restore();

  // Export as PNG
  canvas.toBlob(async (blob) => {
    if (!blob) return;

    // Try File System Access API for custom save location
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: 'future-buddy-logo.png',
          types: [{
            description: 'PNG Image',
            accept: { 'image/png': ['.png'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        console.log('Logo composition saved!');
        return;
      } catch (e) {
        // User cancelled or API not supported
      }
    }

    // Fallback to download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'future-buddy-logo.png';
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// Auto-run if loaded with ?export-logo parameter
if (typeof window !== 'undefined' && window.location.search.includes('export-logo')) {
  // Wait for font to load
  document.fonts.ready.then(() => {
    exportLogoComposition();
  });
}
