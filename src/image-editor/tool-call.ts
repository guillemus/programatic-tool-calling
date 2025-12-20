import { devToolsMiddleware } from '@ai-sdk/devtools'
import { generateText, hasToolCall, tool, wrapLanguageModel, zodSchema } from 'ai'
import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'
import { gpt52 } from '../providers'
import { ImageState, loadImage } from './state'

function getModel() {
    return wrapLanguageModel({ model: gpt52, middleware: devToolsMiddleware() })
}

/**
 * Tool-based Image Edit Agent:
 *
 * Unlike code-exec approach, this exposes individual drawing operations as tools.
 * The agent calls tools incrementally to build up annotations.
 * State is mutable and accumulates across tool calls.
 */
export async function toolCallAgent(inputPath: string, instruction: string) {
    const { buffer: originalBuffer, metadata } = await loadImage(inputPath)
    const { width, height } = metadata

    const outputDir = './data/debug'
    await fs.mkdir(outputDir, { recursive: true })
    let stepCount = 0

    const imageState = new ImageState(originalBuffer, metadata)

    const systemPrompt = `You are an image annotation assistant. You have tools to draw on images.

Image dimensions: ${width}x${height} pixels.
Coordinates are in pixels from top-left (0,0).

Available tools:
- drawLine: Draw a line between two points
- drawRectangle: Draw a rectangle outline
- drawText: Draw text at a position
- finish: Call when all annotations are complete

WORKFLOW:
1. Analyze the image carefully
2. Call drawing tools to add annotations
3. You can call multiple tools to build up the image
4. When satisfied, call the finish tool

IMPORTANT:
- Annotations accumulate (each tool adds to the image)
- Think carefully about positioning before drawing
- Use appropriate colors and sizes for visibility`

    const result = await generateText({
        model: getModel(),
        system: systemPrompt,
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: instruction },
                    { type: 'image', image: originalBuffer },
                ],
            },
        ],
        tools: {
            drawLine: tool({
                description: 'Draw a line between two points on the image',
                inputSchema: zodSchema(
                    z.object({
                        x1: z.number().describe('Starting x coordinate'),
                        y1: z.number().describe('Starting y coordinate'),
                        x2: z.number().describe('Ending x coordinate'),
                        y2: z.number().describe('Ending y coordinate'),
                        color: z.string().optional().describe('Line color (default: red)'),
                        width: z.number().optional().describe('Line width in pixels (default: 3)'),
                    }),
                ),
                execute: async ({ x1, y1, x2, y2, color, width: lineWidth }) => {
                    stepCount++
                    console.log(
                        `[Step ${stepCount}] drawLine(${x1}, ${y1}, ${x2}, ${y2}, ${color}, ${lineWidth})`,
                    )

                    await imageState.drawLine(x1, y1, x2, y2, color, lineWidth)

                    const stepPath = `${outputDir}/step-${stepCount}.png`
                    await fs.writeFile(stepPath, imageState.getBuffer())
                    console.log(`Saved: ${stepPath}`)

                    return { success: true, imageData: imageState.getBuffer().toString('base64') }
                },
                toModelOutput: (result: { toolCallId: string; input: unknown; output: any }) => ({
                    type: 'content' as const,
                    value: [
                        { type: 'text' as const, text: 'Line drawn. Updated image:' },
                        {
                            type: 'media' as const,
                            data: result.output.imageData,
                            mediaType: 'image/png' as const,
                        },
                    ],
                }),
            }),
            drawRectangle: tool({
                description: 'Draw a rectangle outline on the image',
                inputSchema: zodSchema(
                    z.object({
                        x: z.number().describe('Top-left x coordinate'),
                        y: z.number().describe('Top-left y coordinate'),
                        width: z.number().describe('Rectangle width'),
                        height: z.number().describe('Rectangle height'),
                        color: z.string().optional().describe('Stroke color (default: red)'),
                        strokeWidth: z
                            .number()
                            .optional()
                            .describe('Stroke width in pixels (default: 3)'),
                    }),
                ),
                execute: async ({ x, y, width: w, height: h, color, strokeWidth }) => {
                    stepCount++
                    console.log(
                        `[Step ${stepCount}] drawRectangle(${x}, ${y}, ${w}, ${h}, ${color}, ${strokeWidth})`,
                    )

                    await imageState.drawRectangle(x, y, w, h, color, strokeWidth)

                    const stepPath = `${outputDir}/step-${stepCount}.png`
                    await fs.writeFile(stepPath, imageState.getBuffer())
                    console.log(`Saved: ${stepPath}`)

                    return { success: true, imageData: imageState.getBuffer().toString('base64') }
                },
                toModelOutput: (result: { toolCallId: string; input: unknown; output: any }) => ({
                    type: 'content' as const,
                    value: [
                        { type: 'text' as const, text: 'Rectangle drawn. Updated image:' },
                        {
                            type: 'media' as const,
                            data: result.output.imageData,
                            mediaType: 'image/png' as const,
                        },
                    ],
                }),
            }),
            drawText: tool({
                description: 'Draw text at a position on the image',
                inputSchema: zodSchema(
                    z.object({
                        x: z.number().describe('X coordinate for text'),
                        y: z.number().describe('Y coordinate for text baseline'),
                        text: z.string().describe('Text to draw'),
                        color: z.string().optional().describe('Text color (default: red)'),
                        fontSize: z
                            .number()
                            .optional()
                            .describe('Font size in pixels (default: 20)'),
                    }),
                ),
                execute: async ({ x, y, text, color, fontSize }) => {
                    stepCount++
                    console.log(
                        `[Step ${stepCount}] drawText(${x}, ${y}, "${text}", ${color}, ${fontSize})`,
                    )

                    await imageState.drawText(x, y, text, color, fontSize)

                    const stepPath = `${outputDir}/step-${stepCount}.png`
                    await fs.writeFile(stepPath, imageState.getBuffer())
                    console.log(`Saved: ${stepPath}`)

                    return { success: true, imageData: imageState.getBuffer().toString('base64') }
                },
                toModelOutput: (result: { toolCallId: string; input: unknown; output: any }) => ({
                    type: 'content' as const,
                    value: [
                        { type: 'text' as const, text: 'Text drawn. Updated image:' },
                        {
                            type: 'media' as const,
                            data: result.output.imageData,
                            mediaType: 'image/png' as const,
                        },
                    ],
                }),
            }),
            finish: tool({
                description: 'Call when all annotations are complete',
                inputSchema: zodSchema(
                    z.object({
                        summary: z.string().describe('Brief summary of what was drawn'),
                    }),
                ),
                execute: async ({ summary }) => {
                    console.log(`Finish: ${summary}`)
                    return { done: true, summary }
                },
            }),
        },
        stopWhen: hasToolCall('finish'),
        onStepFinish: ({ toolCalls }) => {
            console.log(`Step finished, tools called: ${toolCalls?.length ?? 0}`)
        },
    })

    console.log(`Final response: ${result.text}`)
    console.log(`Total steps: ${result.steps.length}`)

    const ext = path.extname(inputPath)
    const baseName = path.basename(inputPath, ext)
    const outputPath = `./data/${baseName}-edited${ext}`
    await fs.writeFile(outputPath, imageState.getBuffer())
    console.log(`Saved to ${outputPath}`)

    return outputPath
}
