import { env } from '@/env'
import { devToolsMiddleware } from '@ai-sdk/devtools'
import { createOpenAI } from '@ai-sdk/openai'
import { wrapLanguageModel } from 'ai'

const openai = createOpenAI({
    apiKey: env.OPENAI_API_KEY,
})

export const gpt52 = wrapLanguageModel({
    model: openai.responses('gpt-5.2'),
    middleware: devToolsMiddleware(),
})
