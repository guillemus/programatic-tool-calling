import { gpt52 } from '@/providers'
import { generateText, stepCountIs, tool } from 'ai'
import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'
import { drawLine, drawRectangle, drawText, loadImage, type ImageState } from './executor'

/**
 * Image Edit Agent using Tool Calls:
 *
 * Instead of code execution, the model calls individual drawing tools.
 * Each tool modifies the current buffer state and returns the updated image.
 * The model can call multiple tools in sequence to build up annotations.
 */
export async function imageEditorAgent(inputPath: string, instruction: string) {
    const initialState = await loadImage(inputPath)
    const { width, height } = initialState.metadata

    // Mutable state that tools update
    let currentState: ImageState = { ...initialState }

    const outputDir = './data/debug'
    await fs.mkdir(outputDir, { recursive: true })
    let stepCount = 0

    const systemPrompt = `You are an image annotation assistant. You use drawing tools to annotate images.

Image: ${width}x${height} pixels. Origin (0,0) is TOP-LEFT. X increases rightward, Y increases downward.

AVAILABLE TOOLS:
- drawLine(x1, y1, x2, y2, color?, lineWidth?) - Draw a line between two points
- drawRectangle(x, y, width, height, color?, strokeWidth?) - Draw rectangle outline
- drawText(x, y, text, color?, fontSize?) - Draw text at position
- resetImage() - Reset to original image (use if you need to start over)

WORKFLOW:
1. Analyze the image, estimate pixel coordinates of target elements
2. Call drawing tools to add annotations
3. CRITICALLY examine the result image - look for misalignment, clipping, overlap
4. If ANYTHING is wrong, call resetImage() and redo with corrected coordinates
5. Iterate until the result is correct. Only then respond with a text summary.

SELF-CORRECTION:
After each drawing, ask yourself:
- Are shapes positioned exactly where intended?
- Do annotations touch or overlap content they shouldn't?
- Are the coordinates off? By how much? In which direction?
Then fix the specific issues with adjusted coordinates.

RULES:
- Each drawing tool modifies the current image state
- Use resetImage() to start fresh if you need to correct mistakes
- Default color is 'red', default lineWidth/strokeWidth is 3, default fontSize is 20`

    const makeToolOutput = (buffer: Buffer) => ({
        buffer,
        imageData: buffer.toString('base64'),
    })

    const toolOutputToModel = (result: { output: { imageData: string } }) => ({
        type: 'content' as const,
        value: [
            { type: 'text' as const, text: 'Drawing applied. Updated image:' },
            {
                type: 'media' as const,
                data: result.output.imageData,
                mediaType: 'image/png' as const,
            },
        ],
    })

    const result = await generateText({
        model: gpt52,
        system: systemPrompt,
        providerOptions: {
            openai: {
                reasoningEffort: 'low',
            },
        },
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: instruction },
                    { type: 'image', image: initialState.buffer },
                ],
            },
        ],
        tools: {
            drawLine: tool({
                description: 'Draw a line between two points',
                inputSchema: z.object({
                    x1: z.number().describe('Start X coordinate'),
                    y1: z.number().describe('Start Y coordinate'),
                    x2: z.number().describe('End X coordinate'),
                    y2: z.number().describe('End Y coordinate'),
                    color: z.string().optional().describe('Line color (default: red)'),
                    lineWidth: z.number().optional().describe('Line width in pixels (default: 3)'),
                }),
                execute: async ({ x1, y1, x2, y2, color, lineWidth }) => {
                    const buffer = await drawLine(
                        currentState,
                        x1,
                        y1,
                        x2,
                        y2,
                        color ?? 'red',
                        lineWidth ?? 3,
                    )
                    currentState = { ...currentState, buffer }
                    return makeToolOutput(buffer)
                },
                toModelOutput: toolOutputToModel,
            }),

            drawRectangle: tool({
                description: 'Draw a rectangle outline',
                inputSchema: z.object({
                    x: z.number().describe('Top-left X coordinate'),
                    y: z.number().describe('Top-left Y coordinate'),
                    width: z.number().describe('Rectangle width'),
                    height: z.number().describe('Rectangle height'),
                    color: z.string().optional().describe('Stroke color (default: red)'),
                    strokeWidth: z
                        .number()
                        .optional()
                        .describe('Stroke width in pixels (default: 3)'),
                }),
                execute: async ({ x, y, width, height, color, strokeWidth }) => {
                    const buffer = await drawRectangle(
                        currentState,
                        x,
                        y,
                        width,
                        height,
                        color ?? 'red',
                        strokeWidth ?? 3,
                    )
                    currentState = { ...currentState, buffer }
                    return makeToolOutput(buffer)
                },
                toModelOutput: toolOutputToModel,
            }),

            drawText: tool({
                description: 'Draw text at a position',
                inputSchema: z.object({
                    x: z.number().describe('X coordinate'),
                    y: z.number().describe('Y coordinate (baseline of text)'),
                    text: z.string().describe('Text to draw'),
                    color: z.string().optional().describe('Text color (default: red)'),
                    fontSize: z.number().optional().describe('Font size in pixels (default: 20)'),
                }),
                execute: async ({ x, y, text, color, fontSize }) => {
                    const buffer = await drawText(
                        currentState,
                        x,
                        y,
                        text,
                        color ?? 'red',
                        fontSize ?? 20,
                    )
                    currentState = { ...currentState, buffer }
                    return makeToolOutput(buffer)
                },
                toModelOutput: toolOutputToModel,
            }),

            resetImage: tool({
                description: 'Reset to the original image, discarding all drawings',
                inputSchema: z.object({}),
                execute: async () => {
                    currentState = { ...initialState }
                    return makeToolOutput(initialState.buffer)
                },
                toModelOutput: (result) => ({
                    type: 'content' as const,
                    value: [
                        { type: 'text' as const, text: 'Image reset to original:' },
                        {
                            type: 'media' as const,
                            data: result.output.imageData,
                            mediaType: 'image/png' as const,
                        },
                    ],
                }),
            }),
        },
        stopWhen: stepCountIs(20),
        onStepFinish: async ({ toolResults }) => {
            for (const result of toolResults ?? []) {
                stepCount++
                const stepPath = `${outputDir}/step-${stepCount}.png`
                const output = result.output as { buffer: Buffer }
                await fs.writeFile(stepPath, output.buffer)
                console.log(`[Step ${stepCount}] ${result.toolName} - Saved: ${stepPath}`)
            }
        },
    })

    console.log(`Final response: ${result.text}`)
    console.log(`Total steps: ${result.steps.length}`)

    const ext = path.extname(inputPath)
    const baseName = path.basename(inputPath, ext)
    const outputPath = `./data/${baseName}-edited${ext}`

    await fs.writeFile(outputPath, currentState.buffer)
    console.log(`Saved to ${outputPath}`)

    return outputPath
}
