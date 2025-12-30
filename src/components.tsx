import { authClient } from '@/auth-client'
import { QueryProvider, useTRPC } from '@/query-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    ArrowLeft,
    Bug,
    ChevronDown,
    ChevronLeft,
    ChevronUp,
    Code,
    GitBranch,
    Image,
    Plus,
    X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

// =============================================================================
// TYPES
// =============================================================================

type Generation = {
    id: string
    threadId: string
    parentId: string | null
    type: string
    prompt: string | null
    code: string
    imageData: string
    createdAt: string
}

// =============================================================================
// HELPERS
// =============================================================================

function getFinalGenerations(generations: Generation[]): Generation[] {
    return generations.filter((g) => g.type === 'final')
}

function getDebugChain(generations: Generation[], finalGen: Generation): Generation[] {
    const chain: Generation[] = []
    let current: Generation | undefined = finalGen
    while (current) {
        const parent = generations.find((g) => g.id === current!.parentId)
        if (parent && parent.type === 'debug') {
            chain.unshift(parent)
        }
        current = parent
    }
    return chain
}

function getChildCount(generations: Generation[], genId: string): number {
    return generations.filter((g) => g.parentId === genId).length
}

function formatRelative(date: Date | string): string {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return mins + 'm ago'
    const hours = Math.floor(mins / 60)
    if (hours < 24) return hours + 'h ago'
    const days = Math.floor(hours / 24)
    return days + 'd ago'
}

function getStatusDotClass(status: string): string {
    if (status === 'completed') return 'bg-success'
    if (status === 'running') return 'bg-warning'
    if (status === 'failed') return 'bg-error'
    return 'bg-secondary'
}

function getStatusColor(status: string): string {
    if (status === 'completed') return 'text-success'
    if (status === 'running') return 'text-warning'
    if (status === 'failed') return 'text-error'
    return 'text-secondary'
}

// =============================================================================
// UTILITY COMPONENTS
// =============================================================================

function StatusDot(props: { status: string }) {
    const isPulsing = props.status === 'running' || props.status === 'pending'
    const dotClass = getStatusDotClass(props.status)
    const pulseClass = isPulsing ? 'animate-pulse' : ''
    return <span className={`w-2 h-2 rounded-full ${dotClass} ${pulseClass}`} />
}

function StatusBadge(props: { status: string }) {
    return (
        <span className={`flex items-center gap-1.5 ${getStatusColor(props.status)}`}>
            <StatusDot status={props.status} />
            <span className="capitalize">{props.status}</span>
        </span>
    )
}

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
                    <div className="absolute right-0 top-12 z-50 bg-base-200 border border-base-300 rounded-lg shadow-lg p-4 min-w-60">
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
                    <div className="card bg-base-200 border border-base-300">
                        <div className="card-body">
                            <p className="text-sm text-secondary uppercase tracking-wide">
                                Example
                            </p>
                            <p className="text-base-content">"A pelican riding a bicycle"</p>
                        </div>
                    </div>

                    <div className="card bg-base-200 border border-base-300">
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

// =============================================================================
// CARD COMPONENTS
// =============================================================================

function ThreadThumbnail(props: { imageData: string | null }) {
    if (props.imageData) {
        return (
            <img
                src={`data:image/png;base64,${props.imageData}`}
                alt=""
                className="w-full h-full object-cover"
            />
        )
    }
    return (
        <div className="w-full h-full bg-base-300 flex items-center justify-center">
            <Image size={32} className="text-secondary/30" />
        </div>
    )
}

function NewThreadCard(props: { onClick: () => void }) {
    return (
        <a
            href="/thread/new"
            onClick={(e) => {
                e.preventDefault()
                props.onClick()
            }}
            className="group block bg-base-200 rounded-xl overflow-hidden transition-colors hover:bg-base-300 border-2 border-dashed border-base-300 hover:border-primary/50"
        >
            <div className="aspect-[4/3] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-base-300 group-hover:bg-primary/20 flex items-center justify-center mx-auto mb-3 transition-colors">
                        <Plus
                            size={24}
                            className="text-secondary group-hover:text-primary transition-colors"
                        />
                    </div>
                    <span className="text-sm text-secondary group-hover:text-primary transition-colors">
                        New generation
                    </span>
                </div>
            </div>
        </a>
    )
}

