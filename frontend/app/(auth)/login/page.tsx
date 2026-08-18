"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Loader2 } from "lucide-react";

import { login, saveToken } from "@/lib/api";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            // Login
            const result = await login({
                email: email.trim(),
                password,
            });

            // Save fresh JWT
            saveToken(result.access_token);

            // Go to dashboard
            router.replace("/dashboard");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to login",
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <Activity className="size-6" />
                    </div>

                    <h1 className="text-3xl font-semibold tracking-tight">
                        Welcome back
                    </h1>

                    <p className="mt-2 text-sm text-muted-foreground">
                        Sign in to your Life Progress account
                    </p>
                </div>

                <div className="rounded-2xl border bg-card p-6 shadow-sm">
                    <form
                        onSubmit={handleSubmit}
                        className="space-y-5"
                    >
                        <div className="space-y-2">
                            <label
                                htmlFor="email"
                                className="text-sm font-medium"
                            >
                                Email
                            </label>

                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                placeholder="you@example.com"
                                autoComplete="email"
                                required
                                className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                            />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="password"
                                className="text-sm font-medium"
                            >
                                Password
                            </label>

                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                placeholder="••••••••"
                                autoComplete="current-password"
                                required
                                className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                            />
                        </div>

                        {error && (
                            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading && (
                                <Loader2 className="size-4 animate-spin" />
                            )}

                            {loading ? "Signing in..." : "Sign in"}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        Don't have an account?{" "}

                        <Link
                            href="/register"
                            className="font-medium text-foreground underline-offset-4 hover:underline"
                        >
                            Create one
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}