import { env } from '@/env'
import { devToolsMiddleware } from '@ai-sdk/devtools'
import { createOpenAI } from '@ai-sdk/openai'
import { wrapLanguageModel } from 'ai'

const openai = createOpenAI({
    apiKey: env.OPENAI_API_KEY,
})

const openrouter = createOpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
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

export const gemini3flash = wrapLanguageModel({
    model: openrouter.chat('google/gemini-3-flash-preview'),
    middleware: middlewares,
})
