"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from "react";
import {
    CalendarDays,
    CheckCircle2,
    Circle,
    Edit3,
    Flag,
    ListTodo,
    Plus,
    Target,
    Trash2,
    X,
} from "lucide-react";

import {
    createGoal,
    createTask,
    deleteGoal,
    deleteTask,
    getGoals,
    getTasks,
    subscribeToTaskSync,
    updateGoal,
    type Goal,
    type GoalCreate,
    type GoalUpdate,
    type Task,
} from "@/lib/api";

// ============================================================
// CONSTANTS
// ============================================================

const categories = [
    "PERSONAL",
    "WORK",
    "STUDY",
    "FITNESS",
    "HEALTH",
    "FINANCE",
    "CAREER",
    "OTHER",
];

const statuses = [
    "ACTIVE",
    "COMPLETED",
    "PAUSED",
];

// ============================================================
// HELPERS
// ============================================================

function getTodayDate(): string {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(
        now.getMonth() + 1,
    ).padStart(2, "0");
    const day = String(
        now.getDate(),
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getDefaultTargetDate(): string {
    const date = new Date();

    date.setDate(
        date.getDate() + 30,
    );

    const year = date.getFullYear();
    const month = String(
        date.getMonth() + 1,
    ).padStart(2, "0");
    const day = String(
        date.getDate(),
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(
    dateString: string,
): string {
    const date = new Date(
        `${dateString}T00:00:00`,
    );

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric",
        },
    ).format(date);
}

function calculateProgress(
    current: number,
    target: number,
): number {
    if (target <= 0) {
        return 0;
    }

    return Math.min(
        100,
        Math.max(
            0,
            Math.round(
                (current / target) *
                100,
            ),
        ),
    );
}

function getDaysRemaining(
    targetDate: string,
): number {
    const today = new Date(
        `${getTodayDate()}T00:00:00`,
    );

    const target = new Date(
        `${targetDate}T00:00:00`,
    );

    const difference =
        target.getTime() -
        today.getTime();

    return Math.ceil(
        difference /
        (1000 * 60 * 60 * 24),
    );
}

// ============================================================
// FORM TYPE
// ============================================================

type GoalForm = {
    title: string;
    description: string;
    category: string;
    start_date: string;
    target_date: string;
    status: string;
};

const emptyForm: GoalForm = {
    title: "",
    description: "",
    category: "PERSONAL",
    start_date: getTodayDate(),
    target_date: getDefaultTargetDate(),
    status: "ACTIVE",
};

// ============================================================
// GOAL CARD
// ============================================================

function GoalCard({
    goal,
    tasks,
    onEdit,
    onDelete,
}: {
    goal: Goal;
    tasks: Task[];
    onEdit: (goal: Goal) => void;
    onDelete: (goal: Goal) => void;
}) {
    const completedTasks = tasks.filter(
        (task) => task.completed,
    ).length;

    const taskProgress =
        tasks.length === 0
            ? 0
            : Math.round(
                (completedTasks / tasks.length) *
                100,
            );

    const progress = taskProgress;

    const daysRemaining =
        getDaysRemaining(
            goal.target_date,
        );

    const isCompleted =
        goal.status === "COMPLETED" ||
        progress >= 100;

    const deadlineLabel =
        isCompleted
            ? "Completed"
            : daysRemaining < 0
                ? `${Math.abs(daysRemaining)} days overdue`
                : daysRemaining === 0
                    ? "Due today"
                    : `${daysRemaining} days left`;

    return (
        <article className="rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
            {/* HEADER */}

            <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                    <div
                        className={[
                            "flex size-10 shrink-0 items-center justify-center rounded-xl",
                            isCompleted
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-primary/10 text-primary",
                        ].join(" ")}
                    >
                        {isCompleted ? (
                            <CheckCircle2 className="size-5" />
                        ) : (
                            <Target className="size-5" />
                        )}
                    </div>

                    <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold">
                            {goal.title}
                        </h3>

                        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {goal.category}
                        </p>
                    </div>
                </div>

                {/* ACTIONS */}

                <div className="flex shrink-0 items-center gap-1">
                    <button
                        type="button"
                        onClick={() =>
                            onEdit(goal)
                        }
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={`Edit ${goal.title}`}
                    >
                        <Edit3 className="size-4" />
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            onDelete(goal)
                        }
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete ${goal.title}`}
                    >
                        <Trash2 className="size-4" />
                    </button>
                </div>
            </div>

            {/* DESCRIPTION */}

            {goal.description && (
                <p className="mt-4 line-clamp-2 text-sm leading-5 text-muted-foreground">
                    {goal.description}
                </p>
            )}

            {/* PROGRESS */}

            <div className="mt-5">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                        Progress
                    </span>

                    <span className="font-semibold">
                        {completedTasks}
                        {" / "}
                        {tasks.length} tasks
                    </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                        className={[
                            "h-full rounded-full transition-all",
                            isCompleted
                                ? "bg-emerald-500"
                                : "bg-primary",
                        ].join(" ")}
                        style={{
                            width: `${progress}%`,
                        }}
                    />
                </div>

                <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        {progress}% complete
                    </span>

                    <span
                        className={[
                            "text-xs font-medium",
                            isCompleted
                                ? "text-emerald-600"
                                : daysRemaining < 0
                                    ? "text-destructive"
                                    : "text-muted-foreground",
                        ].join(" ")}
                    >
                        {deadlineLabel}
                    </span>
                </div>
            </div>

            {/* LINKED TASKS */}

            <div className="mt-5 rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold">
                            Linked Tasks
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {tasks.length === 0
                                ? "No tasks linked to this goal yet."
                                : `${completedTasks} / ${tasks.length} completed`}
                        </p>
                    </div>

                    {tasks.length > 0 && (
                        <span className="text-xs font-semibold text-primary">
                            {taskProgress}%
                        </span>
                    )}
                </div>

                {tasks.length > 0 && (
                    <>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                                className={[
                                    "h-full rounded-full transition-all",
                                    taskProgress >= 100
                                        ? "bg-emerald-500"
                                        : "bg-primary",
                                ].join(" ")}
                                style={{
                                    width: `${taskProgress}%`,
                                }}
                            />
                        </div>

                        <div className="mt-3 space-y-2">
                            {tasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="flex items-start gap-2.5"
                                >
                                    {task.completed ? (
                                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                                    ) : (
                                        <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                    )}

                                    <div className="min-w-0">
                                        <p
                                            className={[
                                                "truncate text-sm",
                                                task.completed
                                                    ? "text-muted-foreground line-through"
                                                    : "text-foreground",
                                            ].join(" ")}
                                        >
                                            {task.title}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {formatDate(task.task_date)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* FOOTER */}

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" />
                    {formatDate(
                        goal.target_date,
                    )}
                </span>

                <span className="inline-flex items-center gap-1.5">
                    {goal.status ===
                        "COMPLETED" ? (
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                    ) : goal.status ===
                        "PAUSED" ? (
                        <Circle className="size-3.5" />
                    ) : (
                        <Flag className="size-3.5" />
                    )}

                    {goal.status}
                </span>
            </div>
        </article>
    );
}

// ============================================================
// GOAL FORM
// ============================================================

type GoalTaskDraft = {
    title: string;
    task_date: string;
    priority: string;
};

function GoalFormDialog({
    editingGoal,
    form,
    setForm,
    saving,
    error,
    tasks,
    onTasksChanged,
    onClose,
    onSubmit,
}: {
    editingGoal: Goal | null;
    form: GoalForm;
    setForm: React.Dispatch<
        React.SetStateAction<GoalForm>
    >;
    saving: boolean;
    error: string | null;
    tasks: Task[];
    onTasksChanged: () => Promise<void>;
    onClose: () => void;
    onSubmit: (
        event: FormEvent<HTMLFormElement>,
        pendingTasks: GoalTaskDraft[],
    ) => void;
}) {
    const [taskTitle, setTaskTitle] =
        useState("");

    const [taskDate, setTaskDate] =
        useState(form.start_date || getTodayDate());

    const [taskPriority, setTaskPriority] =
        useState("MEDIUM");

    const [pendingTasks, setPendingTasks] =
        useState<GoalTaskDraft[]>([]);

    const [taskSaving, setTaskSaving] =
        useState(false);

    const [taskError, setTaskError] =
        useState<string | null>(null);

    const addTask = async () => {
        const title = taskTitle.trim();

        if (!title) {
            setTaskError("Task title is required.");
            return;
        }

        if (!taskDate) {
            setTaskError("Task date is required.");
            return;
        }

        try {
            setTaskError(null);
            setTaskSaving(true);

            if (editingGoal) {
                await createTask({
                    title,
                    description: null,
                    goal_id: editingGoal.id,
                    category: editingGoal.category,
                    priority: taskPriority,
                    task_date: taskDate,
                    due_time: null,
                    notes: null,
                    recurrence_type: "NONE",
                    recurrence_end_date: null,
                    recurrence_days: [],
                    recurrence_interval: 1,
                });

                await onTasksChanged();
            } else {
                setPendingTasks((current) => [
                    ...current,
                    {
                        title,
                        task_date: taskDate,
                        priority: taskPriority,
                    },
                ]);
            }

            setTaskTitle("");
            setTaskDate(form.start_date || getTodayDate());
            setTaskPriority("MEDIUM");
        } catch (err) {
            setTaskError(
                err instanceof Error
                    ? err.message
                    : "Unable to add task.",
            );
        } finally {
            setTaskSaving(false);
        }
    };

    const removePendingTask = (index: number) => {
        setPendingTasks((current) =>
            current.filter(
                (_, taskIndex) =>
                    taskIndex !== index,
            ),
        );
    };

    const removeExistingTask = async (
        task: Task,
    ) => {
        try {
            setTaskError(null);
            setTaskSaving(true);

            await deleteTask(task.id);
            await onTasksChanged();
        } catch (err) {
            setTaskError(
                err instanceof Error
                    ? err.message
                    : "Unable to delete task.",
            );
        } finally {
            setTaskSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
        >
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-card shadow-2xl">
                {/* HEADER */}

                <div className="flex items-center justify-between border-b px-6 py-5">
                    <div>
                        <h2 className="text-lg font-semibold">
                            {editingGoal
                                ? "Edit Goal"
                                : "Create Goal"}
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            {editingGoal
                                ? "Update your goal and its progress."
                                : "Set a clear target and start tracking your progress."}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* FORM */}

                <form
                    onSubmit={(event) =>
                        onSubmit(
                            event,
                            pendingTasks,
                        )
                    }
                    className="space-y-5 p-6"
                >
                    {/* TITLE */}

                    <div>
                        <label className="text-sm font-medium">
                            Goal title
                        </label>

                        <input
                            value={form.title}
                            onChange={(event) =>
                                setForm(
                                    (current) => ({
                                        ...current,
                                        title: event
                                            .target
                                            .value,
                                    }),
                                )
                            }
                            placeholder="e.g. Learn Python"
                            maxLength={200}
                            required
                            disabled={saving}
                            className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                        />
                    </div>

                    {/* DESCRIPTION */}

                    <div>
                        <label className="text-sm font-medium">
                            Description
                        </label>

                        <textarea
                            value={
                                form.description
                            }
                            onChange={(event) =>
                                setForm(
                                    (current) => ({
                                        ...current,
                                        description:
                                            event
                                                .target
                                                .value,
                                    }),
                                )
                            }
                            placeholder="What do you want to achieve?"
                            rows={3}
                            maxLength={5000}
                            disabled={saving}
                            className="mt-2 w-full resize-none rounded-xl border bg-background px-3 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                        />
                    </div>

                    {/* CATEGORY + STATUS */}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">
                                Category
                            </label>

                            <select
                                value={
                                    form.category
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm(
                                        (
                                            current,
                                        ) => ({
                                            ...current,
                                            category:
                                                event
                                                    .target
                                                    .value,
                                        }),
                                    )
                                }
                                disabled={saving}
                                className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                            >
                                {categories.map(
                                    (
                                        category,
                                    ) => (
                                        <option
                                            key={
                                                category
                                            }
                                            value={
                                                category
                                            }
                                        >
                                            {
                                                category
                                            }
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium">
                                Status
                            </label>

                            <select
                                value={
                                    form.status
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm(
                                        (
                                            current,
                                        ) => ({
                                            ...current,
                                            status:
                                                event
                                                    .target
                                                    .value,
                                        }),
                                    )
                                }
                                disabled={saving}
                                className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                            >
                                {statuses.map(
                                    (
                                        status,
                                    ) => (
                                        <option
                                            key={
                                                status
                                            }
                                            value={
                                                status
                                            }
                                        >
                                            {
                                                status
                                            }
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>
                    </div>

                    {/* DATES */}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">
                                Start date
                            </label>

                            <input
                                type="date"
                                value={
                                    form.start_date
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm(
                                        (
                                            current,
                                        ) => ({
                                            ...current,
                                            start_date:
                                                event
                                                    .target
                                                    .value,
                                        }),
                                    )
                                }
                                required
                                disabled={saving}
                                className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">
                                Target date
                            </label>

                            <input
                                type="date"
                                value={
                                    form.target_date
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm(
                                        (
                                            current,
                                        ) => ({
                                            ...current,
                                            target_date:
                                                event
                                                    .target
                                                    .value,
                                        }),
                                    )
                                }
                                required
                                disabled={saving}
                                className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                            />
                        </div>
                    </div>

                    {/* TASKS */}

                    <div className="rounded-2xl border bg-muted/20 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-semibold">
                                    Tasks for this goal
                                </h3>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    Add the tasks you want to complete as part of this goal.
                                </p>
                            </div>

                            <span className="rounded-full bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                {editingGoal
                                    ? `${tasks.length} linked`
                                    : `${pendingTasks.length} added`}
                            </span>
                        </div>

                        <div className="mt-4 rounded-xl border border-dashed border-primary/25 bg-primary/[0.03] p-3">
                            <div className="mb-2.5 flex items-center gap-2 px-1">
                                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Plus className="size-3.5" />
                                </div>

                                <div>
                                    <p className="text-xs font-semibold text-foreground">
                                        Add new task
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        Add an actionable step for this goal.
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_155px_135px_125px]">
                                <div className="relative">
                                    <ListTodo className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                                    <input
                                        value={taskTitle}
                                        onChange={(event) =>
                                            setTaskTitle(
                                                event.target.value,
                                            )
                                        }
                                        onKeyDown={(event) => {
                                            if (
                                                event.key === "Enter"
                                            ) {
                                                event.preventDefault();
                                                void addTask();
                                            }
                                        }}
                                        placeholder="Task title"
                                        maxLength={200}
                                        disabled={
                                            saving ||
                                            taskSaving
                                        }
                                        className="h-11 w-full rounded-lg border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>

                                <div className="relative">
                                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                                    <input
                                        type="date"
                                        value={taskDate}
                                        min={form.start_date}
                                        max={form.target_date}
                                        onChange={(event) =>
                                            setTaskDate(
                                                event.target.value,
                                            )
                                        }
                                        disabled={
                                            saving ||
                                            taskSaving
                                        }
                                        className="h-11 w-full rounded-lg border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>

                                <div className="relative">
                                    <Flag className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                                    <select
                                        value={taskPriority}
                                        onChange={(event) =>
                                            setTaskPriority(
                                                event.target.value,
                                            )
                                        }
                                        disabled={
                                            saving ||
                                            taskSaving
                                        }
                                        className="h-11 w-full appearance-none rounded-lg border bg-background pl-10 pr-8 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="LOW">
                                            Low
                                        </option>
                                        <option value="MEDIUM">
                                            Medium
                                        </option>
                                        <option value="HIGH">
                                            High
                                        </option>
                                    </select>

                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                        ▾
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        void addTask()
                                    }
                                    disabled={
                                        saving ||
                                        taskSaving ||
                                        !taskTitle.trim()
                                    }
                                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                                >
                                    <Plus className="size-4" />
                                    Add Task
                                </button>
                            </div>
                        </div>

                        {taskError && (
                            <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                                {taskError}
                            </div>
                        )}

                        {editingGoal && tasks.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {tasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="group flex items-center gap-3 rounded-xl border bg-background px-3 py-3 transition hover:border-primary/20 hover:shadow-sm"
                                    >
                                        {task.completed ? (
                                            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                                        ) : (
                                            <Circle className="size-4 shrink-0 text-muted-foreground" />
                                        )}

                                        <div className="min-w-0 flex-1">
                                            <p
                                                className={[
                                                    "truncate text-sm font-medium",
                                                    task.completed
                                                        ? "text-muted-foreground line-through"
                                                        : "",
                                                ].join(" ")}
                                            >
                                                {task.title}
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                {formatDate(
                                                    task.task_date,
                                                )}{" "}
                                                ·{" "}
                                                {task.priority}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                void removeExistingTask(
                                                    task,
                                                )
                                            }
                                            disabled={
                                                saving ||
                                                taskSaving
                                            }
                                            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                                            aria-label={`Delete ${task.title}`}
                                            title="Delete task"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!editingGoal &&
                            pendingTasks.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {pendingTasks.map(
                                        (
                                            task,
                                            index,
                                        ) => (
                                            <div
                                                key={`${task.title}-${index}`}
                                                className="group flex items-center gap-3 rounded-xl border bg-background px-3 py-3 transition hover:border-primary/20 hover:shadow-sm"
                                            >
                                                <Circle className="size-4 shrink-0 text-muted-foreground" />

                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">
                                                        {
                                                            task.title
                                                        }
                                                    </p>
                                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                        {formatDate(
                                                            task.task_date,
                                                        )}{" "}
                                                        ·{" "}
                                                        {
                                                            task.priority
                                                        }
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removePendingTask(
                                                            index,
                                                        )
                                                    }
                                                    disabled={
                                                        saving ||
                                                        taskSaving
                                                    }
                                                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                                                    aria-label={`Remove ${task.title}`}
                                                    title="Remove task"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        ),
                                    )}
                                </div>
                            )}

                        {!editingGoal &&
                            pendingTasks.length === 0 && (
                                <p className="mt-4 rounded-lg border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">
                                    No tasks added yet. You can add them now or later from Tasks.
                                </p>
                            )}
                    </div>

                    {/* ERROR */}

                    {error && (
                        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    {/* ACTIONS */}

                    <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="h-11 rounded-xl border px-5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? (
                                "Saving..."
                            ) : editingGoal ? (
                                <>
                                    <Edit3 className="size-4" />
                                    Update Goal
                                </>
                            ) : (
                                <>
                                    <Plus className="size-4" />
                                    Create Goal
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ============================================================
// DELETE DIALOG
// ============================================================

function DeleteGoalDialog({
    goal,
    deleting,
    error,
    onCancel,
    onConfirm,
}: {
    goal: Goal;
    deleting: boolean;
    error: string | null;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
        >
            <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
                <div className="flex items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <Trash2 className="size-5" />
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold">
                            Delete this goal?
                        </h2>

                        <p className="mt-1 text-sm leading-5 text-muted-foreground">
                            This will permanently
                            remove{" "}
                            <span className="font-medium text-foreground">
                                {goal.title}
                            </span>
                            .
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={deleting}
                        className="h-11 rounded-xl border px-5 text-sm font-medium hover:bg-muted disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={deleting}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-destructive px-5 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
                    >
                        <Trash2 className="size-4" />

                        {deleting
                            ? "Deleting..."
                            : "Delete Goal"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// MAIN GOALS VIEW
// ============================================================

export function GoalsView() {
    const [goals, setGoals] =
        useState<Goal[]>([]);

    const [tasks, setTasks] =
        useState<Task[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);

    const [showForm, setShowForm] =
        useState(false);

    const [editingGoal, setEditingGoal] =
        useState<Goal | null>(null);

    const [form, setForm] =
        useState<GoalForm>(emptyForm);

    const [saving, setSaving] =
        useState(false);

    const [deleteTarget, setDeleteTarget] =
        useState<Goal | null>(null);

    const [deleting, setDeleting] =
        useState(false);

    const [deleteError, setDeleteError] =
        useState<string | null>(null);

    // ========================================================
    // LOAD GOALS
    // ========================================================

    const loadGoals = useCallback(
        async () => {
            try {
                setLoading(true);
                setError(null);

                const data =
                    await getGoals();

                setGoals(data);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load goals.",
                );
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        loadGoals();
    }, [loadGoals]);

    // ========================================================
    // LOAD TASKS
    // ========================================================

    const loadTasks = useCallback(
        async () => {
            try {
                const data = await getTasks();
                setTasks(data);
            } catch {
                // Goal loading remains independent from task loading.
                setTasks([]);
            }
        },
        [],
    );

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    useEffect(() => {
        return subscribeToTaskSync((event) => {
            if (
                event.type === "created" ||
                event.type === "updated" ||
                event.type === "deleted" ||
                event.type === "series-deleted" ||
                event.type === "series-updated"
            ) {
                loadTasks();
            }
        });
    }, [loadTasks]);

    // ========================================================
    // STATS
    // ========================================================

    const stats = useMemo(() => {
        const getGoalProgress = (goal: Goal) => {
            const linked = tasks.filter(
                (task) => task.goal_id === goal.id,
            );

            if (linked.length === 0) {
                return 0;
            }

            return Math.round(
                (linked.filter((task) => task.completed).length /
                    linked.length) *
                100,
            );
        };

        const active = goals.filter(
            (goal) =>
                goal.status === "ACTIVE" &&
                getGoalProgress(goal) < 100,
        );

        const completed = goals.filter(
            (goal) =>
                goal.status === "COMPLETED" ||
                getGoalProgress(goal) >= 100,
        );

        const averageProgress =
            goals.length === 0
                ? 0
                : Math.round(
                    goals.reduce(
                        (total, goal) =>
                            total + getGoalProgress(goal),
                        0,
                    ) / goals.length,
                );

        return {
            total: goals.length,
            active: active.length,
            completed:
                completed.length,
            averageProgress,
        };
    }, [goals, tasks]);

    const activeGoals = useMemo(
        () =>
            goals.filter((goal) => {
                const linked = tasks.filter(
                    (task) => task.goal_id === goal.id,
                );

                const progress =
                    linked.length === 0
                        ? 0
                        : Math.round(
                            (linked.filter((task) => task.completed).length /
                                linked.length) *
                            100,
                        );

                return (
                    goal.status === "ACTIVE" &&
                    progress < 100
                );
            }),
        [goals, tasks],
    );

    const completedGoals = useMemo(
        () =>
            goals.filter((goal) => {
                const linked = tasks.filter(
                    (task) => task.goal_id === goal.id,
                );

                const progress =
                    linked.length === 0
                        ? 0
                        : Math.round(
                            (linked.filter((task) => task.completed).length /
                                linked.length) *
                            100,
                        );

                return (
                    goal.status === "COMPLETED" ||
                    progress >= 100
                );
            }),
        [goals, tasks],
    );

    const otherGoals = useMemo(
        () =>
            goals.filter(
                (goal) =>
                    !activeGoals.some(
                        (active) =>
                            active.id ===
                            goal.id,
                    ) &&
                    !completedGoals.some(
                        (completed) =>
                            completed.id ===
                            goal.id,
                    ),
            ),
        [
            goals,
            activeGoals,
            completedGoals,
        ],
    );

    // ========================================================
    // OPEN CREATE
    // ========================================================

    const openCreate = () => {
        setEditingGoal(null);
        setForm({
            ...emptyForm,
            start_date:
                getTodayDate(),
            target_date:
                getDefaultTargetDate(),
        });
        setError(null);
        setShowForm(true);
    };

    // ========================================================
    // OPEN EDIT
    // ========================================================

    const openEdit = (
        goal: Goal,
    ) => {
        setEditingGoal(goal);

        setForm({
            title: goal.title,
            description:
                goal.description ?? "",
            category:
                goal.category,
            start_date:
                goal.start_date,
            target_date:
                goal.target_date,
            status: goal.status,
        });

        setError(null);
        setShowForm(true);
    };

    // ========================================================
    // CLOSE FORM
    // ========================================================

    const closeForm = () => {
        if (saving) {
            return;
        }

        setShowForm(false);
        setEditingGoal(null);
        setError(null);
    };

    // ========================================================
    // SAVE GOAL
    // ========================================================

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
        pendingTasks: GoalTaskDraft[] = [],
    ) => {
        event.preventDefault();

        if (!form.title.trim()) {
            setError(
                "Goal title is required.",
            );
            return;
        }

        const linkedTasks = editingGoal
            ? tasks
                .filter(
                    (task) =>
                        task.goal_id ===
                        editingGoal.id,
                )
            : [];

        const totalTasks = editingGoal
            ? linkedTasks.length
            : pendingTasks.length;

        const completedTaskCount = editingGoal
            ? linkedTasks.filter(
                (task) => task.completed,
            ).length
            : 0;

        // Goal progress is task-driven. The backend still stores these
        // fields for compatibility, so keep them synchronized with tasks.
        // A minimum of 1 keeps compatibility with the existing Goal schema
        // when a user edits a goal that currently has no linked tasks.
        const targetValue = Math.max(
            1,
            totalTasks,
        );

        const currentValue = Math.min(
            completedTaskCount,
            targetValue,
        );

        if (!editingGoal && totalTasks === 0) {
            setError(
                "Add at least one task to create a goal.",
            );
            return;
        }

        if (
            form.target_date <
            form.start_date
        ) {
            setError(
                "Target date cannot be before start date.",
            );
            return;
        }

        try {
            setSaving(true);
            setError(null);

            if (editingGoal) {
                const data: GoalUpdate =
                {
                    title:
                        form.title.trim(),
                    description:
                        form.description.trim() ||
                        null,
                    category:
                        form.category,
                    target_value:
                        targetValue,
                    current_value:
                        currentValue,
                    start_date:
                        form.start_date,
                    target_date:
                        form.target_date,
                    status:
                        form.status,
                };

                const updated =
                    await updateGoal(
                        editingGoal.id,
                        data,
                    );

                setGoals(
                    (current) =>
                        current.map(
                            (goal) =>
                                goal.id ===
                                    updated.id
                                    ? updated
                                    : goal,
                        ),
                );

                await loadTasks();
            } else {
                const data: GoalCreate =
                {
                    title:
                        form.title.trim(),
                    description:
                        form.description.trim() ||
                        null,
                    category:
                        form.category,
                    target_value:
                        targetValue,
                    current_value:
                        currentValue,
                    start_date:
                        form.start_date,
                    target_date:
                        form.target_date,
                    status:
                        form.status,
                };

                const created =
                    await createGoal(
                        data,
                    );

                if (pendingTasks.length > 0) {
                    await Promise.all(
                        pendingTasks.map(
                            (task) =>
                                createTask({
                                    title: task.title,
                                    description: null,
                                    goal_id: created.id,
                                    category:
                                        created.category,
                                    priority:
                                        task.priority,
                                    task_date:
                                        task.task_date,
                                    due_time: null,
                                    notes: null,
                                    recurrence_type:
                                        "NONE",
                                    recurrence_end_date:
                                        null,
                                    recurrence_days: [],
                                    recurrence_interval: 1,
                                }),
                        ),
                    );
                }

                setGoals(
                    (current) => [
                        created,
                        ...current,
                    ],
                );

                await loadTasks();
            }

            closeForm();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to save goal.",
            );
        } finally {
            setSaving(false);
        }
    };

    // ========================================================
    // DELETE
    // ========================================================

    const openDelete = (
        goal: Goal,
    ) => {
        setDeleteTarget(goal);
        setDeleteError(null);
    };

    const closeDelete = () => {
        if (deleting) {
            return;
        }

        setDeleteTarget(null);
        setDeleteError(null);
    };

    const handleDelete = async () => {
        if (!deleteTarget) {
            return;
        }

        try {
            setDeleting(true);
            setDeleteError(null);

            await deleteGoal(
                deleteTarget.id,
            );

            setGoals(
                (current) =>
                    current.filter(
                        (goal) =>
                            goal.id !==
                            deleteTarget.id,
                    ),
            );

            closeDelete();
        } catch (err) {
            setDeleteError(
                err instanceof Error
                    ? err.message
                    : "Unable to delete goal.",
            );
        } finally {
            setDeleting(false);
        }
    };

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
                            Long-term progress
                        </p>

                        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                            Goals
                        </h1>

                        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                            Turn your bigger ambitions
                            into measurable goals and
                            keep moving forward.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={openCreate}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                    >
                        <Plus className="size-4" />
                        Create Goal
                    </button>
                </section>

                {/* ================================================= */}
                {/* ERROR */}
                {/* ================================================= */}

                {error && !showForm && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {/* ================================================= */}
                {/* STATS */}
                {/* ================================================= */}

                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border bg-card p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Target className="size-4" />
                            </div>

                            <p className="text-sm text-muted-foreground">
                                Total goals
                            </p>
                        </div>

                        <p className="mt-4 text-2xl font-semibold">
                            {stats.total}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-card p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                                <Flag className="size-4" />
                            </div>

                            <p className="text-sm text-muted-foreground">
                                Active
                            </p>
                        </div>

                        <p className="mt-4 text-2xl font-semibold">
                            {stats.active}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-card p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                                <CheckCircle2 className="size-4" />
                            </div>

                            <p className="text-sm text-muted-foreground">
                                Completed
                            </p>
                        </div>

                        <p className="mt-4 text-2xl font-semibold">
                            {stats.completed}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-card p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                                <Target className="size-4" />
                            </div>

                            <p className="text-sm text-muted-foreground">
                                Average progress
                            </p>
                        </div>

                        <p className="mt-4 text-2xl font-semibold">
                            {stats.averageProgress}%
                        </p>
                    </div>
                </section>

                {/* ================================================= */}
                {/* LOADING */}
                {/* ================================================= */}

                {loading ? (
                    <section className="grid gap-4 md:grid-cols-2">
                        {[1, 2, 3, 4].map(
                            (item) => (
                                <div
                                    key={
                                        item
                                    }
                                    className="h-64 animate-pulse rounded-2xl border bg-card"
                                />
                            ),
                        )}
                    </section>
                ) : goals.length ===
                    0 ? (
                    /* ================================================= */
                    /* EMPTY STATE */
                    /* ================================================= */

                    <section className="rounded-2xl border border-dashed bg-card p-10 text-center">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Target className="size-7" />
                        </div>

                        <h2 className="mt-5 text-lg font-semibold">
                            No goals yet
                        </h2>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                            Create your first goal
                            and start turning your
                            plans into measurable
                            progress.
                        </p>

                        <button
                            type="button"
                            onClick={
                                openCreate
                            }
                            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
                        >
                            <Plus className="size-4" />
                            Create your first
                            goal
                        </button>
                    </section>
                ) : (
                    <div className="space-y-8">
                        {/* ================================================= */}
                        {/* ACTIVE */}
                        {/* ================================================= */}

                        {activeGoals.length >
                            0 && (
                                <section>
                                    <div className="mb-4 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg font-semibold">
                                                Active Goals
                                            </h2>

                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Keep making
                                                progress on
                                                what matters.
                                            </p>
                                        </div>

                                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                            {
                                                activeGoals.length
                                            }
                                        </span>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        {activeGoals.map(
                                            (
                                                goal,
                                            ) => (
                                                <GoalCard
                                                    key={
                                                        goal.id
                                                    }
                                                    goal={goal}
                                                    tasks={tasks.filter(
                                                        (task) =>
                                                            task.goal_id ===
                                                            goal.id,
                                                    )}
                                                    onEdit={
                                                        openEdit
                                                    }
                                                    onDelete={
                                                        openDelete
                                                    }
                                                />
                                            ),
                                        )}
                                    </div>
                                </section>
                            )}

                        {/* ================================================= */}
                        {/* OTHER */}
                        {/* ================================================= */}

                        {otherGoals.length >
                            0 && (
                                <section>
                                    <div className="mb-4">
                                        <h2 className="text-lg font-semibold">
                                            Other Goals
                                        </h2>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Paused and
                                            other goals.
                                        </p>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        {otherGoals.map(
                                            (
                                                goal,
                                            ) => (
                                                <GoalCard
                                                    key={
                                                        goal.id
                                                    }
                                                    goal={goal}
                                                    tasks={tasks.filter(
                                                        (task) =>
                                                            task.goal_id ===
                                                            goal.id,
                                                    )}
                                                    onEdit={
                                                        openEdit
                                                    }
                                                    onDelete={
                                                        openDelete
                                                    }
                                                />
                                            ),
                                        )}
                                    </div>
                                </section>
                            )}

                        {/* ================================================= */}
                        {/* COMPLETED */}
                        {/* ================================================= */}

                        {completedGoals.length >
                            0 && (
                                <section>
                                    <div className="mb-4">
                                        <h2 className="text-lg font-semibold">
                                            Completed Goals
                                        </h2>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Goals you have
                                            successfully
                                            achieved.
                                        </p>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        {completedGoals.map(
                                            (
                                                goal,
                                            ) => (
                                                <GoalCard
                                                    key={
                                                        goal.id
                                                    }
                                                    goal={goal}
                                                    tasks={tasks.filter(
                                                        (task) =>
                                                            task.goal_id ===
                                                            goal.id,
                                                    )}
                                                    onEdit={
                                                        openEdit
                                                    }
                                                    onDelete={
                                                        openDelete
                                                    }
                                                />
                                            ),
                                        )}
                                    </div>
                                </section>
                            )}
                    </div>
                )}
            </div>

            {/* ====================================================== */}
            {/* CREATE / EDIT */}
            {/* ====================================================== */}

            {showForm && (
                <GoalFormDialog
                    editingGoal={
                        editingGoal
                    }
                    form={form}
                    setForm={setForm}
                    saving={saving}
                    error={error}
                    tasks={editingGoal
                        ? tasks.filter(
                            (task) =>
                                task.goal_id ===
                                editingGoal.id,
                        )
                        : []}
                    onTasksChanged={
                        loadTasks
                    }
                    onClose={
                        closeForm
                    }
                    onSubmit={
                        handleSubmit
                    }
                />
            )}

            {/* ====================================================== */}
            {/* DELETE */}
            {/* ====================================================== */}

            {deleteTarget && (
                <DeleteGoalDialog
                    goal={
                        deleteTarget
                    }
                    deleting={
                        deleting
                    }
                    error={
                        deleteError
                    }
                    onCancel={
                        closeDelete
                    }
                    onConfirm={
                        handleDelete
                    }
                />
            )}
        </>
    );
}