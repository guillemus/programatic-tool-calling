import { initTRPC, TRPCError } from '@trpc/server'
import { z } from 'zod'
import { auth } from './auth'

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
        throw new TRPCError({ code: 'UNAUTHORIZED' })
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
})

export type AppRouter = typeof appRouter
