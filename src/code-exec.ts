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
    /** Parent generation ID (null for new thread, genId for branching) */
    parentId: string | null
    /** Canvas size in pixels. Defaults to 512 */
    canvasSize?: number
    /** Initial code to start from (for continuing from existing generation) */
    initialCode?: string
    /** Initial image data base64 (for continuing from existing generation) */
    initialImage?: string
}

export async function simpleImageEditorAgent(
    instruction: string,
    options: SimpleImageEditorOptions,
) {
    const { threadId, parentId, initialCode, initialImage } = options
    const canvasSize = options.canvasSize ?? 512

    console.log(`[agent ${threadId}] starting`)

    // Update thread status to running
    await db.update(thread).set({ status: 'running' }).where(eq(thread.id, threadId))

    let lastGenerationId: string | null = parentId

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

    const messages: Parameters<typeof generateText>[0]['messages'] = []

    if (initialCode && initialImage) {
        // Continuing from existing generation
        messages.push({
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: 'Here is the current code and image. Modify it according to my next instruction.',
                },
                { type: 'text', text: `Current code:\n\`\`\`javascript\n${initialCode}\n\`\`\`` },
                { type: 'image', image: Buffer.from(initialImage, 'base64') },
                { type: 'text', text: `Instruction: ${instruction}` },
            ],
        })
    } else {
        messages.push({
            role: 'user',
            content: instruction,
        })
    }

    const result = await generateText({
        model: gpt52,
        system: systemPrompt,
        messages,
        tools: {
            executeCode: tool({
                description:
                    'Execute JavaScript code to create an image using the DrawingContext API. Returns the generated image.',
                inputSchema: z.object({
                    code: z.string().describe('JavaScript code using the DrawingContext API'),
                }),
                execute: async ({ code }) => {
                    console.log(`[agent ${threadId}] executing code`)
                    const buffer = await executeCode(code, canvasSize)
                    return { code, buffer, imageData: buffer.toString('base64') }
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
                    const output = result.output as {
                        code: string
                        buffer: Buffer
                        imageData: string
                    }
                    const genId = nanoid()
                    await db.insert(generation).values({
                        id: genId,
                        threadId,
                        parentId: lastGenerationId,
                        type: 'debug',
                        prompt: instruction,
                        code: output.code,
                        imageData: output.imageData,
                    })
                    lastGenerationId = genId
                    console.log(`[${threadId}] Generation ${genId} saved to DB`)
                }
            }
        },
    })

    console.log(`[agent ${threadId}] completed, steps: ${result.steps.length}`)

    // Mark last generation as final
    if (lastGenerationId && lastGenerationId !== parentId) {
        await db
            .update(generation)
            .set({ type: 'final' })
            .where(eq(generation.id, lastGenerationId))
    }

    // Update thread status
    await db.update(thread).set({ status: 'completed' }).where(eq(thread.id, threadId))

    return threadId
}
