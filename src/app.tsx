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
    Trash2,
    X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useNavigate, useParams } from 'react-router'

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

function NewThreadCard() {
    return (
        <Link
            to="/thread/new"
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
        </Link>
    )
}

function ThreadCard(props: {
    id: string
    prompt: string
    status: string
    createdAt: Date | string
    thumbnail: string | null
    finalCount: number
}) {
    return (
        <Link
            to={`/thread/${props.id}`}
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
        </Link>
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
            <div className="modal-box max-w-5xl max-h-[90vh] p-0 flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 flex-shrink-0">
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
                <div className="flex flex-1 min-h-0 overflow-hidden">
                    <div className="w-1/2 border-r border-base-300 flex flex-col min-h-0">
                        <div className="px-4 py-3 bg-base-200 text-sm font-medium flex items-center gap-2">
                            <Code size={16} />
                            Code
                        </div>
                        <div className="flex-1 overflow-auto min-h-0">
                            <pre className="p-4 text-sm font-mono bg-neutral text-neutral-content whitespace-pre-wrap">
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
                    <div className="w-1/2 bg-base-200 flex items-center justify-center p-6 overflow-auto">
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
// PAGE COMPONENTS
// =============================================================================

function DashboardPage() {
    const trpc = useTRPC()
    const navigate = useNavigate()

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
        navigate('/')
        return null
    }

    const user = meQuery.data.user
    const threads = threadsQuery.data ?? []

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
                    <ProfileDropdown email={user.email} image={user.image ?? null} />
                </div>
            </header>
            <main className="flex-1 pb-24">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="py-8">
                        <h2 className="text-sm font-medium text-secondary uppercase tracking-wide mb-4">
                            Recent
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            <NewThreadCard />
                            {threads.map((thread) => (
                                <ThreadCard
                                    key={thread.id}
                                    id={thread.id}
                                    prompt={thread.prompt}
                                    status={thread.status}
                                    createdAt={thread.createdAt}
                                    thumbnail={thread.thumbnail}
                                    finalCount={thread.finalCount}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

function NewThreadPage() {
    const [prompt, setPrompt] = useState('')
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const navigate = useNavigate()
    const trpc = useTRPC()
    const queryClient = useQueryClient()

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

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

    useEffect(() => {
        if (createMutation.data) {
            navigate(`/thread/${createMutation.data.id}`)
        }
    }, [createMutation.data, navigate])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!prompt.trim()) return
        createMutation.mutate({ prompt: prompt.trim() })
        setPrompt('')
    }

    return (
        <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Link to="/dashboard" className="btn btn-ghost btn-sm btn-square">
                        <ChevronLeft size={20} />
                    </Link>
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

function ThreadDetailPage() {
    const { id } = useParams<{ id: string }>()
    const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null)
    const trpc = useTRPC()
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    const threadQuery = useQuery({
        ...trpc.getThread.queryOptions({ threadId: id! }),
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
                queryKey: trpc.getThread.queryKey({ threadId: id! }),
            })
            setSelectedGeneration(null)
        },
        onError: () => {
            queryClient.invalidateQueries({
                queryKey: trpc.getThread.queryKey({ threadId: id! }),
            })
        },
    })

    const deleteMutation = useMutation({
        ...trpc.deleteThread.mutationOptions(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: trpc.listThreads.queryKey() })
            navigate('/dashboard')
        },
    })

    function handleDelete() {
        if (!confirm('Delete this thread?')) return
        deleteMutation.mutate({ threadId: id! })
    }

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
                    <Link to="/dashboard" className="btn btn-ghost mt-4">
                        Back to dashboard
                    </Link>
                </div>
            </main>
        )
    }

    const thread = threadQuery.data
    const isRunning = thread.status === 'running' || thread.status === 'pending'
    const generations = thread.generations as Generation[]
    const finalGenerations = getFinalGenerations(generations)

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
            <div className="min-h-screen flex flex-col">
                <header className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
                    <div className="max-w-6xl mx-auto px-6 py-3">
                        <div className="flex items-center gap-4">
                            <Link to="/dashboard" className="btn btn-ghost btn-sm btn-square">
                                <ChevronLeft size={20} />
                            </Link>
                            <div className="flex-1 min-w-0">
                                <h1 className="font-medium truncate">{thread.prompt}</h1>
                            </div>
                            <div className="flex items-center gap-2">
                                {isRunning ? (
                                    <span className="flex items-center gap-2 text-warning text-sm">
                                        <span className="loading loading-spinner loading-xs" />
                                        Generating...
                                    </span>
                                ) : (
                                    <StatusBadge status={thread.status} />
                                )}
                                <button
                                    onClick={handleDelete}
                                    disabled={deleteMutation.isPending}
                                    className="btn btn-ghost btn-sm btn-square text-error hover:bg-error/10"
                                    title="Delete thread"
                                >
                                    <Trash2 size={16} />
                                </button>
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
                                {!isRunning && generations.length > 0 && (
                                    <p className="text-xs text-secondary/60 mt-2">
                                        {generations.length} debug step
                                        {generations.length > 1 ? 's' : ''} in progress
                                    </p>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="mb-4">
                                    <p className="text-sm text-secondary">
                                        {finalGenerations.length} generation
                                        {finalGenerations.length > 1 ? 's' : ''} - Click to view
                                        code and edit
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {finalGenerations.map((gen) => (
                                        <GenerationNode
                                            key={gen.id}
                                            generation={gen}
                                            isRunning={isRunning}
                                            childCount={getChildCount(generations, gen.id)}
                                            onSelect={handleSelectGeneration}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </main>
            </div>
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

// =============================================================================
// APP
// =============================================================================

function AppRoutes() {
    return (
        <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/thread/new" element={<NewThreadPage />} />
            <Route path="/thread/:id" element={<ThreadDetailPage />} />
        </Routes>
    )
}

export function App() {
    return (
        <BrowserRouter>
            <QueryProvider>
                <AppRoutes />
            </QueryProvider>
        </BrowserRouter>
    )
}
