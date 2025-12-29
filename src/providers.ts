import { env } from '@/env'
import { devToolsMiddleware } from '@ai-sdk/devtools'
import { createOpenAI } from '@ai-sdk/openai'
import { wrapLanguageModel } from 'ai'

const openai = createOpenAI({
    apiKey: env.OPENAI_API_KEY,
})

let middlewares = []
if (import.meta.env.DEV) {
    // devTools fills a .devtools/ folder, which on production is problematic
    middlewares.push(devToolsMiddleware())
}

export const gpt52 = wrapLanguageModel({
    model: openai.responses('gpt-5.2'),
    middleware: middlewares,
})
