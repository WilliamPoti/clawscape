export const DEGREES_TO_RADIANS = Math.PI / 180.0
export const RS_TO_RADIANS = Math.PI / 1024.0
export const TILE_SIZE = 128

export const COSINE = new Int32Array(2048)
const CIRCULAR_ANGLE = 2048
const ANGULAR_RATIO = 360.0 / CIRCULAR_ANGLE
const ANGULAR_RATIO_RADIANS = ANGULAR_RATIO * DEGREES_TO_RADIANS

for (let i = 0; i < 2048; i++) {
  COSINE[i] = (65536.0 * Math.cos(i * ANGULAR_RATIO_RADIANS)) | 0
}

export const SINE = new Int32Array(2048)
for (let i = 0; i < 2048; i++) {
  SINE[i] = (65536.0 * Math.sin(i * ANGULAR_RATIO_RADIANS)) | 0
}
