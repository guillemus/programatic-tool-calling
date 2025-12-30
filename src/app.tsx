import { authClient } from '@/auth-client'
import { QueryProvider, useTRPC } from '@/query-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Code, Image, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useNavigate, useParams } from 'react-router'

type Generation = {
    id: string
    threadId: string
    code: string
    imageData: string
    createdAt: string
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

function StatusDot(props: { status: string }) {
    const isPulsing = props.status === 'running' || props.status === 'pending'
    let dotClass = 'bg-secondary'
    if (props.status === 'completed') dotClass = 'bg-success'
    if (props.status === 'running') dotClass = 'bg-warning'
    if (props.status === 'failed') dotClass = 'bg-error'
    let pulseClass = ''
    if (isPulsing) pulseClass = 'animate-pulse'
    return <span className={`w-2 h-2 rounded-full ${dotClass} ${pulseClass}`} />
}

function StatusBadge(props: { status: string }) {
    let color = 'text-secondary'
    if (props.status === 'completed') color = 'text-success'
    if (props.status === 'running') color = 'text-warning'
    if (props.status === 'failed') color = 'text-error'
    return (
        <span className={`flex items-center gap-1.5 ${color}`}>
            <StatusDot status={props.status} />
            <span className="capitalize">{props.status}</span>
        </span>
    )
}

function ProfileAvatar(props: { image: string | null; email: string; size: 'sm' | 'md' }) {
    const sizeClass = props.size === 'sm' ? 'w-10 h-10' : 'w-10 h-10'
    if (props.image) {
        return <img src={props.image} alt="avatar" className={`${sizeClass} rounded-full object-cover`} />
    }
    return (
        <div className={`${sizeClass} rounded-full bg-base-300 flex items-center justify-center text-sm`}>
            {props.email[0].toUpperCase()}
        </div>
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
                <ProfileAvatar image={props.image} email={props.email} size="sm" />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-12 z-50 bg-base-200 border border-base-300 rounded-lg shadow-lg p-4 min-w-60">
                        <div className="flex items-center gap-3 mb-4">
                            <ProfileAvatar image={props.image} email={props.email} size="md" />
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
            </div>
        </Link>
    )
}

function GenerationModal(props: {
    generation: Generation | null
    onClose: () => void
    onEdit: (prompt: string) => void
    isRunning: boolean
}) {
    const modalRef = useRef<HTMLDialogElement>(null)
    const [editPrompt, setEditPrompt] = useState('')

    useEffect(() => {
        if (props.generation) {
            modalRef.current?.showModal()
        } else {
            modalRef.current?.close()
        }
    }, [props.generation])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!editPrompt.trim() || props.isRunning) return
        props.onEdit(editPrompt.trim())
        setEditPrompt('')
        props.onClose()
    }

    if (!props.generation) {
        return <dialog ref={modalRef} className="modal" />
    }

    const gen = props.generation

    return (
        <dialog ref={modalRef} className="modal" onClose={props.onClose}>
            <div className="modal-box max-w-5xl max-h-[90vh] p-0 flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 flex-shrink-0">
                    <div>
                        <h2 className="font-semibold text-lg">Generation</h2>
                        <p className="text-sm opacity-60">{formatRelative(gen.createdAt)}</p>
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
                                {gen.code}
                            </pre>
                        </div>
                    </div>
                    <div className="w-1/2 bg-base-200 flex flex-col">
                        <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
                            <div className="w-full aspect-square rounded-lg overflow-hidden bg-base-300 flex items-center justify-center">
                                <img
                                    src={`data:image/png;base64,${gen.imageData}`}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 border-t border-base-300">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={editPrompt}
                                    onChange={(e) => setEditPrompt(e.target.value)}
                                    placeholder="Describe changes..."
                                    disabled={props.isRunning}
                                    className="flex-1 px-3 py-2 bg-white border border-base-300 rounded-lg text-sm placeholder:text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                />
                                <button
                                    type="submit"
                                    disabled={!editPrompt.trim() || props.isRunning}
                                    className="btn btn-primary btn-sm"
                                >
                                    {props.isRunning && (
                                        <span className="loading loading-spinner loading-xs" />
                                    )}
                                    {!props.isRunning && 'Edit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    )
}

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
    const navigate = useNavigate()
    const trpc = useTRPC()
    const queryClient = useQueryClient()

    const runMutation = useMutation({
        ...trpc.runThread.mutationOptions(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: trpc.listThreads.queryKey() })
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: trpc.listThreads.queryKey() })
        },
    })

    const createMutation = useMutation({
        ...trpc.createThread.mutationOptions(),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: trpc.listThreads.queryKey() })
            runMutation.mutate({ threadId: data.id })
            navigate(`/thread/${data.id}`)
        },
    })

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
                            autoFocus
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

    const deleteMutation = useMutation({
        ...trpc.deleteThread.mutationOptions(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: trpc.listThreads.queryKey() })
            navigate('/dashboard')
        },
    })

    const continueMutation = useMutation({
        ...trpc.continueThread.mutationOptions(),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: trpc.getThread.queryKey({ threadId: id! }) })
            queryClient.invalidateQueries({ queryKey: trpc.listThreads.queryKey() })
        },
    })

    function handleEdit(prompt: string) {
        continueMutation.mutate({ threadId: id!, prompt })
    }

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
    const isRunning = thread.status === 'running' || thread.status === 'pending' || continueMutation.isPending
    const generations = thread.generations as Generation[]

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
                                <StatusBadge status={isRunning ? 'running' : thread.status} />
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
                        {generations.length === 0 && (
                            <div className="text-center py-20">
                                {isRunning && (
                                    <span className="loading loading-spinner loading-lg text-primary mb-4" />
                                )}
                                <p className="text-secondary">
                                    {isRunning && 'Generating your image...'}
                                    {!isRunning && 'No generations yet'}
                                </p>
                            </div>
                        )}
                        {generations.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {generations.map((gen) => (
                                    <button
                                        key={gen.id}
                                        onClick={() => setSelectedGeneration(gen)}
                                        className="bg-base-200 rounded-xl overflow-hidden transition-colors hover:bg-base-300"
                                    >
                                        <div className="aspect-square">
                                            <img
                                                src={`data:image/png;base64,${gen.imageData}`}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="p-3 text-left">
                                            <span className="text-xs text-secondary">
                                                {formatRelative(gen.createdAt)}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
            <GenerationModal
                key={selectedGeneration?.id}
                generation={selectedGeneration}
                onClose={() => setSelectedGeneration(null)}
                onEdit={handleEdit}
                isRunning={isRunning}
            />
        </>
    )
}

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