function ThreadCard(props: {
    id: string
    prompt: string
    status: string
    createdAt: Date | string
    thumbnail: string | null
    finalCount: number
    onSelect: (threadId: string) => void
}) {
    function handleClick(e: React.MouseEvent) {
        e.preventDefault()
        props.onSelect(props.id)
    }

    return (
        <a
            href={`/thread/${props.id}`}
            onClick={handleClick}
            className="group block bg-base-200 rounded-xl overflow-hidden transition-colors hover:bg-base-300"
        >
            <div className="aspect-[4/3] overflow-hidden">
                <ThreadThumbnail imageData={props.thumbnail} />
            </div>
            <div className="p-3">
                <p className="text-sm font-medium line-clamp-2 leading-snug mb-2 group-hover:text-primary transition-colors">
                    {props.prompt}
                </p>
                <div className="flex items-center justify-between text-xs">
                    <StatusBadge status={props.status} />
                    <span className="text-secondary">{formatRelative(props.createdAt)}</span>
                </div>
                {props.finalCount > 0 && (
                    <div className="mt-2 pt-2 border-t border-base-300 text-xs text-secondary">
                        {props.finalCount} generation{props.finalCount > 1 ? 's' : ''}
                    </div>
                )}
            </div>
        </a>
    )
}

function GenerationNode(props: {
    generation: Generation
    childCount: number
    isRunning: boolean
    onSelect: (gen: Generation) => void
}) {
    const gen = props.generation
    const isDisabled = props.isRunning
    const hasChildren = props.childCount > 1

    function handleClick() {
        if (!isDisabled) {
            props.onSelect(gen)
        }
    }

    const disabledClass = isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isDisabled}
            className={`w-full bg-base-200 rounded-xl overflow-hidden transition-colors hover:bg-base-300 ${disabledClass} relative`}
        >
            {hasChildren && (
                <div
                    className="absolute top-2 right-2 z-10 bg-base-100/80 rounded-full p-1"
                    title="Has branches"
                >
                    <GitBranch size={12} className="text-primary" />
                </div>
            )}
            <div className="aspect-square">
                {gen.imageData ? (
                    <img
                        src={`data:image/png;base64,${gen.imageData}`}
                        alt=""
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-base-300 flex items-center justify-center">
                        <span className="text-secondary/50 text-xs">No image</span>
                    </div>
                )}
            </div>
            <div className="p-3 text-left">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-primary">Final</span>
                    <span className="text-xs text-secondary">{formatRelative(gen.createdAt)}</span>
                </div>
            </div>
        </button>
    )
}

