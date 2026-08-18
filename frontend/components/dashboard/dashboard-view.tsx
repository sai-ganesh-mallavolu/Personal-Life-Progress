"use client";

import { useRouter } from "next/navigation";

import {
    Activity,
    ArrowRight,
    Check,
    CheckCircle2,
    ChevronRight,
    Clock3,
    Dumbbell,
    Flame,
    HeartPulse,
    Moon,
    Plus,
    Sparkles,
    TrendingUp,
    Utensils,
} from "lucide-react";
import {
    FormEvent,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    createTask,
    getTasks,
    getTodayFocusTime,
    subscribeToTaskSync,
    updateTask,
    type Task as ApiTask,
} from "@/lib/api";

// ============================================================
// TYPES
// ============================================================

type Category = {
    id: string;
    name: string;
    value: number;
    completed: string;
    icon: typeof Sparkles;
    iconClass: string;
    barClass: string;
};

// ============================================================
// CATEGORY CONFIG
// ============================================================

const categoryConfig = [
    {
        id: "work-study",
        name: "Work & Study",
        categories: ["WORK", "STUDY"],
        icon: CheckCircle2,
        iconClass: "bg-blue-500/10 text-blue-500",
        barClass: "bg-blue-500",
    },
    {
        id: "fitness",
        name: "Fitness",
        categories: ["FITNESS"],
        icon: Dumbbell,
        iconClass: "bg-orange-500/10 text-orange-500",
        barClass: "bg-orange-500",
    },
    {
        id: "nutrition",
        name: "Nutrition",
        categories: ["NUTRITION"],
        icon: Utensils,
        iconClass: "bg-emerald-500/10 text-emerald-500",
        barClass: "bg-emerald-500",
    },
    {
        id: "hair",
        name: "Hair Care",
        categories: ["HAIR_CARE", "HAIR CARE"],
        icon: Sparkles,
        iconClass: "bg-violet-500/10 text-violet-500",
        barClass: "bg-violet-500",
    },
    {
        id: "skin",
        name: "Skin Care",
        categories: ["SKIN_CARE", "SKIN CARE"],
        icon: HeartPulse,
        iconClass: "bg-pink-500/10 text-pink-500",
        barClass: "bg-pink-500",
    },
    {
        id: "sleep",
        name: "Sleep",
        categories: ["SLEEP"],
        icon: Moon,
        iconClass: "bg-indigo-500/10 text-indigo-500",
        barClass: "bg-indigo-500",
    },
];

// ============================================================
// QUICK ACTIONS
// ============================================================

const quickActions = [
    {
        label: "Add Task",
        icon: Plus,
    },
    {
        label: "Workout",
        icon: Dumbbell,
    },
    {
        label: "Food",
        icon: Utensils,
    },
    {
        label: "Care",
        icon: Sparkles,
    },
];

// ============================================================
// DATE / GREETING HELPERS
// ============================================================

function getGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) {
        return "Good morning";
    }

    if (hour < 18) {
        return "Good afternoon";
    }

    return "Good evening";
}

function formatDate() {
    return new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    }).format(new Date());
}

function getTodayDate() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// ============================================================
// STREAK
// ============================================================

