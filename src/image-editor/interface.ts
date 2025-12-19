/**
 * Image Editor API for drawing on images.
 *
 * The `editor` object is available in your code.
 * All coordinates are in pixels from top-left.
 * All draw methods are async, use await.
 *
 * @example
 * ```javascript
 * // Draw a labeled box
 * await editor.drawRectangle(100, 50, 200, 80, 'red', 2)
 * await editor.drawText(110, 40, 'Label', 'red', 16)
 * await editor.drawLine(210, 40, 210, 50, 'red', 2)
 * ```
 */
export interface ImageEditor {
    /** Get image width in pixels */
    getWidth(): number

    /** Get image height in pixels */
    getHeight(): number

    /**
     * Draw a line between two points
     * @param color - defaults to 'red'
     * @param width - defaults to 3
     */
    drawLine(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        color?: string,
        width?: number,
    ): Promise<void>

    /**
     * Draw rectangle outline
     * @param color - defaults to 'red'
     * @param strokeWidth - defaults to 3
     */
    drawRectangle(
        x: number,
        y: number,
        width: number,
        height: number,
        color?: string,
        strokeWidth?: number,
    ): Promise<void>

    /**
     * Draw text at position
     * @param color - defaults to 'red'
     * @param fontSize - defaults to 20
     */
    drawText(x: number, y: number, text: string, color?: string, fontSize?: number): Promise<void>
}
