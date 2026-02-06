import { ByteBuffer } from '../../io/ByteBuffer.ts'
import { Type } from '../Type.ts'

/**
 * Location type: defines properties of a map object (tree, wall, building, etc.).
 * Decoded from CONFIGS index, LOC archive (6).
 */
export class LocType extends Type {
  name = 'null'

  // Model data
  models: number[] | null = null
  types: number[] | null = null

  // Dimensions
  sizeX = 1
  sizeY = 1

  // Visual properties
  clipType = 2
  blocksProjectile = true
  isInteractive = false
  mergeNormals = false
  modelClipped = false
  clipped = true
  isRotated = false
  isHollow = false
  obstructsGround = false
  supportItems = -1

  // Model transformations
  modelSizeX = 128
  modelSizeHeight = 128
  modelSizeY = 128
  offsetX = 0
  offsetHeight = 0
  offsetY = 0

  // Animation
  seqId = -1
  seqRandomStart = false

  // Lighting
  ambient = 0
  contrast = 0

  // Decoration
  decorDisplacement = 16

  // Recoloring
  recolorFrom: number[] | null = null
  recolorTo: number[] | null = null
  retextureFrom: number[] | null = null
  retextureTo: number[] | null = null

  // Ground contouring
  contouredGround = -1
  contourGroundType = 0
  contourGroundParam = -1

  // Map display
  mapFunctionId = -1
  mapSceneId = -1

  // Transform
  transformVarbit = -1
  transformVarp = -1
  transforms: (number | null)[] | null = null

  // Actions
  actions: (string | null)[] = [null, null, null, null, null]

  // Sound
  ambientSoundId = -1
  ambientSoundDistance = 0

