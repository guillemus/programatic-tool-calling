import { initTRPC, TRPCError } from '@trpc/server'
import { desc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { auth } from './auth'
import { simpleImageEditorAgent } from './code-exec'
import { db } from './db'
import { generation, thread } from './schema'

export class UnauthorizedError extends TRPCError {
    constructor(message = 'Not authenticated') {
        super({ code: 'UNAUTHORIZED', message })
        this.name = 'UnauthorizedError'
    }
}

export type Context = {
    user: typeof auth.$Infer.Session.user | null
}

export async function createContext(request: Request): Promise<Context> {
    const session = await auth.api.getSession({ headers: request.headers })
    return { user: session?.user ?? null }
}

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

export const authedProcedure = publicProcedure.use(({ ctx, next }) => {
    if (!ctx.user) {
        throw new UnauthorizedError()
    }
    return next({ ctx: { user: ctx.user } })
})

export const appRouter = router({
    hello: publicProcedure.input(z.object({ name: z.string() })).query(({ input }) => {
        return { greeting: `Hello ${input.name}` }
    }),
    me: authedProcedure.query(({ ctx }) => {
        return { user: ctx.user }
    }),

    listThreads: authedProcedure.query(async ({ ctx }) => {
        const threads = await db.query.thread.findMany({
            where: eq(thread.userId, ctx.user.id),
            orderBy: desc(thread.createdAt),
            with: {
                generations: {
                    orderBy: desc(generation.stepNumber),
                    limit: 1,
                },
            },
        })
        return threads.map((t) => ({
            id: t.id,
            prompt: t.prompt,
            status: t.status,
            createdAt: t.createdAt,
            thumbnail: t.generations[0]?.imageData ?? null,
        }))
    }),

    getThread: authedProcedure
        .input(z.object({ threadId: z.string() }))
        .query(async ({ ctx, input }) => {
            const t = await db.query.thread.findFirst({
                where: eq(thread.id, input.threadId),
                with: {
                    generations: {
                        orderBy: generation.stepNumber,
                    },
                },
            })
            if (!t || t.userId !== ctx.user.id) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Thread not found' })
            }
            return t
        }),

    createThread: authedProcedure
        .input(z.object({ prompt: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            const id = nanoid()
            await db.insert(thread).values({
                id,
                userId: ctx.user.id,
                prompt: input.prompt,
                status: 'pending',
            })
            return { id }
        }),

    runThread: authedProcedure
        .input(z.object({ threadId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const t = await db.query.thread.findFirst({
                where: eq(thread.id, input.threadId),
            })
            if (!t || t.userId !== ctx.user.id) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Thread not found' })
            }
            if (t.status === 'running') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Thread already running' })
            }

            try {
                await simpleImageEditorAgent(t.prompt, { threadId: input.threadId })
                return { status: 'completed' }
            } catch (error) {
                await db
                    .update(thread)
                    .set({ status: 'failed' })
                    .where(eq(thread.id, input.threadId))
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                })
            }
        }),
})

export type AppRouter = typeof appRouter