function DebugStepItem(props: { generation: Generation; onSelect: (gen: Generation) => void }) {
    const gen = props.generation
    return (
        <div
            className="flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer hover:bg-base-200"
            onClick={() => props.onSelect(gen)}
        >
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-base-300 flex-shrink-0">
                {gen.imageData ? (
                    <img
                        src={`data:image/png;base64,${gen.imageData}`}
                        alt=""
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-secondary/50">
                        ?
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <span className="text-xs text-warning font-medium">Debug</span>
                <p className="text-xs text-secondary truncate">{formatRelative(gen.createdAt)}</p>
            </div>
        </div>
    )
}

// =============================================================================
// MODAL COMPONENT
// =============================================================================

function GenerationModal(props: {
    generation: Generation | null
    allGenerations: Generation[]
    onClose: () => void
    onEdit: (baseGen: Generation, prompt: string) => void
    isEditing?: boolean
}) {
    const modalRef = useRef<HTMLDialogElement>(null)
    const [editPrompt, setEditPrompt] = useState('')
    const [showDebug, setShowDebug] = useState(false)
    const [viewingGen, setViewingGen] = useState<Generation | null>(null)

    const displayGen = viewingGen || props.generation

    useEffect(() => {
        if (props.generation) {
            modalRef.current?.showModal()
            setViewingGen(null)
            setShowDebug(false)
        } else {
            modalRef.current?.close()
        }
    }, [props.generation])

    function handleClose() {
        props.onClose()
        setViewingGen(null)
        setShowDebug(false)
    }

    function handleEditSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!editPrompt.trim() || !displayGen) return
        props.onEdit(displayGen, editPrompt.trim())
        setEditPrompt('')
    }

    function handleViewDebug(gen: Generation) {
        setViewingGen(gen)
    }

    function handleBackToFinal() {
        setViewingGen(null)
    }

    if (!props.generation) {
        return <dialog ref={modalRef} className="modal" />
    }

    const debugChain = getDebugChain(props.allGenerations, props.generation)
    const isViewingDebug = viewingGen !== null

    return (
        <dialog ref={modalRef} className="modal" onClose={handleClose}>
            <div className="modal-box max-w-5xl p-0">
                <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
                    <div className="flex items-center gap-3">
                        {isViewingDebug && (
                            <button
                                onClick={handleBackToFinal}
                                className="btn btn-ghost btn-sm btn-square"
                            >
                                <ArrowLeft size={16} />
                            </button>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-semibold text-lg">
                                    {isViewingDebug ? 'Debug Step' : 'Generation'}
                                </h2>
                                {isViewingDebug ? (
                                    <span className="badge badge-warning badge-sm">Debug</span>
                                ) : (
                                    <span className="badge badge-success badge-sm">Final</span>
                                )}
                            </div>
                            <p className="text-sm opacity-60">
                                {displayGen && formatRelative(displayGen.createdAt)}
                            </p>
                        </div>
                    </div>
                    <form method="dialog">
                        <button className="btn btn-sm btn-circle btn-ghost">
                            <X size={16} />
                        </button>
                    </form>
                </div>
                <div className="flex min-h-[500px]">
                    <div className="w-1/2 border-r border-base-300 flex flex-col">
                        <div className="px-4 py-3 bg-base-200 text-sm font-medium flex items-center gap-2">
                            <Code size={16} />
                            Code
                        </div>
                        <div className="flex-1 overflow-auto">
                            <pre className="p-4 text-sm font-mono bg-neutral text-neutral-content h-full whitespace-pre-wrap">
                                {displayGen?.code || '// No code available'}
                            </pre>
                        </div>

                        {debugChain.length > 0 && !isViewingDebug && (
                            <div className="border-t border-base-300">
                                <button
                                    onClick={() => setShowDebug(!showDebug)}
                                    className="w-full px-4 py-3 flex items-center justify-between text-sm hover:bg-base-200 transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <Bug size={16} className="text-warning" />
                                        Debug steps ({debugChain.length})
                                    </span>
                                    {showDebug ? (
                                        <ChevronUp size={16} />
                                    ) : (
                                        <ChevronDown size={16} />
                                    )}
                                </button>
                                {showDebug && (
                                    <div className="px-4 pb-4 space-y-1">
                                        {debugChain.map((debug) => (
                                            <DebugStepItem
                                                key={debug.id}
                                                generation={debug}
                                                onSelect={handleViewDebug}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {!isViewingDebug && (
                            <div className="p-4 border-t border-base-300">
                                <form onSubmit={handleEditSubmit} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={editPrompt}
                                        onChange={(e) => setEditPrompt(e.target.value)}
                                        placeholder="Describe changes..."
                                        className="input input-bordered flex-1"
                                        disabled={props.isEditing}
                                    />
                                    <button
                                        type="submit"
                                        className="bg-neutral text-neutral-content px-6 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                                        disabled={!editPrompt.trim() || props.isEditing}
                                    >
                                        {props.isEditing ? 'Editing...' : 'Edit'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                    <div className="w-1/2 bg-base-200 flex items-center justify-center p-6">
                        <div className="w-full aspect-square rounded-lg overflow-hidden bg-base-300 flex items-center justify-center">
                            {displayGen?.imageData ? (
                                <img
                                    src={`data:image/png;base64,${displayGen.imageData}`}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="opacity-50">No image</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    )
}

// =============================================================================
// SCREEN COMPONENTS
// =============================================================================

function ThreadsScreen(props: {
    user: { email: string; image: string | null }
    threads: Array<{
        id: string
        prompt: string
        status: string
        createdAt: Date | string
        thumbnail: string | null
        finalCount: number
    }>
    onNewThread: () => void
    onSelectThread: (threadId: string) => void
}) {
    return (
        <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Image size={16} className="text-primary" />
                        </div>
                        <h1 className="text-lg font-semibold">Flow</h1>
                    </div>
                    <ProfileDropdown email={props.user.email} image={props.user.image} />
                </div>
            </header>
            <main className="flex-1 pb-24">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="py-8">
                        <h2 className="text-sm font-medium text-secondary uppercase tracking-wide mb-4">
                            Recent
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            <NewThreadCard onClick={props.onNewThread} />
                            {props.threads.map((thread) => (
                                <ThreadCard
                                    key={thread.id}
                                    id={thread.id}
                                    prompt={thread.prompt}
                                    status={thread.status}
                                    createdAt={thread.createdAt}
                                    thumbnail={thread.thumbnail}
                                    finalCount={thread.finalCount}
                                    onSelect={props.onSelectThread}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

function NewThreadScreen(props: { onBack: () => void; onCreate: (prompt: string) => void }) {
    const [prompt, setPrompt] = useState('')
    const inputRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!prompt.trim()) return
        props.onCreate(prompt.trim())
        setPrompt('')
    }

    return (
        <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
                    <button onClick={props.onBack} className="btn btn-ghost btn-sm btn-square">
                        <ChevronLeft size={20} />
                    </button>
                    <h1 className="font-medium">New Generation</h1>
                </div>
            </header>
            <main className="flex-1 flex items-center justify-center px-6">
                <div className="w-full max-w-xl">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold mb-2">Create something new</h2>
                        <p className="text-secondary">Describe an image and watch it evolve</p>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <textarea
                            ref={inputRef}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="A pelican riding a bicycle through a sunny park..."
                            rows={4}
                            className="w-full px-4 py-3 bg-white border border-base-300 rounded-xl text-base placeholder:text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                        />
                        <button
                            type="submit"
                            disabled={!prompt.trim()}
                            className="btn btn-primary w-full mt-4"
                        >
                            Generate
                        </button>
                    </form>
                </div>
            </main>
        </div>
    )
}

function ThreadDetailScreen(props: {
    thread: {
        id: string
        prompt: string
        status: string
        createdAt: Date | string
    }
    generations: Generation[]
    isRunning: boolean
    onBack: () => void
    onSelectGeneration: (gen: Generation) => void
}) {
    const thread = props.thread
    const finalGenerations = getFinalGenerations(props.generations)
    const isRunning = props.isRunning

    return (
        <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
                <div className="max-w-6xl mx-auto px-6 py-3">
                    <div className="flex items-center gap-4">
                        <button onClick={props.onBack} className="btn btn-ghost btn-sm btn-square">
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex-1 min-w-0">
                            <h1 className="font-medium truncate">{thread.prompt}</h1>
                        </div>
                        <div>
                            {isRunning ? (
                                <span className="flex items-center gap-2 text-warning text-sm">
                                    <span className="loading loading-spinner loading-xs" />
                                    Generating...
                                </span>
                            ) : (
                                <StatusBadge status={thread.status} />
                            )}
                        </div>
                    </div>
                </div>
            </header>
            <main className="flex-1 overflow-auto">
                <div className="max-w-6xl mx-auto px-6 py-6">
                    {finalGenerations.length === 0 ? (
                        <div className="text-center py-20">
                            {isRunning && (
                                <span className="loading loading-spinner loading-lg text-primary mb-4" />
                            )}
                            <p className="text-secondary">
                                {isRunning ? 'Generating your image...' : 'No generations yet'}
                            </p>
                            {!isRunning && props.generations.length > 0 && (
                                <p className="text-xs text-secondary/60 mt-2">
                                    {props.generations.length} debug step
                                    {props.generations.length > 1 ? 's' : ''} in progress
                                </p>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="mb-4">
                                <p className="text-sm text-secondary">
                                    {finalGenerations.length} generation
                                    {finalGenerations.length > 1 ? 's' : ''} • Click to view code
                                    and edit
                                </p>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {finalGenerations.map((gen) => (
                                    <GenerationNode
                                        key={gen.id}
                                        generation={gen}
                                        isRunning={isRunning}
                                        childCount={getChildCount(props.generations, gen.id)}
                                        onSelect={props.onSelectGeneration}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    )
}

// =============================================================================
// MAIN APP COMPONENTS
// =============================================================================

function DashboardContent() {
    const trpc = useTRPC()

    const meQuery = useQuery(trpc.me.queryOptions(undefined))
    const threadsQuery = useQuery(trpc.listThreads.queryOptions())

    if (meQuery.isLoading || threadsQuery.isLoading) {
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
    const threads = threadsQuery.data ?? []

    function handleNewThread() {
        window.location.href = '/thread/new'
    }

    function handleSelectThread(threadId: string) {
        window.location.href = `/thread/${threadId}`
    }

    return (
        <ThreadsScreen
            user={{ email: user.email, image: user.image ?? null }}
            threads={threads}
            onNewThread={handleNewThread}
            onSelectThread={handleSelectThread}
        />
    )
}

export function DashboardPage() {
    return (
        <QueryProvider>
            <DashboardContent />
        </QueryProvider>
    )
}

function NewThreadContent() {
    const trpc = useTRPC()
    const queryClient = useQueryClient()

    const createMutation = useMutation({
        ...trpc.createThread.mutationOptions(),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: trpc.listThreads.queryKey() })
            runMutation.mutate({ threadId: data.id })
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

    function handleBack() {
        window.location.href = '/dashboard'
    }

    function handleCreate(prompt: string) {
        createMutation.mutate({ prompt })
    }

    useEffect(() => {
        if (createMutation.data) {
            window.location.href = `/thread/${createMutation.data.id}`
        }
    }, [createMutation.data])

    return <NewThreadScreen onBack={handleBack} onCreate={handleCreate} />
}

export function NewThreadPage() {
    return (
        <QueryProvider>
            <NewThreadContent />
        </QueryProvider>
    )
}

function ThreadDetailContent(props: { threadId: string }) {
    const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null)
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
            setSelectedGeneration(null)
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
    const generations = thread.generations as Generation[]

    function handleBack() {
        window.location.href = '/dashboard'
    }

    function handleSelectGeneration(gen: Generation) {
        setSelectedGeneration(gen)
    }

    function handleCloseModal() {
        setSelectedGeneration(null)
    }

    function handleEdit(baseGen: Generation, prompt: string) {
        continueMutation.mutate({ generationId: baseGen.id, prompt })
    }

    return (
        <>
            <ThreadDetailScreen
                thread={thread}
                generations={generations}
                isRunning={isRunning}
                onBack={handleBack}
                onSelectGeneration={handleSelectGeneration}
            />
            <GenerationModal
                generation={selectedGeneration}
                allGenerations={generations}
                onClose={handleCloseModal}
                onEdit={handleEdit}
                isEditing={continueMutation.isPending}
            />
        </>
    )
}

export function ThreadDetailPage(props: { threadId: string }) {
    return (
        <QueryProvider>
            <ThreadDetailContent threadId={props.threadId} />
        </QueryProvider>
    )
}
