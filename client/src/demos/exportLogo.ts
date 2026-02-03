// Export Future Buddy logo in multiple sizes with and without text

const SIZES = [4096, 1024, 512, 256, 128];

async function loadLogo(): Promise<HTMLImageElement> {
  const logo = new Image();
  logo.src = '/assets/logo.png';
  await new Promise<void>((resolve, reject) => {
    logo.onload = () => resolve();
    logo.onerror = reject;
  });
  return logo;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportLogoOnly(logo: HTMLImageElement, size: number): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(logo, 0, 0, size, size);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `logo-${size}.png`);
      resolve();
    }, 'image/png');
  });
}

async function exportLogoWithText(logo: HTMLImageElement, size: number): Promise<void> {
  const scale = size / 67;
  const padding = 60 * scale;
  const canvasSize = size + padding * 2;

  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvasSize, canvasSize);

  const centerX = canvasSize / 2;
  const centerY = canvasSize / 2;

  // Draw logo
  ctx.drawImage(logo, centerX - size / 2, centerY - size / 2, size, size);

  // Text settings
  const fontSize = Math.round(size * 0.19);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${fontSize}px Bungee, sans-serif`;

  // FUTURE - above, shifted left, -6deg
  ctx.save();
  ctx.translate(centerX - 10 * scale, centerY - 18 * scale);
  ctx.rotate(-6 * Math.PI / 180);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2 * scale;
  ctx.strokeText('FUTURE', 0, 0);
  ctx.fillStyle = '#71FF00';
  ctx.fillText('FUTURE', 0, 0);
  ctx.restore();

  // BUDDY - below, shifted right, +6deg
  ctx.save();
  ctx.translate(centerX + 10 * scale, centerY + 18 * scale);
  ctx.rotate(6 * Math.PI / 180);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2 * scale;
  ctx.strokeText('BUDDY', 0, 0);
  ctx.fillStyle = '#71FF00';
  ctx.fillText('BUDDY', 0, 0);
  ctx.restore();

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `logo-with-text-${size}.png`);
      resolve();
    }, 'image/png');
  });
}

export async function exportAllLogos(): Promise<void> {
  console.log('Exporting all logo sizes...');
  const logo = await loadLogo();

  for (const size of SIZES) {
    await exportLogoOnly(logo, size);
    await exportLogoWithText(logo, size);
    console.log(`Exported ${size}px versions`);
  }

  console.log('All exports complete!');
  alert('All logo sizes exported to Downloads!');
}

// Legacy single export
export async function exportLogoComposition(): Promise<void> {
  await exportAllLogos();
}

// Auto-run if loaded with ?export-logo parameter
if (typeof window !== 'undefined' && window.location.search.includes('export-logo')) {
  document.fonts.ready.then(() => exportAllLogos());
}
