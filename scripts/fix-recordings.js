#!/usr/bin/env node
// @ts-check
// Re-encodes recording audio from Opus to AAC to fix VLC crackle issues
// Usage: npm run demo:fix
// Finds the latest futurebuddy recordings in Downloads and re-encodes them

const { execSync } = require('child_process');
const { readdirSync, statSync, renameSync, unlinkSync, copyFileSync } = require('fs');
const { join } = require('path');
const { homedir } = require('os');

const downloadsDir = join(homedir(), 'Downloads');
const recordingsDir = join(process.cwd(), 'recordings');

// Find all unprocessed futurebuddy recordings (skip already-fixed temp files)
const files = readdirSync(downloadsDir)
  .filter(f => f.startsWith('futurebuddy-') && f.endsWith('.mp4') && !f.includes('-fixed'))
  .map(f => ({
    name: f,
    path: join(downloadsDir, f),
    mtime: statSync(join(downloadsDir, f)).mtimeMs
  }))
  .sort((a, b) => b.mtime - a.mtime);

if (files.length === 0) {
  console.log('No futurebuddy recordings found in Downloads');
  process.exit(0);
}

// Process the latest batch (files within 30 seconds of the newest)
const latest = files[0].mtime;
const batch = files.filter(f => latest - f.mtime < 30000);

console.log(`Found ${batch.length} recording(s) to fix:\n`);

for (const file of batch) {
  const outputPath = file.path.replace('.mp4', '-fixed.mp4');
  console.log(`  Fixing: ${file.name}`);

  try {
    execSync(
      `ffmpeg -y -i "${file.path}" -c:v copy -c:a aac -b:a 192k "${outputPath}"`,
      { stdio: 'pipe' }
    );

    // Replace original with fixed version
    unlinkSync(file.path);
    renameSync(outputPath, file.path);
    console.log(`  Done: ${file.name}\n`);

    // Also copy to recordings directory if it matches a known demo
    const isHorizontal = file.name.includes('-horizontal-');
    const isShorts = file.name.includes('-shorts-');
    if (isHorizontal || isShorts) {
      const format = isHorizontal ? 'horizontal' : 'shorts';
      const destDir = join(recordingsDir, format);
      try {
        const destPath = join(destDir, file.name);
        copyFileSync(file.path, destPath);
        console.log(`  Copied to: recordings/${format}/${file.name}\n`);
      } catch (_) {
        // recordings dir might not exist, that's fine
      }
    }
  } catch (err) {
    console.error(`  Failed: ${err.message}`);
    console.error('  Make sure ffmpeg is installed and in your PATH');
  }
}

console.log('All recordings fixed!');
