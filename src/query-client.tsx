import type { AppRouter } from '@/trpc'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TRPCClientError, httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import type { ReactNode } from 'react'

export const trpc = createTRPCReact<AppRouter>()

function handleError(error: unknown) {
    if (error instanceof TRPCClientError) {
        if (error.data?.code === 'UNAUTHORIZED') {
            window.location.href = '/'
        }
    }
}

let queryClient: QueryClient | null = null

function getQueryClient() {
    if (queryClient) {
        return queryClient
    }
    queryClient = new QueryClient({
        queryCache: new QueryCache({
            onError: handleError,
        }),
        defaultOptions: {
            queries: {
                retry: (failureCount, error) => {
                    if (error instanceof TRPCClientError && error.data?.code === 'UNAUTHORIZED') {
                        return false
                    }
                    return failureCount < 3
                },
            },
            mutations: {
                onError: handleError,
            },
        },
    })
    return queryClient
}

let trpcClient: ReturnType<typeof trpc.createClient> | null = null

function getTrpcClient() {
    if (trpcClient) {
        return trpcClient
    }
    trpcClient = trpc.createClient({
        links: [
            httpBatchLink({
                url: '/api/trpc',
            }),
        ],
    })
    return trpcClient
}

export function QueryProvider(props: { children: ReactNode }) {
    return (
        <trpc.Provider client={getTrpcClient()} queryClient={getQueryClient()}>
            <QueryClientProvider client={getQueryClient()}>{props.children}</QueryClientProvider>
        </trpc.Provider>
    )
}
