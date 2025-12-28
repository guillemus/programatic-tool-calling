import { gpt52 } from '@/providers'
import { generateText, stepCountIs, tool } from 'ai'
import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'
import { executeCode, getInterfaceDocumentation, loadImage } from './executor'

/**
 * Image Edit Agent Algorithm:
 *
 * 1. Original image is IMMUTABLE - never modified
 * 2. Agent writes code that draws ALL annotations at once
 * 3. Code is executed on a fresh copy of the original (pure function)
 * 4. Result is saved and shown to the agent
 * 5. If wrong, agent REWRITES the entire code (not appends)
 * 6. Repeat until satisfied
 *
 * Each iteration: originalBuffer + code → resultBuffer
 * No mutable state between executions.
 */
export async function imageEditorAgent(inputPath: string, instruction: string) {
    const { buffer: originalBuffer, metadata } = await loadImage(inputPath)
    const { width, height } = metadata
    const interfaceDocs = await getInterfaceDocumentation()

    const outputDir = './data/debug'
    await fs.mkdir(outputDir, { recursive: true })
    let stepCount = 0

    const systemPrompt = `You are an image annotation assistant. You write JavaScript code to draw on images.

Image: ${width}x${height} pixels. Origin (0,0) is TOP-LEFT. X increases rightward, Y increases downward.

${interfaceDocs}

WORKFLOW:
1. Analyze the image, estimate pixel coordinates of target elements
2. Write code that draws ALL annotations in one execution
3. CRITICALLY examine the result image - look for misalignment, clipping, overlap
4. If ANYTHING is wrong, identify the specific problem, adjust coordinates, and rewrite
5. Iterate until the result is correct. Only then respond with a text summary.

SELF-CORRECTION:
After each execution, ask yourself:
- Are shapes positioned exactly where intended?
- Do annotations touch or overlap content they shouldn't?
- Are the coordinates off? By how much? In which direction?
Then fix the specific issues with adjusted coordinates.

RULES:
- Each execution starts fresh from the ORIGINAL image
- To fix anything, rewrite the entire code with corrected values
- All draw methods are async, use await`

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
                    { type: 'image', image: originalBuffer },
                ],
            },
        ],
        tools: {
            executeCode: tool({
                description:
                    'Execute JavaScript code to draw on the image. Returns the updated image.',
                inputSchema: z.object({
                    code: z.string().describe('JavaScript code using the ImageEditor API'),
                }),
                execute: async ({ code }) => {
                    const buffer = await executeCode(code, originalBuffer, metadata)
                    return { buffer, imageData: buffer.toString('base64') }
                },
                toModelOutput: (result) => ({
                    type: 'content',
                    value: [
                        { type: 'text', text: 'Code executed. Updated image:' },
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
                    const stepPath = `${outputDir}/step-${stepCount}.png`
                    const output = result.output as { buffer: Buffer }
                    await fs.writeFile(stepPath, output.buffer)
                    console.log(`[Step ${stepCount}] Saved: ${stepPath}`)
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

    const ext = path.extname(inputPath)
    const baseName = path.basename(inputPath, ext)
    const outputPath = `./data/${baseName}-edited${ext}`

    if (lastExecuteResult) {
        const output = lastExecuteResult.output as { buffer: Buffer }
        await fs.writeFile(outputPath, output.buffer)
        console.log(`Saved to ${outputPath}`)
    } else {
        console.log('No code was executed, no output saved')
    }

    return outputPath
}
