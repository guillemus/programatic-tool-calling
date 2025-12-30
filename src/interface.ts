/**
 * Simple Image Editor API for generating images programmatically.
 *
 * The `ctx` object is available in your code.
 * All coordinates are in pixels. Canvas is 512x512 by default.
 * Origin (0,0) is TOP-LEFT. X increases rightward, Y increases downward.
 * All methods are sync and chainable (return `this`).
 *
 * @example
 * ```javascript
 * // Create a simple icon with layered shapes
 * ctx
 *   .rect(0, 0, 100, 100, { fill: '#1e40af' })
 *   .layer()
 *   .circle(50, 50, 30, { fill: '#fff' })
 *   .layer()
 *   .text('A', 50, 50, { fill: '#1e40af', size: 24, weight: 700 })
 * ```
 */

export type Point = [number, number]

export interface BaseOpts {
    fill?: string
    stroke?: string
    strokeWidth?: number
    opacity?: number
}

export interface RectOpts extends BaseOpts {
    borderRadius?: number
}

export interface ShapeOpts extends BaseOpts {}

export interface LineOpts {
    stroke: string
    width: number
    opacity?: number
}

export interface PathOpts extends BaseOpts {
    /** Whether to close the path */
    closed?: boolean
}

export interface TextOpts {
    fill?: string
    /** Font family, e.g., 'Arial', 'Inter' */
    font?: string
    /** Font size in pixels */
    size?: number
    /** Font weight, e.g., 400, 700 */
    weight?: number
    opacity?: number
}

export interface DrawingContext {
    /**
     * Draw a rectangle
     * @param x - X coordinate of top-left corner
     * @param y - Y coordinate of top-left corner
     * @param width - Width in pixels
     * @param height - Height in pixels
     * @example ctx.rect(0, 0, 512, 512, { fill: '#f0faff' })
     * @example ctx.rect(50, 50, 200, 100, { fill: '#1e40af', stroke: '#000', strokeWidth: 2 })
     * @example ctx.rect(100, 100, 80, 80, { fill: '#fff', borderRadius: 12 })
     */
    rect(x: number, y: number, width: number, height: number, opts?: RectOpts): this

    /**
     * Draw a circle
     * @param x - X coordinate of center
     * @param y - Y coordinate of center
     * @param radius - Radius in pixels
     * @example ctx.circle(256, 256, 100, { fill: '#ff5733' })
     * @example ctx.circle(100, 100, 50, { fill: '#333', stroke: '#fff', strokeWidth: 3 })
     * @example ctx.circle(200, 200, 30, { fill: 'rgba(255, 0, 0, 0.5)' })
     */
    circle(x: number, y: number, radius: number, opts?: ShapeOpts): this

    /**
     * Draw a triangle defined by three points
     * @param x1 - X coordinate of first vertex
     * @param y1 - Y coordinate of first vertex
     * @param x2 - X coordinate of second vertex
     * @param y2 - Y coordinate of second vertex
     * @param x3 - X coordinate of third vertex
     * @param y3 - Y coordinate of third vertex
     * @example ctx.triangle(256, 100, 100, 400, 412, 400, { fill: '#FFD700' })
     * @example ctx.triangle(50, 50, 150, 50, 100, 150, { fill: '#00ff00', stroke: '#000', strokeWidth: 2 })
     */
    triangle(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        x3: number,
        y3: number,
        opts?: ShapeOpts,
    ): this

    /**
     * Draw a line between two points
     * @param x1 - X coordinate of start point
     * @param y1 - Y coordinate of start point
     * @param x2 - X coordinate of end point
     * @param y2 - Y coordinate of end point
     * @example ctx.line(0, 0, 512, 512, { stroke: '#000', width: 2 })
     * @example ctx.line(100, 200, 400, 200, { stroke: '#ff0000', width: 5 })
     */
    line(x1: number, y1: number, x2: number, y2: number, opts?: LineOpts): this

    /**
     * Draw a path from connected points.
     * Points is an array of [x, y] tuples. Do NOT use SVG path strings.
     * @param points - Array of [x, y] coordinates
     * @example ctx.path([[100, 100], [200, 50], [300, 100], [250, 200], [150, 200]], { fill: '#9933ff', closed: true })
     * @example ctx.path([[0, 256], [128, 128], [256, 256], [384, 128], [512, 256]], { stroke: '#000', strokeWidth: 3 })
     */
    path(points: Point[], opts?: PathOpts): this

    /**
     * Draw an arc (partial circle). Angles are in DEGREES, not radians.
     * @param x - X coordinate of center
     * @param y - Y coordinate of center
     * @param radius - Radius in pixels
     * @param startAngle - Start angle in degrees (0 = right, 90 = bottom, 180 = left, 270 = top)
     * @param endAngle - End angle in degrees
     * @example ctx.arc(256, 256, 100, 0, 180, { stroke: '#333', strokeWidth: 4 })
     * @example ctx.arc(256, 256, 80, 45, 315, { fill: '#ff9900' })
     * @example ctx.arc(200, 300, 50, 0, 90, { stroke: '#000', strokeWidth: 2 })
     */
    arc(
        x: number,
        y: number,
        radius: number,
        startAngle: number,
        endAngle: number,
        opts?: ShapeOpts,
    ): this

    /**
     * Draw text centered at the given coordinates
     * @param content - Text content
     * @param x - X coordinate (center)
     * @param y - Y coordinate (center)
     * @example ctx.text('Hello', 256, 256, { fill: '#000', size: 48 })
     * @example ctx.text('Bold Text', 256, 100, { fill: '#1e40af', size: 32, weight: 700 })
     * @example ctx.text('Custom Font', 256, 200, { fill: '#333', font: 'Georgia', size: 24 })
     */
    text(content: string, x: number, y: number, opts?: TextOpts): this

    /**
     * Move to next layer. Higher layers render on top of lower layers.
     * Use this to control z-order of shapes.
     * @example ctx.rect(0, 0, 512, 512, { fill: '#fff' }).layer().circle(256, 256, 100, { fill: '#f00' })
     */
    layer(): this
}
