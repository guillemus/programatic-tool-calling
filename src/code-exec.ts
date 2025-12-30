import { executeCode } from '@/executor'
import { gemini3flash } from '@/providers'
import type { Storage } from '@/storage'
import { generateText, stepCountIs, tool } from 'ai'
import { z } from 'zod'

// @ts-expect-error: importing as raw text
import interfaceDocs from '@/interface.ts?raw'

export interface ImageEditorOptions {
    threadId: string
    storage: Storage
    canvasSize?: number
}

export async function imageEditorAgent(instruction: string, options: ImageEditorOptions) {
    const { threadId, storage } = options
    const canvasSize = options.canvasSize ?? 512

    console.log(`[agent] starting`)

    let lastResult: { code: string; imageData: string } | null = null

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
        model: gemini3flash,
        system: systemPrompt,
        messages: [{ role: 'user', content: instruction }],
        tools: {
            executeCode: tool({
                description:
                    'Execute JavaScript code to create an image using the DrawingContext API. Returns the generated image.',
                inputSchema: z.object({
                    code: z.string().describe('JavaScript code using the DrawingContext API'),
                }),
                execute: async ({ code }) => {
                    console.log(`[agent] executing code`)
                    try {
                        const buffer = await executeCode(code, canvasSize)
                        const imageData = buffer.toString('base64')
                        lastResult = { code, imageData }
                        return { success: true as const, imageData }
                    } catch (err) {
                        const message = err instanceof Error ? err.message : String(err)
                        console.log(`[agent] code execution failed: ${message}`)
                        return { success: false as const, error: message }
                    }
                },
                toModelOutput: (result) => {
                    if (!result.output.success) {
                        return {
                            type: 'content',
                            value: [
                                {
                                    type: 'text',
                                    text: `Code execution failed: ${result.output.error}\n\nFix the code and try again.`,
                                },
                            ],
                        }
                    }
                    return {
                        type: 'content',
                        value: [
                            { type: 'text', text: 'Code executed. Generated image:' },
                            { type: 'media', data: result.output.imageData, mediaType: 'image/png' },
                        ],
                    }
                },
            }),
        },
        stopWhen: stepCountIs(10),
    })

    console.log(`[agent] completed, steps: ${result.steps.length}`)

    if (lastResult) {
        await storage.save(threadId, lastResult)
    }

    return threadId
}
