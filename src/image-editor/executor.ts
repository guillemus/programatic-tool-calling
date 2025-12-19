import fs from 'fs/promises'
import sharp from 'sharp'
import type { ImageEditor } from './interface'

export interface ImageMetadata {
    width: number
    height: number
}

export async function loadImage(
    inputPath: string
): Promise<{ buffer: Buffer; metadata: ImageMetadata }> {
    const buffer = await fs.readFile(inputPath)
    const meta = await sharp(buffer).metadata()
    return {
        buffer,
        metadata: { width: meta.width!, height: meta.height! },
    }
}

/**
 * Execute drawing code on an image buffer.
 * Pure function: takes original buffer, returns new buffer with drawings.
 */
export async function executeCode(
    code: string,
    originalBuffer: Buffer,
    metadata: ImageMetadata
): Promise<Buffer> {
    const { width, height } = metadata
    let buffer: Buffer = Buffer.from(originalBuffer)

    const editor: ImageEditor = {
        getWidth: () => width,
        getHeight: () => height,

        drawLine: async (x1, y1, x2, y2, color = 'red', lineWidth = 3) => {
            const svg = `<svg width="${width}" height="${height}">
                <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${lineWidth}"/>
            </svg>`
            buffer = await sharp(buffer)
                .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
                .toBuffer()
        },

        drawRectangle: async (x, y, w, h, color = 'red', strokeWidth = 3) => {
            const svg = `<svg width="${width}" height="${height}">
                <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>
            </svg>`

            buffer = await sharp(buffer)
                .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
                .toBuffer()
        },

        drawText: async (x, y, text, color = 'red', fontSize = 20) => {
            const escapedText = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
            const svg = `<svg width="${width}" height="${height}">
                <text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}">${escapedText}</text>
            </svg>`
            buffer = await sharp(buffer)
                .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
                .toBuffer()
        },
    }

    const asyncFn = new Function('editor', `return (async () => { ${code} })()`)
    await asyncFn(editor)

    return buffer
}

export async function getInterfaceDocumentation(): Promise<string> {
    const filePath = new URL('./interface.ts', import.meta.url).pathname
    const content = await fs.readFile(filePath, 'utf-8')

    return content
}
