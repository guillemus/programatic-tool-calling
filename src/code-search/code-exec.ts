import { generateText, stepCountIs, tool, zodSchema } from 'ai'
import { z } from 'zod'
import { gpt52 } from '../providers'
import { executeCode, getInterface } from './executor'

/**
 * Code Search Agent using code execution approach:
 *
 * 1. Agent writes JavaScript code to search the codebase
 * 2. Code is executed against the target directory
 * 3. Results (files found, grep matches, file contents) are returned
 * 4. Agent can refine search or provide final answer
 *
 * Benefits over tool calls:
 * - Can compose multiple operations in one execution
 * - Can use loops, conditionals, and variables
 * - More efficient for complex multi-step searches
 */
export async function codeSearchAgent(rootDir: string, question: string) {
    const interfaceDocs = await getInterface()

    const systemPrompt = `You are a code search assistant. You write JavaScript code to explore codebases and answer questions.

Target directory: ${rootDir}

${interfaceDocs}

WORKFLOW:
1. Analyze the question
2. Write code to search the codebase (list files, grep, read files)
3. Based on results, either refine your search or respond with your findings
4. When you have enough information, respond with a text answer (do NOT call any tools)

IMPORTANT:
- Each code execution is independent (no state between executions)
- Combine operations efficiently (e.g. grep then read matching files)
- All methods are async, use await`

    const result = await generateText({
        model: gpt52,
        system: systemPrompt,
        messages: [
            {
                role: 'user',
                content: question,
            },
        ],
        tools: {
            executeCode: tool({
                description:
                    'Execute JavaScript code to search the codebase. Returns search results.',
                inputSchema: zodSchema(
                    z.object({
                        code: z.string().describe('JavaScript code using the CodeSearch API'),
                    }),
                ),
                execute: async ({ code }) => {
                    console.log('\n┌─ Executing Code ─────────────────────────────────')
                    console.log(
                        code
                            .split('\n')
                            .map((line) => '│ ' + line)
                            .join('\n'),
                    )
                    console.log('└──────────────────────────────────────────────────\n')
                    const result = await executeCode(code, rootDir)
                    return result
                },
            }),
        },
        stopWhen: stepCountIs(20),
    })

    console.log(`Total steps: ${result.steps.length}`)

    return result.text
}
