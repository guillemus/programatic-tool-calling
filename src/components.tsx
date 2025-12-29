import { authClient } from '@/auth-client'
import { QueryProvider, useTRPC } from '@/query-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

export function LogoutButton() {
    async function handleLogout() {
        await authClient.signOut()
        window.location.href = '/'
    }

    return (
        <button onClick={handleLogout} className="btn btn-error">
            Log out
        </button>
    )
}

export function LoginButton() {
    function handleLogin() {
        authClient.signIn.social({ provider: 'github', callbackURL: '/dashboard' })
    }

    return (
        <button onClick={handleLogin} className="btn btn-primary">
            Sign in with GitHub
        </button>
    )
}

export function HomePage() {
    return (
        <main className="min-h-screen bg-base-100 text-base-content">
            <div className="max-w-2xl mx-auto px-6 py-24">
                <h1 className="text-4xl font-bold tracking-tight">Image Editor</h1>
                <p className="mt-4 text-lg text-secondary">
                    Describe what you want. The agent draws it.
                </p>

                <div className="mt-12 space-y-6">
                    <div className="card bg-base-200 border border-neutral">
                        <div className="card-body">
                            <p className="text-sm text-secondary uppercase tracking-wide">
                                Example
                            </p>
                            <p className="text-base-content">"A pelican riding a bicycle"</p>
                        </div>
                    </div>

                    <div className="card bg-base-200 border border-neutral">
                        <div className="card-body">
                            <p className="text-sm text-secondary uppercase tracking-wide">
                                How it works
                            </p>
                            <ol className="list-decimal list-inside space-y-2 text-base-content">
                                <li>You describe an image in natural language</li>
                                <li>The agent writes drawing code using shapes, lines, text</li>
                                <li>Code executes on a 512x512 canvas</li>
                                <li>You get the result</li>
                            </ol>
                        </div>
                    </div>
                </div>

                <div className="mt-12">
                    <LoginButton />
                </div>
            </div>
        </main>
    )
}

function getStatusColor(status: string) {
    if (status === 'completed') return 'badge-success'
    if (status === 'running') return 'badge-warning'
    if (status === 'failed') return 'badge-error'
    return 'badge-ghost'
}

function ThreadCardThumbnail(props: { thumbnail: string | null }) {
    if (props.thumbnail) {
        return (
            <img
                src={`data:image/png;base64,${props.thumbnail}`}
                alt="Generation thumbnail"
                className="w-full aspect-square object-cover rounded mb-2"
            />
        )
    }
    return (
        <div className="w-full aspect-square bg-base-300 rounded mb-2 flex items-center justify-center">
            <span className="text-secondary text-sm">No image</span>
        </div>
    )
}

function ThreadCard(props: {
    id: string
    prompt: string
    status: string
    createdAt: Date | string
    thumbnail: string | null
}) {
    return (
        <a
            href={`/thread/${props.id}`}
            className="card bg-base-200 border border-neutral hover:border-primary transition-colors"
        >
            <div className="card-body p-4">
                <ThreadCardThumbnail thumbnail={props.thumbnail} />
                <p className="text-sm line-clamp-2">{props.prompt}</p>
                <div className="flex items-center justify-between mt-2">
                    <span className={`badge ${getStatusColor(props.status)} badge-sm`}>
                        {props.status}
                    </span>
                    <span className="text-xs text-secondary">
                        {new Date(props.createdAt).toLocaleDateString()}
                    </span>
                </div>
            </div>
        </a>
    )
}

function NewThreadForm(props: { onCreated: (id: string) => void }) {
    const [prompt, setPrompt] = useState('')
    const trpc = useTRPC()
    const queryClient = useQueryClient()

    const createMutation = useMutation({
        ...trpc.createThread.mutationOptions(),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: trpc.listThreads.queryKey() })
            props.onCreated(data.id)
            setPrompt('')
        },
    })

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!prompt.trim()) return
        createMutation.mutate({ prompt: prompt.trim() })
    }

    return (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe an image..."
                className="input input-bordered flex-1"
                disabled={createMutation.isPending}
            />
            <button
                type="submit"
                className="btn btn-primary"
                disabled={createMutation.isPending || !prompt.trim()}
            >
                {createMutation.isPending && 'Creating...'}
                {!createMutation.isPending && 'Generate'}
            </button>
        </form>
    )
}

