import { appRouter, createContext } from '@/trpc'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import type { APIRoute } from 'astro'

export const prerender = false

export const ALL: APIRoute = async ({ request }) => {
    return fetchRequestHandler({
        endpoint: '/api/trpc',
        req: request,
        router: appRouter,
        createContext: () => createContext(request),
        onError: ({ path, error }) => {
            console.error(`[trpc ${path}] ${error.code}: ${error.message}`)
            if (error.cause) {
                console.error(`[trpc ${path}] cause:`, error.cause)
            }
        },
    })
}
