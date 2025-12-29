import * as schema from '@/schema'
import { attachDatabasePool } from '@vercel/functions'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { env } from './env'

const pool = new Pool({
    connectionString: env.DATABASE_URL,
    idleTimeoutMillis: 5000,
    max: 10,
})

attachDatabasePool(pool)

export const db = drizzle(pool, { schema })