function ThreadGrid() {
    const trpc = useTRPC()
    const queryClient = useQueryClient()
    const threadsQuery = useQuery(trpc.listThreads.queryOptions())

    const runMutation = useMutation({
        ...trpc.runThread.mutationOptions(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: trpc.listThreads.queryKey() })
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: trpc.listThreads.queryKey() })
        },
    })

    function handleCreated(threadId: string) {
        runMutation.mutate({ threadId })
    }

    if (threadsQuery.isLoading) {
        return <p className="text-secondary">Loading threads...</p>
    }

    if (threadsQuery.isError) {
        return <p className="text-error">Error loading threads</p>
    }

    const threads = threadsQuery.data ?? []

    return (
        <div className="space-y-6">
            <NewThreadForm onCreated={handleCreated} />

            {threads.length === 0 && (
                <p className="text-secondary text-center py-8">
                    No generations yet. Create one above!
                </p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {threads.map((t) => (
                    <ThreadCard
                        key={t.id}
                        id={t.id}
                        prompt={t.prompt}
                        status={t.status}
                        createdAt={t.createdAt}
                        thumbnail={t.thumbnail}
                    />
                ))}
            </div>
        </div>
    )
}

function DashboardContent() {
    const trpc = useTRPC()

    const meQuery = useQuery(trpc.me.queryOptions(undefined))

    if (meQuery.isLoading) {
        return (
            <main className="min-h-screen bg-base-100 text-base-content">
                <div className="max-w-2xl mx-auto px-6 py-24">
                    <p className="text-secondary">Loading...</p>
                </div>
            </main>
        )
    }

    if (meQuery.isError || !meQuery.data) {
        return null
    }

    const user = meQuery.data.user

    return (
        <main className="min-h-screen bg-base-100 text-base-content">
            <div className="max-w-2xl mx-auto px-6 py-24">
                <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
                <p className="mt-4 text-lg text-secondary">Welcome, {user.name || user.email}</p>

                <div className="mt-12">
                    <div className="card bg-base-200 border border-neutral">
                        <div className="card-body">
                            <p className="text-sm text-secondary uppercase tracking-wide">
                                Account
                            </p>
                            <p className="text-base-content">{user.email}</p>
                            {user.image && (
                                <img
                                    src={user.image}
                                    alt="avatar"
                                    className="w-16 h-16 rounded-full mt-4"
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <ThreadGrid />
                </div>

                <div className="mt-12">
                    <LogoutButton />
                </div>
            </div>
        </main>
    )
}

export function DashboardPage() {
    return (
        <QueryProvider>
            <DashboardContent />
        </QueryProvider>
    )
}

function ThreadDetailContent(props: { threadId: string }) {
    const trpc = useTRPC()
    const threadQuery = useQuery({
        ...trpc.getThread.queryOptions({ threadId: props.threadId }),
        refetchInterval: (query) => {
            const data = query.state.data
            if (data?.status === 'running' || data?.status === 'pending') {
                return 5000
            }
            return false
        },
    })

    if (threadQuery.isLoading) {
        return (
            <main className="min-h-screen bg-base-100 text-base-content">
                <div className="max-w-4xl mx-auto px-6 py-24">
                    <p className="text-secondary">Loading...</p>
                </div>
            </main>
        )
    }

    if (threadQuery.isError || !threadQuery.data) {
        return (
            <main className="min-h-screen bg-base-100 text-base-content">
                <div className="max-w-4xl mx-auto px-6 py-24">
                    <p className="text-error">Thread not found</p>
                    <a href="/dashboard" className="btn btn-ghost mt-4">
                        Back to dashboard
                    </a>
                </div>
            </main>
        )
    }

    const thread = threadQuery.data

    function getEmptyMessage(status: string) {
        if (status === 'running' || status === 'pending') return 'Generating...'
        return 'No generations'
    }

    return (
        <main className="min-h-screen bg-base-100 text-base-content">
            <div className="max-w-4xl mx-auto px-6 py-12">
                <a href="/dashboard" className="btn btn-ghost btn-sm mb-6">
                    Back
                </a>

                <div className="flex items-start justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">{thread.prompt}</h1>
                        <p className="text-sm text-secondary mt-1">
                            {new Date(thread.createdAt).toLocaleString()}
                        </p>
                    </div>
                    <span className={`badge ${getStatusColor(thread.status)}`}>
                        {thread.status}
                    </span>
                </div>

                {thread.generations.length === 0 && (
                    <p className="text-secondary text-center py-12">
                        {getEmptyMessage(thread.status)}
                    </p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {thread.generations.map((gen) => (
                        <div key={gen.id} className="card bg-base-200 border border-neutral">
                            <div className="card-body p-3">
                                <img
                                    src={`data:image/png;base64,${gen.imageData}`}
                                    alt={`Step ${gen.stepNumber}`}
                                    className="w-full aspect-square object-cover rounded"
                                />
                                <p className="text-xs text-secondary text-center mt-2">
                                    Step {gen.stepNumber}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    )
}

export function ThreadDetailPage(props: { threadId: string }) {
    return (
        <QueryProvider>
            <ThreadDetailContent threadId={props.threadId} />
        </QueryProvider>
    )
}
