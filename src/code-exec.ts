import { db } from '@/db'
import { executeCode } from '@/executor'
import { gpt52 } from '@/providers'
import { generation, thread } from '@/schema'
import { generateText, stepCountIs, tool } from 'ai'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
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
    /** Thread ID to save generations to */
    threadId: string
    /** Canvas size in pixels. Defaults to 512 */
    canvasSize?: number
}

export async function simpleImageEditorAgent(
    instruction: string,
    options: SimpleImageEditorOptions,
) {
    const { threadId } = options
    const canvasSize = options.canvasSize ?? 512

    // Update thread status to running
    await db.update(thread).set({ status: 'running' }).where(eq(thread.id, threadId))

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
                    const output = result.output as { buffer: Buffer; imageData: string }
                    await db.insert(generation).values({
                        id: nanoid(),
                        threadId,
                        stepNumber: stepCount,
                        imageData: output.imageData,
                    })
                    console.log(`[${threadId}] Step ${stepCount} saved to DB`)
                }
            }
        },
    })

    console.log(`Final response: ${result.text}`)
    console.log(`Total steps: ${result.steps.length}`)

    // Update thread status
    await db.update(thread).set({ status: 'completed' }).where(eq(thread.id, threadId))

    return threadId
}
