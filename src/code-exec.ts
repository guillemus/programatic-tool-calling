import { executeCode } from '@/executor'
import { gpt52 } from '@/providers'
import { generateText, stepCountIs, tool } from 'ai'
import fs from 'node:fs/promises'
import { z } from 'zod'

// @ts-expect-error: there's surely a typesafe way to do this, can't find any right now
import interfaceDocs from '@/interface' with { type: 'text' }

/**
 * Simple Image Editor Agent Algorithm:
 *
 * 1. Agent receives a description of the image to create
 * 2. Agent writes code using the DrawingContext API
 * 3. Code is executed to produce a PNG
 * 4. Result is shown to the agent
 * 5. If not satisfied, agent REWRITES the entire code
 * 6. Repeat until satisfied
 *
 * Each iteration: code → PNG
 * No mutable state between executions.
 */
export interface SimpleImageEditorOptions {
    /** Output filename (without extension). Defaults to 'output' */
    name?: string
    /** Canvas size in pixels. Defaults to 512 */
    canvasSize?: number
}

export async function simpleImageEditorAgent(
    instruction: string,
    options: SimpleImageEditorOptions = {},
) {
    const name = options.name ?? 'output'
    const canvasSize = options.canvasSize ?? 512

    const outputDir = './data'
    await fs.mkdir(outputDir, { recursive: true })
    let stepCount = 0

    const systemPrompt = `You are an image generation assistant. You write JavaScript code to create images using the DrawingContext API.

Canvas: ${canvasSize}x${canvasSize} pixels. Origin (0,0) is TOP-LEFT. X increases rightward, Y increases downward.

${interfaceDocs}

LAYERS:
- Use ctx.layer() to move to the next layer
- Higher layers render ON TOP of lower layers
- Example: background rect on layer 0, foreground circle on layer 1

WORKFLOW:
1. Plan the image composition (shapes, colors, layers)
2. Write code that creates the entire image
3. CRITICALLY examine the result - check positioning, colors, proportions
4. If ANYTHING is wrong, identify the issue and rewrite the code
5. Iterate until the result looks correct. Only then respond with a text summary.

COMMON PATTERNS:
- Outline shapes: use fill: 'transparent' with stroke and strokeWidth
- Layered composition: .rect(...).layer().circle(...).layer().text(...)
- Transparency: use rgba() or opacity option
- Rounded shapes: use borderRadius on rect()

RULES:
- Each execution starts fresh
- To fix anything, rewrite the entire code
- All methods are sync and chainable
- Use ctx.method() syntax (the ctx object is provided)`

    const result = await generateText({
        model: gpt52,
        system: systemPrompt,
        messages: [
            {
                role: 'user',
                content: instruction,
            },
        ],
        tools: {
            executeCode: tool({
                description:
                    'Execute JavaScript code to create an image using the DrawingContext API. Returns the generated image.',
                inputSchema: z.object({
                    code: z.string().describe('JavaScript code using the DrawingContext API'),
                }),
                execute: async ({ code }) => {
                    const buffer = await executeCode(code, canvasSize)
                    return { buffer, imageData: buffer.toString('base64') }
                },
                toModelOutput: (result) => ({
                    type: 'content',
                    value: [
                        { type: 'text', text: 'Code executed. Generated image:' },
                        {
                            type: 'media',
                            data: result.output.imageData,
                            mediaType: 'image/png',
                        },
                    ],
                }),
            }),
        },
        stopWhen: stepCountIs(10),
        onStepFinish: async ({ toolResults }) => {
            for (const result of toolResults ?? []) {
                if (result.toolName === 'executeCode') {
                    stepCount++
                    const stepPath = `${outputDir}/${name}.debug-${stepCount}.png`
                    const output = result.output as { buffer: Buffer }
                    await fs.writeFile(stepPath, output.buffer)
                    console.log(`[${name}] Step ${stepCount}: ${stepPath}`)
                }
            }
        },
    })

    console.log(`Final response: ${result.text}`)
    console.log(`Total steps: ${result.steps.length}`)

    // Get final buffer from last executeCode tool result
    const lastExecuteResult = result.steps
        .flatMap((s) => s.toolResults ?? [])
        .findLast((r) => r.toolName === 'executeCode')

    const outputPath = `${outputDir}/${name}.png`

    if (lastExecuteResult) {
        const output = lastExecuteResult.output as { buffer: Buffer }
        await fs.writeFile(outputPath, output.buffer)
        console.log(`Saved to ${outputPath}`)
    } else {
        console.log('No code was executed, no output saved')
    }

    return outputPath
}
