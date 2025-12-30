import { authClient } from '@/auth-client'

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
