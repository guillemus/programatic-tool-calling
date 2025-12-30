import { initTRPC, TRPCError } from '@trpc/server'
import { and, desc, eq, isNull } from 'drizzle-orm'
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
            where: and(eq(thread.userId, ctx.user.id), isNull(thread.deletedAt)),
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
                where: and(eq(thread.id, input.threadId), isNull(thread.deletedAt)),
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
                console.error(`[runThread ${input.threadId}] error:`, error)
                await db
                    .update(thread)
                    .set({ status: 'failed' })
                    .where(eq(thread.id, input.threadId))
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    cause: error,
                })
            }
        }),

    deleteThread: authedProcedure
        .input(z.object({ threadId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const t = await db.query.thread.findFirst({
                where: and(eq(thread.id, input.threadId), isNull(thread.deletedAt)),
            })
            if (!t || t.userId !== ctx.user.id) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Thread not found' })
            }
            await db
                .update(thread)
                .set({ deletedAt: new Date() })
                .where(eq(thread.id, input.threadId))
            return { success: true }
        }),

    continueFromGeneration: authedProcedure
        .input(z.object({ generationId: z.string(), prompt: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            // Get the generation with its thread
            const gen = await db.query.generation.findFirst({
                where: eq(generation.id, input.generationId),
                with: { thread: true },
            })
            if (!gen || gen.thread.userId !== ctx.user.id) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Generation not found' })
            }
            if (gen.thread.status === 'running') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Thread already running' })
            }

            try {
                await simpleImageEditorAgent(input.prompt, {
                    threadId: gen.threadId,
                    initialCode: gen.code,
                    initialImage: gen.imageData,
                })
                return { status: 'completed' }
            } catch (error) {
                console.error(`[continueFromGeneration ${input.generationId}] error:`, error)
                await db.update(thread).set({ status: 'failed' }).where(eq(thread.id, gen.threadId))
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    cause: error,
                })
            }
        }),
})

export type AppRouter = typeof appRouter
