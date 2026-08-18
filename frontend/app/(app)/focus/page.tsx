"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Clock3,
    Pause,
    Play,
    RotateCcw,
    Square,
} from "lucide-react";

import {
    createFocusSession,
    getTodayFocusTime,
} from "@/lib/api";

function formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
        seconds,
    ).padStart(2, "0")}`;
}

function formatMinutes(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
        return `${minutes}m`;
    }

    return `${hours}h ${minutes}m`;
}

export default function FocusPage() {
    const [durationSeconds, setDurationSeconds] = useState(25 * 60);
    const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);

    const [isRunning, setIsRunning] = useState(false);
    const [startedAt, setStartedAt] = useState<string | null>(null);

    const [todayMinutes, setTodayMinutes] = useState(0);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const progress = useMemo(() => {
        if (durationSeconds <= 0) {
            return 0;
        }

        return Math.min(
            100,
            Math.max(
                0,
                ((durationSeconds - remainingSeconds) /
                    durationSeconds) *
                100,
            ),
        );
    }, [durationSeconds, remainingSeconds]);

    // ------------------------------------------------------------
    // LOAD TODAY'S FOCUS TIME
    // ------------------------------------------------------------

    useEffect(() => {
        async function loadFocusTime() {
            try {
                setLoading(true);
                setError(null);

                const result = await getTodayFocusTime();

                setTodayMinutes(result.total_minutes);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load focus time.",
                );
            } finally {
                setLoading(false);
            }
        }

        loadFocusTime();
    }, []);

    // ------------------------------------------------------------
    // TIMER
    // ------------------------------------------------------------

    useEffect(() => {
        if (!isRunning) {
            return;
        }

        const timer = window.setInterval(() => {
            setRemainingSeconds((current) => {
                if (current <= 1) {
                    window.clearInterval(timer);
                    return 0;
                }

                return current - 1;
            });
        }, 1000);

        return () => {
            window.clearInterval(timer);
        };
    }, [isRunning]);

    // ------------------------------------------------------------
    // AUTO STOP WHEN TIMER FINISHES
    // ------------------------------------------------------------

    useEffect(() => {
        if (
            isRunning &&
            remainingSeconds === 0
        ) {
            setIsRunning(false);
        }
    }, [remainingSeconds, isRunning]);

    // ------------------------------------------------------------
    // START
    // ------------------------------------------------------------

    function handleStart() {
        setError(null);

        if (remainingSeconds <= 0) {
            setRemainingSeconds(durationSeconds);
        }

        if (!startedAt) {
            setStartedAt(
                new Date().toISOString(),
            );
        }

        setIsRunning(true);
    }

    // ------------------------------------------------------------
    // PAUSE
    // ------------------------------------------------------------

    function handlePause() {
        setIsRunning(false);
    }

    // ------------------------------------------------------------
    // RESET
    // ------------------------------------------------------------

    function handleReset() {
        setIsRunning(false);
        setStartedAt(null);
        setRemainingSeconds(durationSeconds);
        setError(null);
    }

    // ------------------------------------------------------------
    // FINISH
    // ------------------------------------------------------------

    async function handleFinish() {
        if (!startedAt) {
            return;
        }

        setIsRunning(false);
        setSaving(true);
        setError(null);

        try {
            const endedAt = new Date();

            const elapsedSeconds =
                durationSeconds - remainingSeconds;

            const elapsedMinutes = Math.floor(
                elapsedSeconds / 60,
            );

            if (elapsedMinutes < 1) {
                setError(
                    "Focus session must be at least 1 minute.",
                );

                return;
            }

            const result =
                await createFocusSession({
                    started_at: startedAt,
                    ended_at: endedAt.toISOString(),
                    duration_minutes: elapsedMinutes,
                    task_id: null,
                });

            setTodayMinutes(
                (current) =>
                    current +
                    result.duration_minutes,
            );

            setStartedAt(null);
            setRemainingSeconds(durationSeconds);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to save focus session.",
            );
        } finally {
            setSaving(false);
        }
    }

    // ------------------------------------------------------------
    // DURATION
    // ------------------------------------------------------------

    function changeDuration(minutes: number) {
        if (isRunning) {
            return;
        }

        const seconds = minutes * 60;

        setDurationSeconds(seconds);
        setRemainingSeconds(seconds);
        setStartedAt(null);
        setError(null);
    }

    return (
        <div className="mx-auto w-full max-w-5xl space-y-8">
            {/* HEADER */}

            <div>
                <p className="text-sm text-muted-foreground">
                    Focus
                </p>

                <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                    Deep work starts here.
                </h1>

                <p className="mt-2 text-muted-foreground">
                    Focus on one thing at a time and build
                    consistent progress.
                </p>
            </div>

            {/* ERROR */}

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* TIMER CARD */}

            <section className="rounded-3xl border bg-card p-6 shadow-sm sm:p-10">
                <div className="flex flex-col items-center">
                    <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock3 className="size-4" />
                        Focus Timer
                    </div>

                    {/* TIMER */}

                    <div className="relative flex size-72 items-center justify-center rounded-full border-[14px] border-muted sm:size-80">
                        <div
                            className="absolute inset-[-14px] rounded-full border-[14px] border-transparent"
                            style={{
                                background: `conic-gradient(currentColor ${progress}%, transparent ${progress}%)`,
                                WebkitMask:
                                    "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                                WebkitMaskComposite:
                                    "xor",
                                maskComposite: "exclude",
                                color: "hsl(var(--primary))",
                            }}
                        />

                        <div className="text-center">
                            <div className="font-mono text-6xl font-semibold tracking-tight">
                                {formatTime(
                                    remainingSeconds,
                                )}
                            </div>

                            <p className="mt-2 text-sm text-muted-foreground">
                                {isRunning
                                    ? "Focus mode active"
                                    : "Ready to focus"}
                            </p>
                        </div>
                    </div>

                    {/* DURATION OPTIONS */}

                    <div className="mt-8 flex flex-wrap justify-center gap-2">
                        {[15, 25, 45, 60].map(
                            (minutes) => (
                                <button
                                    key={minutes}
                                    type="button"
                                    disabled={isRunning}
                                    onClick={() =>
                                        changeDuration(
                                            minutes,
                                        )
                                    }
                                    className={`rounded-lg border px-4 py-2 text-sm transition-colors ${durationSeconds ===
                                            minutes *
                                            60
                                            ? "bg-primary text-primary-foreground"
                                            : "hover:bg-muted"
                                        } disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                    {minutes} min
                                </button>
                            ),
                        )}
                    </div>

                    {/* CONTROLS */}

                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        {!isRunning ? (
                            <button
                                type="button"
                                onClick={handleStart}
                                disabled={saving}
                                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                <Play className="size-4 fill-current" />
                                Start Focus
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handlePause}
                                className="inline-flex h-11 items-center gap-2 rounded-xl border px-6 text-sm font-medium hover:bg-muted"
                            >
                                <Pause className="size-4" />
                                Pause
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleFinish}
                            disabled={
                                !startedAt ||
                                saving
                            }
                            className="inline-flex h-11 items-center gap-2 rounded-xl border px-6 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Square className="size-4" />
                            {saving
                                ? "Saving..."
                                : "Finish"}
                        </button>

                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={saving}
                            className="inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
                        >
                            <RotateCcw className="size-4" />
                            Reset
                        </button>
                    </div>
                </div>
            </section>

            {/* TODAY'S FOCUS */}

            <section className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border bg-card p-5">
                    <p className="text-sm text-muted-foreground">
                        Today's focus
                    </p>

                    <p className="mt-2 text-3xl font-semibold">
                        {loading
                            ? "..."
                            : formatMinutes(
                                todayMinutes,
                            )}
                    </p>
                </div>

                <div className="rounded-2xl border bg-card p-5">
                    <p className="text-sm text-muted-foreground">
                        Current session
                    </p>

                    <p className="mt-2 text-3xl font-semibold">
                        {formatMinutes(
                            Math.floor(
                                (durationSeconds -
                                    remainingSeconds) /
                                60,
                            ),
                        )}
                    </p>
                </div>

                <div className="rounded-2xl border bg-card p-5">
                    <p className="text-sm text-muted-foreground">
                        Status
                    </p>

                    <p className="mt-2 text-3xl font-semibold">
                        {isRunning
                            ? "Focusing"
                            : "Ready"}
                    </p>
                </div>
            </section>
        </div>
    );
}