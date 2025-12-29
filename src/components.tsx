import { authClient } from '@/auth-client'
import { TRPCProvider, trpc } from '@/trpc-client'
import { useQuery } from '@tanstack/react-query'
import type { User } from 'better-auth'

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

function TestAuthButton() {
    const utils = trpc.useUtils()
    const meQuery = useQuery({ ...utils.me.queryOptions(undefined), enabled: false })

    function handleTest() {
        meQuery.refetch()
    }

    return (
        <div className="space-y-2">
            <button onClick={handleTest} className="btn btn-secondary">
                Test trpc.me
            </button>
            {meQuery.isLoading && <p className="text-secondary">Loading...</p>}
            {meQuery.isError && <p className="text-error">Error: {meQuery.error.message}</p>}
            {meQuery.isSuccess && (
                <pre className="bg-base-300 p-2 rounded text-sm">
                    {JSON.stringify(meQuery.data, null, 2)}
                </pre>
            )}
        </div>
    )
}

function DashboardContent(props: { user: User }) {
    return (
        <main className="min-h-screen bg-base-100 text-base-content">
            <div className="max-w-2xl mx-auto px-6 py-24">
                <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
                <p className="mt-4 text-lg text-secondary">
                    Welcome, {props.user.name || props.user.email}
                </p>

                <div className="mt-12">
                    <div className="card bg-base-200 border border-neutral">
                        <div className="card-body">
                            <p className="text-sm text-secondary uppercase tracking-wide">
                                Account
                            </p>
                            <p className="text-base-content">{props.user.email}</p>
                            {props.user.image && (
                                <img
                                    src={props.user.image}
                                    alt="avatar"
                                    className="w-16 h-16 rounded-full mt-4"
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-12">
                    <TestAuthButton />
                </div>

                <div className="mt-12">
                    <LogoutButton />
                </div>
            </div>
        </main>
    )
}

export function DashboardPage(props: { user: User }) {
    return (
        <TRPCProvider>
            <DashboardContent user={props.user} />
        </TRPCProvider>
    )
}
