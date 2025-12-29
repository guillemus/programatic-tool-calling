import type { APIRoute } from "astro"
import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { appRouter } from "@/trpc"

export const ALL: APIRoute = async ({ request }) => {
    return fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext: () => ({}),
    })
}
