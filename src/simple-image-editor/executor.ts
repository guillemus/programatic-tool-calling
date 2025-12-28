import fs from 'node:fs/promises'
import sharp from 'sharp'
import type {
    DrawingContext,
    LineOpts,
    PathOpts,
    Point,
    RectOpts,
    ShapeOpts,
    TextOpts,
} from './interface'

interface Element {
    layer: number
    svg: string
}

class DrawingContextImpl implements DrawingContext {
    private elements: Element[] = []
    private currentLayer = 0
    private canvasSize: number

    constructor(size = 512) {
        this.canvasSize = size
    }

    rect(x: number, y: number, width: number, height: number, opts?: RectOpts): this {
        const fill = opts?.fill ?? 'transparent'
        const stroke = opts?.stroke ?? 'none'
        const strokeWidth = opts?.strokeWidth ?? 0
        const opacity = opts?.opacity ?? 1
        const borderRadius = opts?.borderRadius ?? 0

        this.elements.push({
            layer: this.currentLayer,
            svg: `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" rx="${borderRadius}" opacity="${opacity}" />`,
        })
        return this
    }

    circle(x: number, y: number, radius: number, opts?: ShapeOpts): this {
        const fill = opts?.fill ?? 'transparent'
        const stroke = opts?.stroke ?? 'none'
        const strokeWidth = opts?.strokeWidth ?? 0
        const opacity = opts?.opacity ?? 1

        this.elements.push({
            layer: this.currentLayer,
            svg: `<circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />`,
        })
        return this
    }

    triangle(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        x3: number,
        y3: number,
        opts?: ShapeOpts,
    ): this {
        const fill = opts?.fill ?? 'transparent'
        const stroke = opts?.stroke ?? 'none'
        const strokeWidth = opts?.strokeWidth ?? 0
        const opacity = opts?.opacity ?? 1

        this.elements.push({
            layer: this.currentLayer,
            svg: `<polygon points="${x1},${y1} ${x2},${y2} ${x3},${y3}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />`,
        })
        return this
    }

    line(x1: number, y1: number, x2: number, y2: number, opts?: LineOpts): this {
        const stroke = opts?.stroke ?? '#000'
        const width = opts?.width ?? 1
        const opacity = opts?.opacity ?? 1

        this.elements.push({
            layer: this.currentLayer,
            svg: `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" opacity="${opacity}" />`,
        })
        return this
    }

    path(points: Point[], opts?: PathOpts): this {
        if (points.length === 0) {
            return this
        }

        const fill = opts?.fill ?? 'transparent'
        const stroke = opts?.stroke ?? 'none'
        const strokeWidth = opts?.strokeWidth ?? 0
        const opacity = opts?.opacity ?? 1
        const closed = opts?.closed ?? false

        const [first, ...rest] = points
        let d = `M ${first[0]},${first[1]}`
        for (const point of rest) {
            d += ` L ${point[0]},${point[1]}`
        }
        if (closed) {
            d += ' Z'
        }

        this.elements.push({
            layer: this.currentLayer,
            svg: `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />`,
        })
        return this
    }

    arc(
        x: number,
        y: number,
        radius: number,
        startAngle: number,
        endAngle: number,
        opts?: ShapeOpts,
    ): this {
        const fill = opts?.fill ?? 'transparent'
        const stroke = opts?.stroke ?? 'none'
        const strokeWidth = opts?.strokeWidth ?? 0
        const opacity = opts?.opacity ?? 1

        // Convert degrees to radians
        const startRad = (startAngle * Math.PI) / 180
        const endRad = (endAngle * Math.PI) / 180

        // Calculate start and end points
        const x1 = x + radius * Math.cos(startRad)
        const y1 = y + radius * Math.sin(startRad)
        const x2 = x + radius * Math.cos(endRad)
        const y2 = y + radius * Math.sin(endRad)

        // Determine if we need the large arc flag
        const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0
        const sweepFlag = endAngle > startAngle ? 1 : 0

        const d = `M ${x},${y} L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag},${sweepFlag} ${x2},${y2} Z`

        this.elements.push({
            layer: this.currentLayer,
            svg: `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />`,
        })
        return this
    }

    text(content: string, x: number, y: number, opts?: TextOpts): this {
        const fill = opts?.fill ?? '#000'
        const font = opts?.font ?? 'Arial'
        const size = opts?.size ?? 16
        const weight = opts?.weight ?? 400
        const opacity = opts?.opacity ?? 1

        const escapedContent = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')

        this.elements.push({
            layer: this.currentLayer,
            svg: `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" opacity="${opacity}" text-anchor="middle" dominant-baseline="central">${escapedContent}</text>`,
        })
        return this
    }

    layer(): this {
        this.currentLayer++
        return this
    }

    toSVG(): string {
        const sorted = [...this.elements].sort((a, b) => a.layer - b.layer)
        return `<svg width="${this.canvasSize}" height="${this.canvasSize}" xmlns="http://www.w3.org/2000/svg">
${sorted.map((el) => el.svg).join('\n')}
</svg>`
    }

    async toPNG(size?: number): Promise<Buffer> {
        const svg = this.toSVG()
        const targetSize = size ?? this.canvasSize
        return sharp(Buffer.from(svg)).resize(targetSize, targetSize).png().toBuffer()
    }
}

export function createDrawingContext(size = 512): DrawingContext & {
    toSVG(): string
    toPNG(size?: number): Promise<Buffer>
} {
    return new DrawingContextImpl(size)
}

export async function executeCode(code: string, canvasSize = 512): Promise<Buffer> {
    const ctx = createDrawingContext(canvasSize)
    const asyncFn = new Function('ctx', `return (async () => { ${code} })()`)
    await asyncFn(ctx)
    return ctx.toPNG()
}

export async function getInterfaceDocumentation(): Promise<string> {
    const filePath = new URL('./interface.ts', import.meta.url).pathname
    const content = await fs.readFile(filePath, 'utf-8')
    return content
}
