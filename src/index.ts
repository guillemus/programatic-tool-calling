import { codeExecAgent } from '@/image-editor/code-exec'
import { toolCallAgent } from '@/image-editor/tool-call'
import { codeSearchAgent } from '@/code-search/code-exec'

// Image editor example
const imageInputPath = './data/image.png'
const imageInstruction =
    'Draw a rectangle around the Drizzle ORM reply at the bottom, then draw an arrow pointing from it up to the main PlanetScale post'

// Code search example
const codebaseDir = '/Users/guillem/repos/ai-sdk'
const searchQuestion = 'How do I use streamText with tool calls? Show me the relevant API.'

// Switch between approaches:
// await codeExecAgent(imageInputPath, imageInstruction)
// await toolCallAgent(imageInputPath, imageInstruction)
await codeSearchAgent(codebaseDir, searchQuestion)
