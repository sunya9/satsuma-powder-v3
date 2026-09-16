import type { CollectionBeforeOperationHook } from 'payload'

// Pure byte-level removal of EXIF/XMP containers. sharp is unavailable on Workers,
// so we cannot re-encode; instead the metadata segments are cut out and the
// rest of the file is copied verbatim. Returns the same instance when nothing
// was removed or the file is not parseable, so callers can keep it as-is.
export function stripImageMetadata(data: Uint8Array, mimetype: string): Uint8Array {
  switch (mimetype) {
    case 'image/jpeg':
      return stripJpeg(data)
    case 'image/png':
      return stripPng(data)
    case 'image/webp':
      return stripWebp(data)
    default:
      return data
  }
}

const JPEG_SOI = 0xd8
const JPEG_SOS = 0xda
const JPEG_EOI = 0xd9
const JPEG_APP1 = 0xe1
const JPEG_STANDALONE_MARKERS = new Set([0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7])

function stripJpeg(data: Uint8Array): Uint8Array {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== JPEG_SOI) return data
  const kept: Uint8Array[] = [data.subarray(0, 2)]
  let removed = false
  let pos = 2
  while (pos + 4 <= data.length) {
    if (data[pos] !== 0xff) return data
    const marker = data[pos + 1]
    if (marker === JPEG_SOS || marker === JPEG_EOI) break
    if (marker === 0xff || JPEG_STANDALONE_MARKERS.has(marker)) {
      kept.push(data.subarray(pos, pos + 2))
      pos += 2
      continue
    }
    const length = (data[pos + 2] << 8) | data[pos + 3]
    const end = pos + 2 + length
    if (length < 2 || end > data.length) return data
    if (marker === JPEG_APP1) removed = true
    else kept.push(data.subarray(pos, end))
    pos = end
  }
  if (!removed) return data
  kept.push(data.subarray(pos))
  return concat(kept)
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const PNG_EXIF_CHUNK = 'eXIf'

function stripPng(data: Uint8Array): Uint8Array {
  if (!startsWith(data, PNG_SIGNATURE)) return data
  const kept: Uint8Array[] = [data.subarray(0, 8)]
  let removed = false
  let pos = 8
  while (pos + 12 <= data.length) {
    const length = readU32BE(data, pos)
    const type = fourcc(data, pos + 4)
    const end = pos + 12 + length
    if (end > data.length) return data
    if (type === PNG_EXIF_CHUNK) removed = true
    else kept.push(data.subarray(pos, end))
    pos = end
  }
  if (!removed) return data
  kept.push(data.subarray(pos))
  return concat(kept)
}

const WEBP_METADATA_CHUNKS = new Set(['EXIF', 'XMP '])
const VP8X_FLAG_EXIF = 0x08
const VP8X_FLAG_XMP = 0x04

function stripWebp(data: Uint8Array): Uint8Array {
  if (data.length < 12 || fourcc(data, 0) !== 'RIFF' || fourcc(data, 8) !== 'WEBP') return data
  const kept: Uint8Array[] = []
  let vp8xFlagsOffset = -1
  let removed = false
  let pos = 12
  while (pos + 8 <= data.length) {
    const type = fourcc(data, pos)
    const size = readU32LE(data, pos + 4)
    const end = pos + 8 + size + (size % 2)
    if (end > data.length) return data
    if (WEBP_METADATA_CHUNKS.has(type)) removed = true
    else {
      if (type === 'VP8X') vp8xFlagsOffset = kept.reduce((n, c) => n + c.length, 0) + 8
      kept.push(data.subarray(pos, end))
    }
    pos = end
  }
  if (!removed) return data
  const body = concat(kept)
  if (vp8xFlagsOffset >= 0) body[vp8xFlagsOffset] &= ~(VP8X_FLAG_EXIF | VP8X_FLAG_XMP)
  const out = new Uint8Array(12 + body.length)
  out.set(data.subarray(0, 12))
  writeU32LE(out, 4, 4 + body.length)
  out.set(body, 12)
  return out
}

function startsWith(data: Uint8Array, prefix: number[]): boolean {
  return data.length >= prefix.length && prefix.every((b, i) => data[i] === b)
}

function fourcc(data: Uint8Array, pos: number): string {
  return String.fromCharCode(data[pos], data[pos + 1], data[pos + 2], data[pos + 3])
}

function readU32BE(data: Uint8Array, pos: number): number {
  return ((data[pos] << 24) | (data[pos + 1] << 16) | (data[pos + 2] << 8) | data[pos + 3]) >>> 0
}

function readU32LE(data: Uint8Array, pos: number): number {
  return (data[pos] | (data[pos + 1] << 8) | (data[pos + 2] << 16) | (data[pos + 3] << 24)) >>> 0
}

function writeU32LE(data: Uint8Array, pos: number, value: number): void {
  data[pos] = value & 0xff
  data[pos + 1] = (value >>> 8) & 0xff
  data[pos + 2] = (value >>> 16) & 0xff
  data[pos + 3] = (value >>> 24) & 0xff
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

// Runs before Payload reads req.file, so the stored original never carries
// EXIF/XMP (GPS, device, timestamps). Images are served publicly from R2.
export function createStripExif(): CollectionBeforeOperationHook {
  return ({ args, operation, req }) => {
    if (operation !== 'create' && operation !== 'update') return args
    const file = req.file
    if (!file?.data) return args
    const stripped = stripImageMetadata(file.data, file.mimetype)
    if (stripped === file.data) return args
    file.data = Buffer.from(stripped.buffer, stripped.byteOffset, stripped.byteLength)
    file.size = stripped.byteLength
    return args
  }
}
