import { auth } from '@/auth'
import { defineMiddleware } from 'astro:middleware'
import type { Session, User } from 'better-auth'

type Locals = {
    user: User | null
    session: Session | null
}

export const onRequest = defineMiddleware(async (context, next) => {
    const session = await auth.api.getSession({
        headers: context.request.headers,
    })

    const locals = context.locals as Locals

    if (session) {
        locals.user = session.user
        locals.session = session.session
    } else {
        locals.user = null
        locals.session = null
    }

    return next()
})
