import type { AppRouter } from '@/trpc'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TRPCClientError, createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCContext } from '@trpc/tanstack-react-query'
import type { ReactNode } from 'react'

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()

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

let trpcClient: ReturnType<typeof createTRPCClient<AppRouter>> | null = null

function getTrpcClient() {
    if (trpcClient) {
        return trpcClient
    }
    trpcClient = createTRPCClient<AppRouter>({
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
        <TRPCProvider trpcClient={getTrpcClient()} queryClient={getQueryClient()}>
            <QueryClientProvider client={getQueryClient()}>{props.children}</QueryClientProvider>
        </TRPCProvider>
    )
}
