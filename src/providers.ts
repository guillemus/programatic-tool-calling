import { devToolsMiddleware } from '@ai-sdk/devtools'
import { createOpenAI } from '@ai-sdk/openai'
import { wrapLanguageModel } from 'ai'
import { env } from './env'

const openai = createOpenAI({
    apiKey: env.OPENAI_API_KEY,
})

export const gpt52 = wrapLanguageModel({
    model: openai.responses('gpt-5'),
    middleware: [
        devToolsMiddleware(),
        {
            specificationVersion: 'v3',
            transformParams: async ({ params }) => ({
                ...params,
                providerOptions: {
                    ...params.providerOptions,
                    openai: {
                        ...params.providerOptions?.openai,
                        reasoningEffort: 'minimal',
                    },
                },
            }),
        },
    ],
})