  protected decodeOpcode(opcode: number, buf: ByteBuffer): void {
    switch (opcode) {
      case 1: {
        const count = buf.readUByte()
        this.models = new Array(count)
        this.types = new Array(count)
        for (let i = 0; i < count; i++) {
          this.models[i] = buf.readUShort()
          this.types[i] = buf.readUByte()
        }
        break
      }
      case 2:
        this.name = buf.readString()
        break
      case 5: {
        const count = buf.readUByte()
        this.types = null
        this.models = new Array(count)
        for (let i = 0; i < count; i++) {
          this.models[i] = buf.readUShort()
        }
        break
      }
      case 14:
        this.sizeX = buf.readUByte()
        break
      case 15:
        this.sizeY = buf.readUByte()
        break
      case 17:
        this.clipType = 0
        this.blocksProjectile = false
        break
      case 18:
        this.blocksProjectile = false
        break
      case 19:
        this.isInteractive = buf.readUByte() === 1
        break
      case 21:
        this.contouredGround = 0
        break
      case 22:
        this.mergeNormals = true
        break
      case 23:
        this.modelClipped = true
        break
      case 24:
        this.seqId = buf.readUShort()
        if (this.seqId === 0xFFFF) this.seqId = -1
        break
      case 25:
        // disposeAlpha - unused
        break
      case 27:
        this.clipType = 1
        break
      case 28:
        this.decorDisplacement = buf.readUByte()
        break
      case 29:
        this.ambient = buf.readByte()
        break
      case 30:
      case 31:
      case 32:
      case 33:
      case 34:
        this.actions[opcode - 30] = buf.readString()
        break
      case 39:
        this.contrast = buf.readByte() * 25
        break
      case 40: {
        const count = buf.readUByte()
        this.recolorFrom = new Array(count)
        this.recolorTo = new Array(count)
        for (let i = 0; i < count; i++) {
          this.recolorFrom[i] = buf.readUShort()
          this.recolorTo[i] = buf.readUShort()
        }
        break
      }
      case 41: {
        const count = buf.readUByte()
        this.retextureFrom = new Array(count)
        this.retextureTo = new Array(count)
        for (let i = 0; i < count; i++) {
          this.retextureFrom[i] = buf.readUShort()
          this.retextureTo[i] = buf.readUShort()
        }
        break
      }
      case 60:
        this.mapFunctionId = buf.readUShort()
        break
      case 61:
        // OSRS category id (group/category classification)
        buf.readUShort()
        break
      case 62:
        this.isRotated = true
        break
      case 64:
        this.clipped = false
        break
      case 65:
        this.modelSizeX = buf.readUShort()
        break
      case 66:
        this.modelSizeHeight = buf.readUShort()
        break
      case 67:
        this.modelSizeY = buf.readUShort()
        break
      case 68:
        this.mapSceneId = buf.readUShort()
        break
      case 69:
        buf.readUByte() // unknown
        break
      case 70:
        this.offsetX = buf.readShort()
        break
      case 71:
        this.offsetHeight = buf.readShort()
        break
      case 72:
        this.offsetY = buf.readShort()
        break
      case 73:
        this.obstructsGround = true
        break
      case 74:
        this.isHollow = true
        break
      case 75:
        this.supportItems = buf.readUByte()
        break
      case 77:
      case 92: {
        this.transformVarbit = buf.readUShort()
        if (this.transformVarbit === 0xFFFF) this.transformVarbit = -1
        this.transformVarp = buf.readUShort()
        if (this.transformVarp === 0xFFFF) this.transformVarp = -1

        let lastTransform = -1
        if (opcode === 92) {
          lastTransform = buf.readUShort()
          if (lastTransform === 0xFFFF) lastTransform = -1
        }

        const count = buf.readUByte()
        this.transforms = new Array(count + 2)
        for (let i = 0; i <= count; i++) {
          this.transforms[i] = buf.readUShort()
          if (this.transforms[i] === 0xFFFF) this.transforms[i] = null
        }
        this.transforms[count + 1] = lastTransform === -1 ? null : lastTransform
        break
      }
      case 78:
        this.ambientSoundId = buf.readUShort()
        this.ambientSoundDistance = buf.readUByte()
        break
      case 79: {
        buf.readUShort() // min ticks
        buf.readUShort() // max ticks
        buf.readUByte() // distance
        const count = buf.readUByte()
        for (let i = 0; i < count; i++) {
          buf.readUShort() // sound ids
        }
        break
      }
      case 81:
        this.contouredGround = buf.readUByte()
        break
      case 82:
        this.mapFunctionId = buf.readUShort()
        break
      case 89:
        this.seqRandomStart = true
        break
      case 91:
        // member only - unused
        break
      case 93:
        this.contouredGround = buf.readUShort()
        break
      case 94:
        this.contourGroundType = buf.readUByte()
        break
      case 95:
        this.contourGroundType = buf.readUByte()
        this.contourGroundParam = buf.readShort()
        break
      case 97:
        // adjustToTerrain
        break
      case 98:
        // isManualTerrain
        break
      case 99:
        buf.readUByte() // cursor 1
        buf.readUShort() // cursor 1 id
        break
      case 100:
        buf.readUByte() // cursor 2
        buf.readUShort() // cursor 2 id
        break
      case 101:
        buf.readUByte() // unknown
        break
      case 102:
        this.mapSceneId = buf.readUShort()
        break
      // OSRS additional opcodes
      case 103:
        buf.readUShort() // unknown
        break
      case 104:
        buf.readUByte() // unknown
        break
      case 105:
        buf.readUByte() // ignoreClipOnAlternativeRoute
        break
      case 106:
        buf.readUShort() // multiVarBit
        buf.readUShort() // multiVarp
        {
          const count = buf.readUByte()
          for (let i = 0; i <= count; i++) {
            buf.readUShort() // multi transform
          }
        }
        break
      case 107:
        buf.readUShort() // mapSceneRotated
        break
      case 160: {
        // anIntArrayArray4554
        const count = buf.readUByte()
        for (let i = 0; i < count; i++) {
          buf.readUShort()
        }
        break
      }
      case 162: {
        // aByteArray4568
        const count = buf.readUByte()
        for (let i = 0; i < count; i++) {
          buf.readByte()
        }
        break
      }
      case 163: {
        // aByte4557
        buf.readByte()
        buf.readByte()
        buf.readByte()
        buf.readByte()
        break
      }
      case 164:
        buf.readShort() // x offset
        break
      case 165:
        buf.readShort() // z offset
        break
      case 166:
        buf.readShort() // y offset
        break
      case 167:
        buf.readUShort() // unknown
        break
      case 168:
        buf.readUByte() // unknown
        break
      case 169: {
        // unknown array
        buf.readUByte()
        break
      }
      case 170: {
        buf.readUSmart() // varSound
        break
      }
      case 171: {
        buf.readUSmart() // unknown
        break
      }
      case 173: {
        buf.readUShort()
        buf.readUShort()
        break
      }
      case 177: {
        buf.readUByte() // unknown
        break
      }
      case 178: {
        buf.readUByte() // unknown
        break
      }
      case 186: {
        // Unknown OSRS opcode with potential data
        buf.readUByte() // animId type
        break
      }
      case 189: {
        buf.readUByte() // unknown
        break
      }
      case 249: {
        const count = buf.readUByte()
        for (let i = 0; i < count; i++) {
          const isString = buf.readUByte() === 1
          buf.readUMedium() // key
          if (isString) {
            buf.readString()
          } else {
            buf.readInt()
          }
        }
        break
      }
      default:
        // For truly unknown opcodes, throw to let TypeLoader handle gracefully
        throw new Error(`Unknown LocType opcode: ${opcode} at buffer pos ${buf.pos}`)
    }
  }
}
