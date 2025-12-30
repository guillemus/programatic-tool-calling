import { authClient } from '@/auth-client'
import { QueryProvider, useTRPC } from '@/query-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

function ProfileDropdown(props: { email: string; image: string | null }) {
    const [open, setOpen] = useState(false)

    async function handleLogout() {
        await authClient.signOut()
        window.location.href = '/'
    }

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
            >
                {props.image ? (
                    <img src={props.image} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-base-300 flex items-center justify-center text-sm">
                        {props.email[0].toUpperCase()}
                    </div>
                )}
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-12 z-50 bg-base-200 border border-neutral rounded-lg shadow-lg p-4 min-w-60">
                        <div className="flex items-center gap-3 mb-4">
                            {props.image ? (
                                <img
                                    src={props.image}
                                    alt="avatar"
                                    className="w-10 h-10 rounded-full"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-base-300 flex items-center justify-center">
                                    {props.email[0].toUpperCase()}
                                </div>
                            )}
                            <p className="text-sm text-secondary truncate">{props.email}</p>
                        </div>
                        <button onClick={handleLogout} className="btn btn-error btn-sm w-full">
                            Log out
                        </button>
                    </div>
                </>
            )}
        </div>
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

function ThreadGridContent() {
    const trpc = useTRPC()
    const threadsQuery = useQuery(trpc.listThreads.queryOptions())

    if (threadsQuery.isLoading) {
        return <p className="text-secondary">Loading threads...</p>
    }

    if (threadsQuery.isError) {
        return <p className="text-error">Error loading threads</p>
    }

    const threads = threadsQuery.data ?? []

    if (threads.length === 0) {
        return (
            <p className="text-secondary text-center py-12">
                No generations yet. Describe an image below to get started.
            </p>
        )
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
    )
}

function NewThreadFormStandalone() {
    const [prompt, setPrompt] = useState('')
    const trpc = useTRPC()
    const queryClient = useQueryClient()

    const createMutation = useMutation({
        ...trpc.createThread.mutationOptions(),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: trpc.listThreads.queryKey() })
            runMutation.mutate({ threadId: data.id })
            setPrompt('')
        },
    })

    const runMutation = useMutation({
        ...trpc.runThread.mutationOptions(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: trpc.listThreads.queryKey() })
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: trpc.listThreads.queryKey() })
        },
    })

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!prompt.trim()) return
        createMutation.mutate({ prompt: prompt.trim() })
    }

    const isPending = createMutation.isPending || runMutation.isPending

    return (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe an image..."
                className="input input-bordered flex-1"
                disabled={isPending}
            />
            <button
                type="submit"
                className="btn btn-primary"
                disabled={isPending || !prompt.trim()}
            >
                {isPending ? 'Creating...' : 'Generate'}
            </button>
        </form>
    )
}

function DashboardContent() {
    const trpc = useTRPC()

    const meQuery = useQuery(trpc.me.queryOptions(undefined))

    if (meQuery.isLoading) {
        return (
            <main className="min-h-screen bg-base-100 text-base-content">
                <div className="max-w-4xl mx-auto px-6 py-24">
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
        <main className="min-h-screen bg-base-100 text-base-content flex flex-col">
            <header className="border-b border-neutral px-6 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-sm text-secondary">Welcome, {user.name || user.email}</p>
                </div>
                <ProfileDropdown email={user.email} image={user.image ?? null} />
            </header>

            <div className="flex-1 overflow-auto pb-24">
                <div className="max-w-4xl mx-auto px-6 py-8">
                    <ThreadGridContent />
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-neutral px-6 py-4">
                <div className="max-w-4xl mx-auto">
                    <NewThreadFormStandalone />
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
    const [selectedGenId, setSelectedGenId] = useState<string | null>(null)
    const [prompt, setPrompt] = useState('')
    const trpc = useTRPC()
    const queryClient = useQueryClient()

    const threadQuery = useQuery({
        ...trpc.getThread.queryOptions({ threadId: props.threadId }),
        refetchInterval: (query) => {
            const data = query.state.data
            if (data?.status === 'running' || data?.status === 'pending') {
                return 2000
            }
            return false
        },
    })

    const continueMutation = useMutation({
        ...trpc.continueFromGeneration.mutationOptions(),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: trpc.getThread.queryKey({ threadId: props.threadId }),
            })
            setPrompt('')
            setSelectedGenId(null)
        },
        onError: () => {
            queryClient.invalidateQueries({
                queryKey: trpc.getThread.queryKey({ threadId: props.threadId }),
            })
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
    const isRunning = thread.status === 'running' || thread.status === 'pending'

    function handleImageClick(genId: string) {
        if (isRunning) return
        setSelectedGenId(genId === selectedGenId ? null : genId)
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!selectedGenId || !prompt.trim() || isRunning) return
        continueMutation.mutate({ generationId: selectedGenId, prompt: prompt.trim() })
    }

    return (
        <main className="min-h-screen bg-base-100 text-base-content flex flex-col">
            <header className="border-b border-neutral px-6 py-4">
                <div className="max-w-4xl mx-auto">
                    <a href="/dashboard" className="btn btn-ghost btn-sm mb-4">
                        Back
                    </a>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">{thread.prompt}</h1>
                            <p className="text-sm text-secondary mt-1">
                                {new Date(thread.createdAt).toLocaleString()}
                            </p>
                        </div>
                        {isRunning && (
                            <span className="loading loading-spinner loading-md text-primary" />
                        )}
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-auto pb-24">
                <div className="max-w-4xl mx-auto px-6 py-8">
                    {thread.generations.length === 0 && (
                        <p className="text-secondary text-center py-12">
                            {isRunning ? 'Generating...' : 'No generations'}
                        </p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {thread.generations.map((gen) => (
                            <button
                                key={gen.id}
                                type="button"
                                onClick={() => handleImageClick(gen.id)}
                                disabled={isRunning}
                                className={`card bg-base-200 border-2 transition-colors ${
                                    selectedGenId === gen.id
                                        ? 'border-primary'
                                        : 'border-neutral hover:border-secondary'
                                } ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
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
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-neutral px-6 py-4">
                <div className="max-w-4xl mx-auto">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={
                                selectedGenId
                                    ? 'Describe the changes...'
                                    : 'Click an image to edit it'
                            }
                            className="input input-bordered flex-1"
                            disabled={!selectedGenId || isRunning || continueMutation.isPending}
                        />
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={
                                !selectedGenId ||
                                !prompt.trim() ||
                                isRunning ||
                                continueMutation.isPending
                            }
                        >
                            {continueMutation.isPending ? 'Editing...' : 'Edit'}
                        </button>
                    </form>
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
