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
     */
    rect(x: number, y: number, width: number, height: number, opts?: RectOpts): this

    /**
     * Draw a circle
     * @param x - X coordinate of center
     * @param y - Y coordinate of center
     * @param radius - Radius in pixels
     */
    circle(x: number, y: number, radius: number, opts?: ShapeOpts): this

    /**
     * Draw a triangle defined by three points
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
     */
    line(x1: number, y1: number, x2: number, y2: number, opts?: LineOpts): this

    /**
     * Draw a path from connected points
     * @param points - Array of [x, y] coordinates
     */
    path(points: Point[], opts?: PathOpts): this

    /**
     * Draw an arc (partial circle)
     * @param x - X coordinate of center
     * @param y - Y coordinate of center
     * @param radius - Radius in pixels
     * @param startAngle - Start angle in degrees (0 = right, 90 = bottom)
     * @param endAngle - End angle in degrees
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
     * Draw text
     * @param content - Text content
     * @param x - X coordinate (center)
     * @param y - Y coordinate (center)
     */
    text(content: string, x: number, y: number, opts?: TextOpts): this

    /**
     * Move to next layer. Higher layers render on top of lower layers.
     */
    layer(): this
}
