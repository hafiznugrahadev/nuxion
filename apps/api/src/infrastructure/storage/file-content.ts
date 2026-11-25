import { extname } from 'node:path';

const TYPES = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
} as const;

export function validatedFileType(
  buffer: Buffer,
  originalName: string,
):
  | {
      mimeType: string;
      originalName: string;
    }
  | undefined {
  let mimeType: keyof typeof TYPES | undefined;
  if (
    buffer.length >= 45 &&
    buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) &&
    buffer.readUInt32BE(8) === 13 &&
    buffer.toString('ascii', 12, 16) === 'IHDR' &&
    buffer.readUInt32BE(16) > 0 &&
    buffer.readUInt32BE(20) > 0 &&
    buffer.subarray(-12).equals(Buffer.from('0000000049454e44ae426082', 'hex'))
  )
    mimeType = 'image/png';
  else if (
    buffer.length >= 12 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff &&
    buffer[buffer.length - 2] === 0xff &&
    buffer[buffer.length - 1] === 0xd9
  )
    mimeType = 'image/jpeg';
  else if (
    buffer.length >= 14 &&
    ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6)) &&
    buffer.readUInt16LE(6) > 0 &&
    buffer.readUInt16LE(8) > 0 &&
    buffer[buffer.length - 1] === 0x3b
  )
    mimeType = 'image/gif';
  else if (
    buffer.length >= 25 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.readUInt32LE(4) === buffer.length - 8 &&
    buffer.toString('ascii', 8, 12) === 'WEBP' &&
    ['VP8 ', 'VP8L', 'VP8X'].includes(buffer.toString('ascii', 12, 16)) &&
    buffer.readUInt32LE(16) > 0 &&
    buffer.readUInt32LE(16) <= buffer.length - 20
  )
    mimeType = 'image/webp';
  else if (
    buffer.length >= 20 &&
    /^%PDF-(?:1\.[0-9]|2\.0)/.test(buffer.toString('ascii', 0, 8)) &&
    /%%EOF\s*$/.test(buffer.subarray(-1024).toString('ascii'))
  )
    mimeType = 'application/pdf';
  if (!mimeType) return undefined;
  const extensions: readonly string[] = TYPES[mimeType];
  if (!extensions.includes(extname(originalName).toLowerCase())) return undefined;
  return { mimeType, originalName: `file${extensions[0]}` };
}
