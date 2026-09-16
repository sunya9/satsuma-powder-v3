import { describe, it, expect } from 'vitest'
import { stripImageMetadata } from '@/hooks/strip-exif'

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0))
const u16be = (n: number) => [(n >> 8) & 0xff, n & 0xff]
const u32be = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]
const u32le = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]
const bytes = (...parts: number[][]) => Uint8Array.from(parts.flat())

// JPEG segment: marker + 2-byte length (includes itself) + payload
const jpegSegment = (marker: number, payload: number[]) => [
  0xff,
  marker,
  ...u16be(payload.length + 2),
  ...payload,
]
const SOI = [0xff, 0xd8]
const EOI = [0xff, 0xd9]
const APP0_JFIF = jpegSegment(0xe0, [...ascii('JFIF\0'), 1, 1, 0, 0, 1, 0, 1, 0, 0])
const APP1_EXIF = jpegSegment(0xe1, [...ascii('Exif\0\0'), ...ascii('MM'), 0, 42, 0, 0, 0, 8, 0, 0])
const APP1_XMP = jpegSegment(0xe1, [...ascii('http://ns.adobe.com/xap/1.0/\0'), ...ascii('<x/>')])
const APP2_ICC = jpegSegment(0xe2, [...ascii('ICC_PROFILE\0'), 1, 1, 9, 9])
const DQT = jpegSegment(0xdb, [0, ...Array(64).fill(1)])
// SOS is followed by entropy-coded data with no length prefix, up to EOI.
const SOS_AND_SCAN = [...jpegSegment(0xda, [1, 1, 0, 0, 63, 0]), 0x12, 0xff, 0x00, 0x34]

describe('stripImageMetadata: JPEG', () => {
  it('removes Exif and XMP APP1 segments and keeps everything else byte-for-byte', () => {
    const input = bytes(SOI, APP0_JFIF, APP1_EXIF, APP2_ICC, APP1_XMP, DQT, SOS_AND_SCAN, EOI)
    const expected = bytes(SOI, APP0_JFIF, APP2_ICC, DQT, SOS_AND_SCAN, EOI)
    expect(stripImageMetadata(input, 'image/jpeg')).toEqual(expected)
  })

  it('returns the input untouched when there is no APP1 segment', () => {
    const input = bytes(SOI, APP0_JFIF, DQT, SOS_AND_SCAN, EOI)
    expect(stripImageMetadata(input, 'image/jpeg')).toBe(input)
  })

  it('returns the input untouched when it does not start with SOI', () => {
    const input = bytes([0x00, 0x01], APP1_EXIF)
    expect(stripImageMetadata(input, 'image/jpeg')).toBe(input)
  })

  it('returns the input untouched when a segment length runs past the end', () => {
    const input = bytes(SOI, [0xff, 0xe1, 0xff, 0xff, 0x00])
    expect(stripImageMetadata(input, 'image/jpeg')).toBe(input)
  })
})

// PNG chunk: length + type + data + crc (crc value is irrelevant for this test)
const pngChunk = (type: string, data: number[]) => [
  ...u32be(data.length),
  ...ascii(type),
  ...data,
  0xde,
  0xad,
  0xbe,
  0xef,
]
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const IHDR = pngChunk('IHDR', [...u32be(1), ...u32be(1), 8, 2, 0, 0, 0])
const EXIF_CHUNK = pngChunk('eXIf', [...ascii('MM'), 0, 42, 0, 0, 0, 8])
const IDAT = pngChunk('IDAT', [1, 2, 3])
const IEND = pngChunk('IEND', [])

describe('stripImageMetadata: PNG', () => {
  it('removes the eXIf chunk and keeps the other chunks', () => {
    const input = bytes(PNG_SIG, IHDR, EXIF_CHUNK, IDAT, IEND)
    expect(stripImageMetadata(input, 'image/png')).toEqual(bytes(PNG_SIG, IHDR, IDAT, IEND))
  })

  it('returns the input untouched when there is no eXIf chunk', () => {
    const input = bytes(PNG_SIG, IHDR, IDAT, IEND)
    expect(stripImageMetadata(input, 'image/png')).toBe(input)
  })

  it('returns the input untouched when the signature is wrong', () => {
    const input = bytes([1, 2, 3, 4, 5, 6, 7, 8], EXIF_CHUNK)
    expect(stripImageMetadata(input, 'image/png')).toBe(input)
  })
})

// RIFF chunk: fourcc + LE size + data + pad byte when the size is odd
const riffChunk = (fourcc: string, data: number[]) => [
  ...ascii(fourcc),
  ...u32le(data.length),
  ...data,
  ...(data.length % 2 ? [0] : []),
]
const webp = (...chunks: number[][]) => {
  const body = [...ascii('WEBP'), ...chunks.flat()]
  return bytes(ascii('RIFF'), u32le(body.length), body)
}
// VP8X flags: ICC 0x20, EXIF 0x08, XMP 0x04
const vp8x = (flags: number) => riffChunk('VP8X', [flags, 0, 0, 0, 0, 0, 0, 0, 0, 0])
const VP8 = riffChunk('VP8 ', [9, 9, 9])
const WEBP_EXIF = riffChunk('EXIF', [...ascii('MM'), 0, 42, 0, 0, 0, 8, 1])
const WEBP_XMP = riffChunk('XMP ', ascii('<x/>'))

describe('stripImageMetadata: WebP', () => {
  it('removes EXIF/XMP chunks, clears their VP8X flags and fixes the RIFF size', () => {
    const input = webp(vp8x(0x2c), VP8, WEBP_EXIF, WEBP_XMP)
    expect(stripImageMetadata(input, 'image/webp')).toEqual(webp(vp8x(0x20), VP8))
  })

  it('returns the input untouched when there are no metadata chunks', () => {
    const input = webp(VP8)
    expect(stripImageMetadata(input, 'image/webp')).toBe(input)
  })

  it('returns the input untouched when the RIFF header is not WEBP', () => {
    const input = bytes(ascii('RIFF'), u32le(4), ascii('WAVE'))
    expect(stripImageMetadata(input, 'image/webp')).toBe(input)
  })
})

describe('stripImageMetadata: other types', () => {
  it('passes unsupported mimetypes through untouched', () => {
    const input = bytes(SOI, APP1_EXIF, EOI)
    expect(stripImageMetadata(input, 'image/gif')).toBe(input)
    expect(stripImageMetadata(input, 'application/pdf')).toBe(input)
  })
})
