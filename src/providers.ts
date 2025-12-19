import { createOpenAI } from '@ai-sdk/openai'
import { env } from './env'

const openai = createOpenAI({
    apiKey: env.OPENAI_API_KEY,
})

export const gpt52 = openai('gpt-5.2')
