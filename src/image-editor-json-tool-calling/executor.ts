import fs from 'fs/promises'
import sharp from 'sharp'

export interface ImageMetadata {
    width: number
    height: number
}

export interface ImageState {
    buffer: Buffer
    metadata: ImageMetadata
}

export async function loadImage(inputPath: string): Promise<ImageState> {
    const buffer = await fs.readFile(inputPath)
    const meta = await sharp(buffer).metadata()
    return {
        buffer,
        metadata: { width: meta.width!, height: meta.height! },
    }
}

export async function drawLine(
    state: ImageState,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string = 'red',
    lineWidth: number = 3,
): Promise<Buffer> {
    const { width, height } = state.metadata
    const svg = `<svg width="${width}" height="${height}">
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${lineWidth}"/>
    </svg>`
    return sharp(state.buffer)
        .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
        .toBuffer()
}

export async function drawRectangle(
    state: ImageState,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string = 'red',
    strokeWidth: number = 3,
): Promise<Buffer> {
    const { width, height } = state.metadata
    const svg = `<svg width="${width}" height="${height}">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>
    </svg>`
    return sharp(state.buffer)
        .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
        .toBuffer()
}

export async function drawText(
    state: ImageState,
    x: number,
    y: number,
    text: string,
    color: string = 'red',
    fontSize: number = 20,
): Promise<Buffer> {
    const { width, height } = state.metadata
    const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const svg = `<svg width="${width}" height="${height}">
        <text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}">${escapedText}</text>
    </svg>`
    return sharp(state.buffer)
        .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
        .toBuffer()
}