function calculateStreak(tasks: ApiTask[]): number {
    const completedDates = new Set(
        tasks
            .filter((task) => task.completed)
            .map((task) => task.task_date),
    );

    if (completedDates.size === 0) {
        return 0;
    }

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    let streak = 0;
    const currentDate = new Date();

    while (true) {
        const dateString = formatDate(currentDate);

        if (!completedDates.has(dateString)) {
            break;
        }

        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
}

// ============================================================
// PROGRESS RING
// ============================================================

function ProgressRing({
    value,
}: {
    value: number;
}) {
    return (
        <div
            className="relative flex size-36 items-center justify-center rounded-full sm:size-40"
            style={{
                background: `conic-gradient(var(--primary) ${value}%, color-mix(in oklab, var(--muted) 75%, transparent) ${value}% 100%)`,
            }}
        >
            <div className="flex size-28 flex-col items-center justify-center rounded-full bg-card sm:size-32">
                <span className="text-3xl font-semibold tracking-tight">
                    {value}%
                </span>

                <span className="mt-1 text-xs text-muted-foreground">
                    today
                </span>
            </div>
        </div>
    );
}

// ============================================================
// CATEGORY CARD
// ============================================================

function CategoryCard({
    category,
}: {
    category: Category;
}) {
    const Icon = category.icon;

    return (
        <div className="group rounded-xl border bg-card p-4 transition-colors hover:bg-accent/40">
            <div className="flex items-start justify-between gap-3">
                <div
                    className={`flex size-9 items-center justify-center rounded-lg ${category.iconClass}`}
                >
                    <Icon className="size-4" />
                </div>

                <span className="text-sm font-semibold">
                    {category.value}%
                </span>
            </div>

            <div className="mt-4">
                <p className="text-sm font-medium">
                    {category.name}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                    {category.completed}
                </p>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                    className={`h-full rounded-full transition-all ${category.barClass}`}
                    style={{
                        width: `${category.value}%`,
                    }}
                />
            </div>
        </div>
    );
}

// ============================================================
// DASHBOARD
// ============================================================

export function DashboardView() {

    const router = useRouter();
    const [tasks, setTasks] = useState<ApiTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [focusMinutes, setFocusMinutes] = useState<number>(0);

    // Add task modal
    const [showAddTask, setShowAddTask] = useState(false);
    const [creatingTask, setCreatingTask] = useState(false);

    const [newTask, setNewTask] = useState({
        title: "",
        description: "",
        category: "PERSONAL",
        priority: "MEDIUM",
        task_date: getTodayDate(),
        due_time: "",
        notes: "",
    });

    // ========================================================
    // LOAD TASKS
    // ========================================================

    useEffect(() => {
        async function loadTasks() {
            try {
                setLoading(true);
                setError(null);

                const data = await getTasks();

                setTasks(data);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load tasks",
                );
            } finally {
                setLoading(false);
            }
        }

        loadTasks();
    }, []);

    // ========================================================
    // CROSS-PAGE TASK SYNCHRONIZATION
    // ========================================================

    useEffect(() => {
        const unsubscribe =
            subscribeToTaskSync((event) => {
                if (event.type === "created") {
                    if (!event.task) {
                        return;
                    }

                    setTasks((currentTasks) => {
                        const alreadyExists =
                            currentTasks.some(
                                (task) =>
                                    task.id ===
                                    event.task!.id,
                            );

                        if (alreadyExists) {
                            return currentTasks;
                        }

                        return [
                            ...currentTasks,
                            event.task!,
                        ];
                    });

                    return;
                }

                if (event.type === "updated") {
                    if (!event.task) {
                        return;
                    }

                    setTasks((currentTasks) =>
                        currentTasks.map((task) =>
                            task.id === event.task!.id
                                ? event.task!
                                : task,
                        ),
                    );

                    return;
                }

                if (event.type === "deleted") {
                    if (typeof event.taskId !== "number") {
                        return;
                    }

                    setTasks((currentTasks) =>
                        currentTasks.filter(
                            (task) =>
                                task.id !== event.taskId,
                        ),
                    );
                }
            });

        return unsubscribe;
    }, []);

    // ========================================================
    // LOAD TODAY'S FOCUS TIME
    // ========================================================

    useEffect(() => {
        async function loadFocusTime() {
            try {
                const data = await getTodayFocusTime();
                setFocusMinutes(data.total_minutes);
            } catch (err) {
                console.error(
                    "Unable to load today's focus time:",
                    err,
                );
            }
        }

        loadFocusTime();
    }, []);

    // ========================================================
    // TODAY'S TASKS
    // ========================================================

    const today = getTodayDate();

    const todayTasks = useMemo(() => {
        return tasks.filter(
            (task) => task.task_date === today,
        );
    }, [tasks, today]);

    // ========================================================
    // TASK STATISTICS
    // ========================================================

    const completedTasks = useMemo(
        () =>
            todayTasks.filter(
                (task) => task.completed,
            ).length,
        [todayTasks],
    );

    const totalTasks = todayTasks.length;

    const remainingTasks =
        totalTasks - completedTasks;

    const taskProgress =
        totalTasks === 0
            ? 0
            : Math.round(
                (completedTasks / totalTasks) *
                100,
            );

    const streak = useMemo(
        () => calculateStreak(tasks),
        [tasks],
    );

    // ========================================================
    // CATEGORY PROGRESS
    // ========================================================

    const categories = useMemo<Category[]>(() => {
        return categoryConfig.map((config) => {
            const categoryTasks = todayTasks.filter(
                (task) =>
                    config.categories.includes(
                        task.category.toUpperCase(),
                    ),
            );

            const completed = categoryTasks.filter(
                (task) => task.completed,
            ).length;

            const total = categoryTasks.length;

            const value =
                total === 0
                    ? 0
                    : Math.round(
                        (completed / total) *
                        100,
                    );

            return {
                id: config.id,
                name: config.name,
                value,
                completed:
                    total === 0
                        ? "0 of 0"
                        : `${completed} of ${total}`,
                icon: config.icon,
                iconClass: config.iconClass,
                barClass: config.barClass,
            };
        });
    }, [todayTasks]);

    // ========================================================
    // TOGGLE TASK
    // ========================================================

    const toggleTask = async (
        task: ApiTask,
    ) => {
        try {
            setError(null);

            const updatedTask =
                await updateTask(task.id, {
                    completed: !task.completed,
                });

            setTasks((currentTasks) =>
                currentTasks.map(
                    (currentTask) =>
                        currentTask.id ===
                            updatedTask.id
                            ? updatedTask
                            : currentTask,
                ),
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to update task",
            );
        }
    };

    // ========================================================
    // CREATE TASK
    // ========================================================

    const handleCreateTask = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        if (!newTask.title.trim()) {
            setError(
                "Task title is required.",
            );
            return;
        }

        try {
            setCreatingTask(true);
            setError(null);

            const createdTask =
                await createTask({
                    title: newTask.title.trim(),
                    description:
                        newTask.description.trim() ||
                        null,
                    category:
                        newTask.category,
                    priority:
                        newTask.priority,
                    task_date:
                        newTask.task_date,
                    due_time:
                        newTask.due_time ||
                        null,
                    notes:
                        newTask.notes.trim() ||
                        null,
                });

            setTasks((currentTasks) => [
                createdTask,
                ...currentTasks,
            ]);

            setShowAddTask(false);

            setNewTask({
                title: "",
                description: "",
                category: "PERSONAL",
                priority: "MEDIUM",
                task_date: getTodayDate(),
                due_time: "",
                notes: "",
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to create task",
            );
        } finally {
            setCreatingTask(false);
        }
    };

    // ========================================================
    // FOCUS TIME DISPLAY
    // ========================================================

    const focusHours = Math.floor(focusMinutes / 60);
    const focusRemainingMinutes = focusMinutes % 60;

    const focusTimeLabel =
        focusHours > 0
            ? `${focusHours}h ${focusRemainingMinutes}m`
            : `${focusRemainingMinutes}m`;

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <>
            <div className="space-y-8">
                {/* ================================================= */}
                {/* HEADER */}
                {/* ================================================= */}

                <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">
                            {formatDate()}
                        </p>

                        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                            {getGreeting()} 👋
                        </h1>

                        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                            Stay consistent. Small
                            progress every day adds
                            up.
                        </p>
                    </div>

                    <div className="flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-2">
                        <Flame className="size-4 text-orange-500" />

                        <span className="text-sm font-semibold">
                            {streak} day{streak === 1 ? "" : "s"} streak
                        </span>
                    </div>
                </section>

                {/* ================================================= */}
                {/* OVERALL PROGRESS */}
                {/* ================================================= */}

                <section className="overflow-hidden rounded-2xl border bg-card">
                    <div className="grid lg:grid-cols-[1fr_auto]">
                        <div className="p-6 sm:p-8">
                            <div className="max-w-xl">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <Activity className="size-4" />

                                    Today's overall
                                    progress
                                </div>

                                <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                                    {taskProgress ===
                                        100
                                        ? "Excellent work! 🎉"
                                        : taskProgress >
                                            0
                                            ? "Keep the momentum going."
                                            : "Let's get started."}
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    You have completed{" "}
                                    {completedTasks}{" "}
                                    of{" "}
                                    {totalTasks}{" "}
                                    planned tasks
                                    today.
                                    {remainingTasks >
                                        0
                                        ? " Finish a few more to improve your daily score."
                                        : totalTasks >
                                            0
                                            ? " All planned tasks are complete!"
                                            : " Add your first task to start tracking your progress."}
                                </p>
                            </div>

                            <div className="mt-6 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-xl bg-muted/50 p-4">
                                    <p className="text-xs text-muted-foreground">
                                        Tasks done
                                    </p>

                                    <p className="mt-1 text-xl font-semibold">
                                        {
                                            completedTasks
                                        }
                                        /
                                        {
                                            totalTasks
                                        }
                                    </p>
                                </div>

                                <div className="rounded-xl bg-muted/50 p-4">
                                    <p className="text-xs text-muted-foreground">
                                        Focus time
                                    </p>

                                    <p className="mt-1 text-xl font-semibold">
                                        {focusTimeLabel}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-muted/50 p-4">
                                    <p className="text-xs text-muted-foreground">
                                        Streak
                                    </p>

                                    <p className="mt-1 text-xl font-semibold">
                                        {streak} day{streak === 1 ? "" : "s"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-center border-t p-6 lg:border-l lg:border-t-0 lg:px-10">
                            <ProgressRing
                                value={
                                    taskProgress
                                }
                            />
                        </div>
                    </div>
                </section>

                {/* ================================================= */}
                {/* CATEGORY PROGRESS */}
                {/* ================================================= */}

                <section>
                    <div className="mb-4 flex items-end justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold tracking-tight">
                                Today's progress
                            </h2>

                            <p className="mt-1 text-sm text-muted-foreground">
                                A quick view of every
                                part of your day.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="hidden items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:flex"
                        >
                            View details

                            <ArrowRight className="size-4" />
                        </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {categories.map(
                            (category) => (
                                <CategoryCard
                                    key={
                                        category.id
                                    }
                                    category={
                                        category
                                    }
                                />
                            ),
                        )}
                    </div>
                </section>

                {/* ================================================= */}
                {/* TASKS + QUICK ACTIONS */}
                {/* ================================================= */}

                <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
                    {/* TASKS */}

                    <div className="rounded-2xl border bg-card">
                        <div className="flex items-center justify-between border-b p-5 sm:p-6">
                            <div>
                                <h2 className="font-semibold tracking-tight">
                                    Today's tasks
                                </h2>

                                <p className="mt-1 text-xs text-muted-foreground">
                                    {
                                        completedTasks
                                    }{" "}
                                    completed ·{" "}
                                    {
                                        remainingTasks
                                    }{" "}
                                    remaining
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => router.push("/tasks")}
                                className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                            >
                                All tasks
                                <ChevronRight className="size-4" />
                            </button>
                        </div>

                        {/* LOADING */}

                        {loading && (
                            <div className="p-6 text-sm text-muted-foreground">
                                Loading tasks...
                            </div>
                        )}

                        {/* ERROR */}

                        {error && !loading && (
                            <div className="m-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        {/* EMPTY */}

                        {!loading &&
                            !error &&
                            todayTasks.length ===
                            0 && (
                                <div className="p-8 text-center">
                                    <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
                                        <Check className="size-5 text-muted-foreground" />
                                    </div>

                                    <p className="mt-3 text-sm font-medium">
                                        No tasks for
                                        today
                                    </p>

                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Add a task to
                                        start
                                        tracking your
                                        progress.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowAddTask(
                                                true,
                                            )
                                        }
                                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                                    >
                                        <Plus className="size-4" />
                                        Add Task
                                    </button>
                                </div>
                            )}

                        {/* TODAY'S TASKS */}

                        {!loading &&
                            !error &&
                            todayTasks.length >
                            0 && (
                                <div className="divide-y">
                                    {todayTasks.map(
                                        (task) => (
                                            <button
                                                key={
                                                    task.id
                                                }
                                                type="button"
                                                onClick={() =>
                                                    toggleTask(
                                                        task,
                                                    )
                                                }
                                                className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/40 sm:p-5"
                                            >
                                                <span
                                                    className={[
                                                        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                                                        task.completed
                                                            ? "border-primary bg-primary text-primary-foreground"
                                                            : "border-muted-foreground/30",
                                                    ].join(
                                                        " ",
                                                    )}
                                                >
                                                    {task.completed && (
                                                        <Check className="size-3" />
                                                    )}
                                                </span>

                                                <span className="min-w-0 flex-1">
                                                    <span
                                                        className={[
                                                            "block truncate text-sm font-medium",
                                                            task.completed
                                                                ? "text-muted-foreground line-through"
                                                                : "",
                                                        ].join(
                                                            " ",
                                                        )}
                                                    >
                                                        {
                                                            task.title
                                                        }
                                                    </span>

                                                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                        <span>
                                                            {
                                                                task.category
                                                            }
                                                        </span>

                                                        {task.due_time && (
                                                            <>
                                                                <span>
                                                                    •
                                                                </span>

                                                                <span className="flex items-center gap-1">
                                                                    <Clock3 className="size-3" />

                                                                    {task.due_time.slice(
                                                                        0,
                                                                        5,
                                                                    )}
                                                                </span>
                                                            </>
                                                        )}

                                                        {task.priority && (
                                                            <>
                                                                <span>
                                                                    •
                                                                </span>

                                                                <span>
                                                                    {
                                                                        task.priority
                                                                    }
                                                                </span>
                                                            </>
                                                        )}
                                                    </span>
                                                </span>

                                                {task.completed && (
                                                    <CheckCircle2 className="size-4 shrink-0 text-primary" />
                                                )}
                                            </button>
                                        ),
                                    )}
                                </div>
                            )}
                    </div>

                    {/* QUICK ACTIONS */}

                    <div className="rounded-2xl border bg-card p-5 sm:p-6">
                        <div>
                            <h2 className="font-semibold tracking-tight">
                                Quick actions
                            </h2>

                            <p className="mt-1 text-xs text-muted-foreground">
                                Update your day without
                                leaving the dashboard.
                            </p>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-1">
                            {quickActions.map(
                                (action) => {
                                    const Icon =
                                        action.icon;

                                    return (
                                        <button
                                            key={
                                                action.label
                                            }
                                            type="button"
                                            onClick={() => {
                                                if (
                                                    action.label ===
                                                    "Add Task"
                                                ) {
                                                    setError(
                                                        null,
                                                    );

                                                    setShowAddTask(
                                                        true,
                                                    );
                                                }
                                            }}
                                            className="flex items-center gap-3 rounded-xl border bg-background p-3 text-left text-sm font-medium transition-colors hover:bg-accent"
                                        >
                                            <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                                                <Icon className="size-4" />
                                            </span>

                                            {
                                                action.label
                                            }

                                            <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                                        </button>
                                    );
                                },
                            )}
                        </div>

                        <div className="mt-6 rounded-xl bg-muted/50 p-4">
                            <div className="flex items-start gap-3">
                                <TrendingUp className="mt-0.5 size-4 text-primary" />

                                <div>
                                    <p className="text-sm font-medium">
                                        Today's focus
                                    </p>

                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                        {remainingTasks >
                                            0
                                            ? `You have ${remainingTasks} task${remainingTasks ===
                                                1
                                                ? ""
                                                : "s"
                                            } remaining today. Keep going!`
                                            : totalTasks >
                                                0
                                                ? "All today's tasks are complete. Great job!"
                                                : "Add a task to start making progress today."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* ===================================================== */}
            {/* ADD TASK MODAL */}
            {/* ===================================================== */}

            {showAddTask && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setShowAddTask(false);
                        }
                    }}
                >
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-semibold tracking-tight">
                                    Add New Task
                                </h2>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Add something you
                                    want to accomplish.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowAddTask(
                                        false,
                                    )
                                }
                                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={
                                handleCreateTask
                            }
                            className="space-y-4"
                        >
                            {/* TITLE */}

                            <div>
                                <label
                                    htmlFor="task-title"
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    Title
                                </label>

                                <input
                                    id="task-title"
                                    type="text"
                                    value={
                                        newTask.title
                                    }
                                    onChange={(event) =>
                                        setNewTask({
                                            ...newTask,
                                            title: event
                                                .target
                                                .value,
                                        })
                                    }
                                    placeholder="DSA Practice"
                                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                                    required
                                />
                            </div>

                            {/* DESCRIPTION */}

                            <div>
                                <label
                                    htmlFor="task-description"
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    Description
                                </label>

                                <textarea
                                    id="task-description"
                                    value={
                                        newTask.description
                                    }
                                    onChange={(event) =>
                                        setNewTask({
                                            ...newTask,
                                            description:
                                                event
                                                    .target
                                                    .value,
                                        })
                                    }
                                    placeholder="Practice Two Sum and Binary Search"
                                    rows={3}
                                    className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                                />
                            </div>

                            {/* CATEGORY + PRIORITY */}

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="task-category"
                                        className="mb-1.5 block text-sm font-medium"
                                    >
                                        Category
                                    </label>

                                    <select
                                        id="task-category"
                                        value={
                                            newTask.category
                                        }
                                        onChange={(event) =>
                                            setNewTask({
                                                ...newTask,
                                                category:
                                                    event
                                                        .target
                                                        .value,
                                            })
                                        }
                                        className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                                    >
                                        <option value="PERSONAL">
                                            PERSONAL
                                        </option>

                                        <option value="STUDY">
                                            STUDY
                                        </option>

                                        <option value="WORK">
                                            WORK
                                        </option>

                                        <option value="FITNESS">
                                            FITNESS
                                        </option>

                                        <option value="NUTRITION">
                                            NUTRITION
                                        </option>

                                        <option value="HAIR_CARE">
                                            HAIR CARE
                                        </option>

                                        <option value="SKIN_CARE">
                                            SKIN CARE
                                        </option>

                                        <option value="SLEEP">
                                            SLEEP
                                        </option>

                                        <option value="SELF_CARE">
                                            SELF CARE
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label
                                        htmlFor="task-priority"
                                        className="mb-1.5 block text-sm font-medium"
                                    >
                                        Priority
                                    </label>

                                    <select
                                        id="task-priority"
                                        value={
                                            newTask.priority
                                        }
                                        onChange={(event) =>
                                            setNewTask({
                                                ...newTask,
                                                priority:
                                                    event
                                                        .target
                                                        .value,
                                            })
                                        }
                                        className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                                    >
                                        <option value="LOW">
                                            LOW
                                        </option>

                                        <option value="MEDIUM">
                                            MEDIUM
                                        </option>

                                        <option value="HIGH">
                                            HIGH
                                        </option>
                                    </select>
                                </div>
                            </div>

                            {/* DATE + TIME */}

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="task-date"
                                        className="mb-1.5 block text-sm font-medium"
                                    >
                                        Task Date
                                    </label>

                                    <input
                                        id="task-date"
                                        type="date"
                                        value={
                                            newTask.task_date
                                        }
                                        onChange={(event) =>
                                            setNewTask({
                                                ...newTask,
                                                task_date:
                                                    event
                                                        .target
                                                        .value,
                                            })
                                        }
                                        className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                                        required
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="task-time"
                                        className="mb-1.5 block text-sm font-medium"
                                    >
                                        Due Time
                                    </label>

                                    <input
                                        id="task-time"
                                        type="time"
                                        value={
                                            newTask.due_time
                                        }
                                        onChange={(event) =>
                                            setNewTask({
                                                ...newTask,
                                                due_time:
                                                    event
                                                        .target
                                                        .value,
                                            })
                                        }
                                        className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                                    />
                                </div>
                            </div>

                            {/* NOTES */}

                            <div>
                                <label
                                    htmlFor="task-notes"
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    Notes
                                </label>

                                <textarea
                                    id="task-notes"
                                    value={
                                        newTask.notes
                                    }
                                    onChange={(event) =>
                                        setNewTask({
                                            ...newTask,
                                            notes: event
                                                .target
                                                .value,
                                        })
                                    }
                                    placeholder="Complete at least 2 problems"
                                    rows={2}
                                    className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                                />
                            </div>

                            {/* BUTTONS */}

                            <div className="flex justify-end gap-3 border-t pt-5">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowAddTask(
                                            false,
                                        )
                                    }
                                    disabled={
                                        creatingTask
                                    }
                                    className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        creatingTask
                                    }
                                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Plus className="size-4" />

                                    {creatingTask
                                        ? "Adding..."
                                        : "Add Task"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

