import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
    OPENAI_API_KEY: z.string(),
    DATABASE_URL: z.string(),
    BETTER_AUTH_SECRET: z.string(),
    BETTER_AUTH_URL: z.string(),
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
})

export const env = envSchema.parse(process.env)
