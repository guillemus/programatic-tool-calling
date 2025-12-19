import fs from 'fs/promises'
import sharp from 'sharp'

export interface ImageMetadata {
    width: number
    height: number
}

export async function loadImage(
    inputPath: string,
): Promise<{ buffer: Buffer; metadata: ImageMetadata }> {
    const buffer = await fs.readFile(inputPath)
    const meta = await sharp(buffer).metadata()
    return {
        buffer,
        metadata: { width: meta.width!, height: meta.height! },
    }
}

/**
 * Mutable image state for tool-based approach.
 * Unlike code-exec, here we accumulate changes.
 */
export class ImageState {
    private buffer: Buffer
    private readonly width: number
    private readonly height: number

    constructor(originalBuffer: Buffer, metadata: ImageMetadata) {
        this.buffer = Buffer.from(originalBuffer)
        this.width = metadata.width
        this.height = metadata.height
    }

    getWidth(): number {
        return this.width
    }

    getHeight(): number {
        return this.height
    }

    getBuffer(): Buffer {
        return this.buffer
    }

    async drawLine(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        color: string = 'red',
        lineWidth: number = 3,
    ): Promise<void> {
        const svg = `<svg width="${this.width}" height="${this.height}">
            <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${lineWidth}"/>
        </svg>`
        this.buffer = await sharp(this.buffer)
            .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
            .toBuffer()
    }

    async drawRectangle(
        x: number,
        y: number,
        w: number,
        h: number,
        color: string = 'red',
        strokeWidth: number = 3,
    ): Promise<void> {
        const svg = `<svg width="${this.width}" height="${this.height}">
            <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>
        </svg>`
        this.buffer = await sharp(this.buffer)
            .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
            .toBuffer()
    }

    async drawText(
        x: number,
        y: number,
        text: string,
        color: string = 'red',
        fontSize: number = 20,
    ): Promise<void> {
        const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        const svg = `<svg width="${this.width}" height="${this.height}">
            <text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}">${escapedText}</text>
        </svg>`
        this.buffer = await sharp(this.buffer)
            .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
            .toBuffer()
    }
}
