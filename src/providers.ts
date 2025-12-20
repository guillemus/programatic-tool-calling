import { devToolsMiddleware } from '@ai-sdk/devtools'
import { createOpenAI } from '@ai-sdk/openai'
import { LanguageModel, wrapLanguageModel } from 'ai'
import { env } from './env'

const openai = createOpenAI({
    apiKey: env.OPENAI_API_KEY,
})

export const gpt52 = wrap(openai('gpt-5.2'))

function wrap(m: LanguageModel) {
    return wrapLanguageModel({ model: m as any, middleware: devToolsMiddleware() })
}
