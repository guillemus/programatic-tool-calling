import { devToolsMiddleware } from '@ai-sdk/devtools'
import { generateText, hasToolCall, tool, wrapLanguageModel, zodSchema } from 'ai'
import { z } from 'zod'
import { executeCode, getInterfaceDocumentation } from './executor'
import { gpt52 } from '../providers'

function getModel() {
    return wrapLanguageModel({ model: gpt52, middleware: devToolsMiddleware() })
}

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
    const interfaceDocs = await getInterfaceDocumentation()

    const systemPrompt = `You are a code search assistant. You write JavaScript code to explore codebases and answer questions.

Target directory: ${rootDir}

${interfaceDocs}

ADDITIONAL METHOD:
- search.setAnswer(text: string) - Set the final answer to return to the user

WORKFLOW:
1. Analyze the question
2. Write code to search the codebase (list files, grep, read files)
3. Based on results, either refine your search or call setAnswer with your findings
4. When you have enough information, call the finish tool

IMPORTANT:
- Each code execution is independent (no state between executions)
- Use search.setAnswer() to store your findings before finishing
- Combine operations efficiently (e.g. grep then read matching files)
- All methods are async, use await`

    const result = await generateText({
        model: getModel(),
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
                    const result = await executeCode(code, rootDir)
                    return result
                },
                toModelOutput: (result: { toolCallId: string; input: unknown; output: any }) => {
                    const { answer, filesRead, searchesPerformed } = result.output
                    let text = `Searches performed: ${searchesPerformed}\nFiles read: ${filesRead.length > 0 ? filesRead.join(', ') : 'none'}`
                    if (answer) {
                        text += `\n\nAnswer set: ${answer}`
                    }
                    return { type: 'text' as const, value: text }
                },
            }),
            finish: tool({
                description: 'Call when you have found the answer to the question',
                inputSchema: zodSchema(
                    z.object({
                        answer: z.string().describe('The final answer to the question'),
                    }),
                ),
                execute: async ({ answer }) => {
                    console.log(`\n=== ANSWER ===\n${answer}\n`)
                    return { done: true, answer }
                },
            }),
        },
        stopWhen: hasToolCall('finish'),
        onStepFinish: ({ toolResults }) => {
            for (const result of toolResults ?? []) {
                if (result.toolName === 'executeCode') {
                    const output = result.output as {
                        filesRead: string[]
                        searchesPerformed: number
                    }
                    console.log(
                        `[Search] ${output.searchesPerformed} searches, ${output.filesRead.length} files read`,
                    )
                }
            }
        },
    })

    console.log(`Total steps: ${result.steps.length}`)

    const lastFinish = result.steps
        .flatMap((s) => s.toolResults ?? [])
        .findLast((r) => r.toolName === 'finish')

    if (lastFinish) {
        return (lastFinish.output as { answer: string }).answer
    }

    return result.text
}
