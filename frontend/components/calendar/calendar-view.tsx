"use client";

import {
    CalendarDays,
    Check,
    ChevronLeft,
    ChevronRight,
    Circle,
    Clock3,
    ListChecks,
    Loader2,
    Pencil,
    Plus,
    Repeat2,
    Trash2,
    X,
} from "lucide-react";
import {
    FormEvent,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    createTask,
    deleteTask,
    deleteTaskSeries,
    getTasks,
    subscribeToTaskSync,
    updateTask,
    updateTaskSeries,
    type Task as ApiTask,
    type RecurrenceType,
} from "@/lib/api";

// ============================================================
// HELPERS
// ============================================================

function pad(value: number): string {
    return String(value).padStart(2, "0");
}

function getDateKey(date: Date): string {
    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate()),
    ].join("-");
}

function getTodayKey(): string {
    return getDateKey(new Date());
}

function getMonthInputValue(
    date: Date,
): string {
    return `${date.getFullYear()}-${pad(
        date.getMonth() + 1,
    )}`;
}

function formatSelectedDate(
    dateKey: string,
): string {
    const [year, month, day] =
        dateKey.split("-").map(Number);

    return new Intl.DateTimeFormat(
        "en-US",
        {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        },
    ).format(
        new Date(
            year,
            month - 1,
            day,
        ),
    );
}

function getCategoryLabel(
    category: string,
): string {
    return category
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) =>
            letter.toUpperCase(),
        );
}

function getPriorityClass(
    priority: string,
): string {
    switch (
    priority.toUpperCase()
    ) {
        case "HIGH":
            return "text-red-500";

        case "MEDIUM":
            return "text-orange-500";

        case "LOW":
            return "text-emerald-500";

        default:
            return "text-muted-foreground";
    }
}

// ============================================================
// TYPES
// ============================================================

type CalendarDay = {
    date: Date;
    dateKey: string;
    dayNumber: number;
    isCurrentMonth: boolean;
};

type TaskForm = {
    title: string;
    description: string;
    category: string;
    priority: string;
    task_date: string;
    due_time: string;
    notes: string;
    recurrence_type: RecurrenceType;
    recurrence_end_date: string;
    recurrence_days: number[];
    recurrence_interval: number;
};

// ============================================================
// INITIAL FORM
// ============================================================

function createEmptyForm(
    date: string,
): TaskForm {
    return {
        title: "",
        description: "",
        category: "PERSONAL",
        priority: "MEDIUM",
        task_date: date,
        due_time: "",
        notes: "",
        recurrence_type: "NONE",
        recurrence_end_date: date,
        recurrence_days: [],
        recurrence_interval: 1,
    };
}

// ============================================================
// CALENDAR VIEW
// ============================================================

export function CalendarView() {
    const todayKey = getTodayKey();

    const now = new Date();

    const [currentMonth, setCurrentMonth] =
        useState(
            new Date(
                now.getFullYear(),
                now.getMonth(),
                1,
            ),
        );

    const [selectedDate, setSelectedDate] =
        useState(todayKey);

    const [tasks, setTasks] =
        useState<ApiTask[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);

    const [showTaskModal, setShowTaskModal] =
        useState(false);

    const [editingTask, setEditingTask] =
        useState<ApiTask | null>(null);

    const [editScope, setEditScope] =
        useState<"single" | "series">("single");

    const [deletingTask, setDeletingTask] =
        useState<ApiTask | null>(null);

    const [deleteScope, setDeleteScope] =
        useState<"single" | "series">("single");

    const [saving, setSaving] =
        useState(false);

    const [deleting, setDeleting] =
        useState(false);

    const [updatingTaskId, setUpdatingTaskId] =
        useState<number | null>(null);

    const [form, setForm] =
        useState<TaskForm>(
            createEmptyForm(
                todayKey,
            ),
        );

    // ========================================================
    // LOAD TASKS
    // ========================================================

    async function loadTasks(
        showLoader = true,
    ) {
        try {
            if (showLoader) {
                setLoading(true);
            }

            setError(null);

            const data =
                await getTasks();

            setTasks(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load tasks.",
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadTasks();
    }, []);

    // ========================================================
    // CROSS-PAGE TASK SYNCHRONIZATION
    // ========================================================

    useEffect(() => {
        const unsubscribe = subscribeToTaskSync((event) => {
            if (event.type === "created") {
                if (!event.task) {
                    return;
                }

                setTasks((current) => {
                    const exists = current.some(
                        (task) => task.id === event.task!.id,
                    );

                    if (exists) {
                        return current;
                    }

                    return [...current, event.task!];
                });

                return;
            }

            if (event.type === "updated") {
                if (!event.task) {
                    return;
                }

                setTasks((current) =>
                    current.map((task) =>
                        task.id === event.task!.id
                            ? event.task!
                            : task,
                    ),
                );

                setEditingTask((current) => {
                    if (current?.id !== event.task!.id) {
                        return current;
                    }

                    return event.task!;
                });

                return;
            }

            if (event.type === "series-updated") {
                if (!event.recurrenceId) {
                    return;
                }

                void loadTasks(false);

                return;
            }

            if (event.type === "series-deleted") {
                if (!event.recurrenceId) {
                    return;
                }

                setTasks((current) =>
                    current.filter(
                        (task) =>
                            task.recurrence_id !==
                            event.recurrenceId,
                    ),
                );

                setEditingTask((current) =>
                    current?.recurrence_id ===
                        event.recurrenceId
                        ? null
                        : current,
                );

                setDeletingTask((current) =>
                    current?.recurrence_id ===
                        event.recurrenceId
                        ? null
                        : current,
                );

                setDeleteScope("single");

                return;
            }

            if (event.type === "deleted") {
                if (typeof event.taskId !== "number") {
                    return;
                }

                setTasks((current) =>
                    current.filter(
                        (task) => task.id !== event.taskId,
                    ),
                );

                setEditingTask((current) =>
                    current?.id === event.taskId
                        ? null
                        : current,
                );

                setDeletingTask((current) =>
                    current?.id === event.taskId
                        ? null
                        : current,
                );
            }
        });

        return unsubscribe;
    }, []);

    // ========================================================
    // CALENDAR DAYS
    // ========================================================

    const calendarDays =
        useMemo<CalendarDay[]>(() => {
            const year =
                currentMonth.getFullYear();

            const month =
                currentMonth.getMonth();

            const firstDay =
                new Date(
                    year,
                    month,
                    1,
                );

            const lastDay =
                new Date(
                    year,
                    month + 1,
                    0,
                );

            // Monday = 0
            const firstWeekday =
                (firstDay.getDay() + 6) % 7;

            const daysInMonth =
                lastDay.getDate();

            const days: CalendarDay[] =
                [];

            // Previous month
            for (
                let i = firstWeekday;
                i > 0;
                i--
            ) {
                const date =
                    new Date(
                        year,
                        month,
                        1 - i,
                    );

                days.push({
                    date,
                    dateKey:
                        getDateKey(
                            date,
                        ),
                    dayNumber:
                        date.getDate(),
                    isCurrentMonth:
                        false,
                });
            }

            // Current month
            for (
                let day = 1;
                day <= daysInMonth;
                day++
            ) {
                const date =
                    new Date(
                        year,
                        month,
                        day,
                    );

                days.push({
                    date,
                    dateKey:
                        getDateKey(
                            date,
                        ),
                    dayNumber: day,
                    isCurrentMonth:
                        true,
                });
            }

            // Next month
            const remaining =
                (7 -
                    (days.length % 7)) %
                7;

            for (
                let day = 1;
                day <= remaining;
                day++
            ) {
                const date =
                    new Date(
                        year,
                        month + 1,
                        day,
                    );

                days.push({
                    date,
                    dateKey:
                        getDateKey(
                            date,
                        ),
                    dayNumber: day,
                    isCurrentMonth:
                        false,
                });
            }

            return days;
        }, [currentMonth]);

    // ========================================================
    // TASKS BY DATE
    // ========================================================

    const tasksByDate =
        useMemo(() => {
            const grouped =
                new Map<
                    string,
                    ApiTask[]
                >();

            for (const task of tasks) {
                const existing =
                    grouped.get(
                        task.task_date,
                    ) ?? [];

                existing.push(task);

                grouped.set(
                    task.task_date,
                    existing,
                );
            }

            return grouped;
        }, [tasks]);

    // ========================================================
    // SELECTED TASKS
    // ========================================================

    const selectedDateTasks =
        useMemo(() => {
            return (
                tasksByDate.get(
                    selectedDate,
                ) ?? []
            )
                .slice()
                .sort((a, b) => {
                    if (
                        a.completed !==
                        b.completed
                    ) {
                        return a.completed
                            ? 1
                            : -1;
                    }

                    if (
                        a.due_time &&
                        b.due_time
                    ) {
                        return a.due_time.localeCompare(
                            b.due_time,
                        );
                    }

                    if (a.due_time) {
                        return -1;
                    }

                    if (b.due_time) {
                        return 1;
                    }

                    return a.id - b.id;
                });
        }, [
            selectedDate,
            tasksByDate,
        ]);

    // ========================================================
    // SELECTED DATE STATS
    // ========================================================

    const selectedTotalTasks =
        selectedDateTasks.length;

    const selectedCompletedTasks =
        selectedDateTasks.filter(
            (task) => task.completed,
        ).length;

    const selectedProgress =
        selectedTotalTasks === 0
            ? 0
            : Math.round(
                (selectedCompletedTasks /
                    selectedTotalTasks) *
                100,
            );

    // ========================================================
    // MONTH LABEL
    // ========================================================

    const monthLabel =
        new Intl.DateTimeFormat(
            "en-US",
            {
                month: "long",
                year: "numeric",
            },
        ).format(currentMonth);

    // ========================================================
    // NAVIGATION
    // ========================================================

    function goToPreviousMonth() {
        setCurrentMonth(
            (current) =>
                new Date(
                    current.getFullYear(),
                    current.getMonth() - 1,
                    1,
                ),
        );
    }

    function goToNextMonth() {
        setCurrentMonth(
            (current) =>
                new Date(
                    current.getFullYear(),
                    current.getMonth() + 1,
                    1,
                ),
        );
    }

    function goToToday() {
        const today =
            new Date();

        setCurrentMonth(
            new Date(
                today.getFullYear(),
                today.getMonth(),
                1,
            ),
        );

        setSelectedDate(
            getTodayKey(),
        );
    }

    // ========================================================
    // SELECT DATE
    // ========================================================

    function selectDate(
        day: CalendarDay,
    ) {
        setSelectedDate(
            day.dateKey,
        );

        if (
            !day.isCurrentMonth
        ) {
            setCurrentMonth(
                new Date(
                    day.date.getFullYear(),
                    day.date.getMonth(),
                    1,
                ),
            );
        }
    }

    // ========================================================
    // OPEN CREATE MODAL
    // ========================================================

    function openCreateModal(
        date = selectedDate,
    ) {
        setEditingTask(null);

        setForm(
            createEmptyForm(date),
        );

        setShowTaskModal(true);

        setError(null);
    }

    // ========================================================
    // OPEN EDIT MODAL
    // ========================================================

    function openEditModal(
        task: ApiTask,
    ) {
        setEditingTask(task);

        setEditScope("single");

        setForm({
            title: task.title,
            description:
                task.description ?? "",
            category:
                task.category,
            priority:
                task.priority,
            task_date:
                task.task_date,
            due_time:
                task.due_time ?? "",
            notes:
                task.notes ?? "",
            recurrence_type:
                task.recurrence_type,
            recurrence_end_date:
                task.recurrence_end_date ??
                task.task_date,
            recurrence_days:
                Array.isArray(task.recurrence_days)
                    ? task.recurrence_days
                    : [],
            recurrence_interval:
                task.recurrence_interval ?? 1,
        });

        setShowTaskModal(true);

        setError(null);
    }

    // ========================================================
    // CLOSE MODAL
    // ========================================================

    function closeTaskModal() {
        if (saving) {
            return;
        }

        setShowTaskModal(false);

        setEditingTask(null);

        setEditScope("single");

        setDeleteScope("single");
    }

    // ========================================================
    // SUBMIT TASK
    // ========================================================

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        const title =
            form.title.trim();

        if (!title) {
            setError(
                "Task title is required.",
            );

            return;
        }

        if (
            form.recurrence_type !== "NONE" &&
            !form.recurrence_end_date
        ) {
            setError(
                "Please select a repeat-until date.",
            );

            return;
        }

        if (
            form.recurrence_type !== "NONE" &&
            form.recurrence_end_date <
            form.task_date
        ) {
            setError(
                "Repeat-until date must be on or after the task date.",
            );

            return;
        }

        if (
            form.recurrence_type === "CUSTOM" &&
            form.recurrence_days.length === 0
        ) {
            setError(
                "Please select at least one day for custom recurrence.",
            );

            return;
        }

        if (
            form.recurrence_type !== "NONE" &&
            (!Number.isInteger(form.recurrence_interval) ||
                form.recurrence_interval < 1 ||
                form.recurrence_interval > 52)
        ) {
            setError(
                "Repeat interval must be between 1 and 52 weeks.",
            );

            return;
        }

        try {
            setSaving(true);

            setError(null);

            if (editingTask) {
                // ============================================
                // UPDATE EXISTING OCCURRENCE
                // ============================================

                const updateData = {
                    title,

                    description:
                        form.description.trim() ||
                        null,

                    category:
                        form.category,

                    priority:
                        form.priority,

                    task_date:
                        form.task_date,

                    due_time:
                        form.due_time ||
                        null,

                    notes:
                        form.notes.trim() ||
                        null,

                    ...(editScope === "series"
                        ? {
                            recurrence_type:
                                form.recurrence_type,

                            recurrence_end_date:
                                form.recurrence_type !== "NONE"
                                    ? form.recurrence_end_date
                                    : null,

                            recurrence_days:
                                form.recurrence_type === "CUSTOM"
                                    ? form.recurrence_days
                                    : [],

                            recurrence_interval:
                                form.recurrence_type === "NONE"
                                    ? 1
                                    : form.recurrence_interval,
                        }
                        : {}),
                };

                const updated =
                    editScope === "series"
                        ? await updateTaskSeries(
                            editingTask.id,
                            updateData,
                        )
                        : await updateTask(
                            editingTask.id,
                            updateData,
                        );

                if (editScope === "series") {
                    await loadTasks(false);
                } else {
                    setTasks((current) =>
                        current.map((task) =>
                            task.id === updated.id
                                ? updated
                                : task,
                        ),
                    );
                }

                setSelectedDate(
                    updated.task_date,
                );

                setCurrentMonth(
                    new Date(
                        Number(
                            updated.task_date.slice(
                                0,
                                4,
                            ),
                        ),
                        Number(
                            updated.task_date.slice(
                                5,
                                7,
                            ),
                        ) - 1,
                        1,
                    ),
                );
            } else {
                // ============================================
                // CREATE TASK
                // ============================================

                await createTask({
                    title,
                    description:
                        form.description.trim() ||
                        null,
                    category:
                        form.category,
                    priority:
                        form.priority,
                    task_date:
                        form.task_date,
                    due_time:
                        form.due_time ||
                        null,
                    notes:
                        form.notes.trim() ||
                        null,
                    recurrence_type:
                        form.recurrence_type,
                    recurrence_end_date:
                        form.recurrence_type !== "NONE"
                            ? form.recurrence_end_date
                            : null,
                    recurrence_days:
                        form.recurrence_type === "CUSTOM"
                            ? form.recurrence_days
                            : [],
                    recurrence_interval:
                        form.recurrence_type === "NONE"
                            ? 1
                            : form.recurrence_interval,
                });

                /*
                 * For DAILY recurrence the backend creates
                 * multiple rows. Therefore refresh the full
                 * task list instead of adding only the response.
                 */
                await loadTasks(false);

                setSelectedDate(
                    form.task_date,
                );

                setCurrentMonth(
                    new Date(
                        Number(
                            form.task_date.slice(
                                0,
                                4,
                            ),
                        ),
                        Number(
                            form.task_date.slice(
                                5,
                                7,
                            ),
                        ) - 1,
                        1,
                    ),
                );
            }

            setShowTaskModal(false);

            setEditingTask(null);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to save task.",
            );
        } finally {
            setSaving(false);
        }
    }

    // ========================================================
    // DELETE TASK
    // ========================================================

    async function confirmDelete() {
        if (!deletingTask) {
            return;
        }

        try {
            setDeleting(true);

            setError(null);

            if (
                deleteScope === "series" &&
                deletingTask.recurrence_id
            ) {
                await deleteTaskSeries(
                    deletingTask.recurrence_id,
                );

                setTasks(
                    (current) =>
                        current.filter(
                            (task) =>
                                task.recurrence_id !==
                                deletingTask.recurrence_id,
                        ),
                );
            } else {
                await deleteTask(
                    deletingTask.id,
                );

                setTasks(
                    (current) =>
                        current.filter(
                            (task) =>
                                task.id !==
                                deletingTask.id,
                        ),
                );
            }

            setDeletingTask(null);
            setDeleteScope("single");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to delete task.",
            );
        } finally {
            setDeleting(false);
        }
    }

    // ========================================================
    // TOGGLE COMPLETION
    // ========================================================

    async function toggleTask(
        task: ApiTask,
    ) {
        try {
            setUpdatingTaskId(
                task.id,
            );

            setError(null);

            const updated =
                await updateTask(
                    task.id,
                    {
                        completed:
                            !task.completed,
                    },
                );

            setTasks(
                (current) =>
                    current.map(
                        (item) =>
                            item.id ===
                                updated.id
                                ? updated
                                : item,
                    ),
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to update task.",
            );
        } finally {
            setUpdatingTaskId(null);
        }
    }

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <>
            <div className="space-y-6">
                {/* ================================================= */}
                {/* HEADER */}
                {/* ================================================= */}

                <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <CalendarDays className="size-4" />

                            Calendar
                        </div>

                        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                            Plan your days
                        </h1>

                        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                            Manage tasks, recurring
                            routines, and daily
                            progress from one place.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            openCreateModal()
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                    >
                        <Plus className="size-4" />

                        Add Task
                    </button>
                </section>

                {/* ================================================= */}
                {/* ERROR */}
                {/* ================================================= */}

                {error && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600">
                        <span>
                            {error}
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                setError(null)
                            }
                            className="shrink-0"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                )}

                {/* ================================================= */}
                {/* MAIN GRID */}
                {/* ================================================= */}

                <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                    {/* ================================================= */}
                    {/* CALENDAR */}
                    {/* ================================================= */}

                    <div className="overflow-hidden rounded-2xl border bg-card">
                        {/* Calendar header */}

                        <div className="flex items-center justify-between border-b p-4 sm:p-5">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    {
                                        monthLabel
                                    }
                                </h2>

                                <p className="mt-1 text-xs text-muted-foreground">
                                    Click any date to
                                    view its tasks.
                                </p>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={
                                        goToToday
                                    }
                                    className="mr-1 hidden rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-accent sm:block"
                                >
                                    Today
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        goToPreviousMonth
                                    }
                                    className="flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-accent"
                                    aria-label="Previous month"
                                >
                                    <ChevronLeft className="size-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        goToNextMonth
                                    }
                                    className="flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-accent"
                                    aria-label="Next month"
                                >
                                    <ChevronRight className="size-4" />
                                </button>
                            </div>
                        </div>

                        {/* Mobile today */}

                        <div className="border-b px-4 py-3 sm:hidden">
                            <button
                                type="button"
                                onClick={
                                    goToToday
                                }
                                className="w-full rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-accent"
                            >
                                Go to Today
                            </button>
                        </div>

                        {/* Weekdays */}

                        <div className="grid grid-cols-7 border-b bg-muted/30">
                            {[
                                "Mon",
                                "Tue",
                                "Wed",
                                "Thu",
                                "Fri",
                                "Sat",
                                "Sun",
                            ].map(
                                (
                                    weekday,
                                ) => (
                                    <div
                                        key={
                                            weekday
                                        }
                                        className="px-1 py-3 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs"
                                    >
                                        {
                                            weekday
                                        }
                                    </div>
                                ),
                            )}
                        </div>

                        {/* Days */}

                        <div className="grid grid-cols-7">
                            {calendarDays.map(
                                (day) => {
                                    const dayTasks =
                                        tasksByDate.get(
                                            day.dateKey,
                                        ) ?? [];

                                    const total =
                                        dayTasks.length;

                                    const completed =
                                        dayTasks.filter(
                                            (
                                                task,
                                            ) =>
                                                task.completed,
                                        ).length;

                                    const selected =
                                        day.dateKey ===
                                        selectedDate;

                                    const today =
                                        day.dateKey ===
                                        todayKey;

                                    const recurringTask =
                                        dayTasks.find(
                                            (task) =>
                                                task.recurrence_type !==
                                                "NONE",
                                        );

                                    const recurring =
                                        Boolean(recurringTask);

                                    return (
                                        <button
                                            key={
                                                day.dateKey
                                            }
                                            type="button"
                                            onClick={() =>
                                                selectDate(
                                                    day,
                                                )
                                            }
                                            className={[
                                                "relative min-h-[82px] border-b border-r p-1.5 text-left transition-colors sm:min-h-[105px] sm:p-2.5",
                                                "hover:bg-accent/50",
                                                !day.isCurrentMonth
                                                    ? "bg-muted/10 text-muted-foreground"
                                                    : "",
                                                selected
                                                    ? "bg-primary/5 ring-2 ring-inset ring-primary"
                                                    : "",
                                            ].join(
                                                " ",
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-1">
                                                <span
                                                    className={[
                                                        "flex size-7 items-center justify-center rounded-full text-xs font-medium sm:text-sm",
                                                        today
                                                            ? "bg-primary text-primary-foreground"
                                                            : "",
                                                    ].join(
                                                        " ",
                                                    )}
                                                >
                                                    {
                                                        day.dayNumber
                                                    }
                                                </span>

                                                {total >
                                                    0 && (
                                                        <span className="text-[9px] font-medium text-muted-foreground sm:text-[10px]">
                                                            {
                                                                completed
                                                            }
                                                            /
                                                            {
                                                                total
                                                            }
                                                        </span>
                                                    )}
                                            </div>

                                            {total >
                                                0 && (
                                                    <div className="mt-3 space-y-1">
                                                        <div className="flex items-center gap-1">
                                                            <span className="size-1.5 shrink-0 rounded-full bg-primary" />

                                                            <span className="truncate text-[9px] text-muted-foreground sm:text-[10px]">
                                                                {
                                                                    total
                                                                }{" "}
                                                                {total ===
                                                                    1
                                                                    ? "task"
                                                                    : "tasks"}
                                                            </span>
                                                        </div>

                                                        {recurring && (
                                                            <div className="flex items-center gap-1 text-[9px] text-violet-500 sm:text-[10px]">
                                                                <Repeat2 className="size-3 shrink-0" />

                                                                <span>
                                                                    {recurringTask?.recurrence_type === "DAILY"
                                                                        ? "Daily"
                                                                        : recurringTask?.recurrence_type === "WEEKLY"
                                                                            ? "Weekly"
                                                                            : recurringTask?.recurrence_type === "WEEKDAYS"
                                                                                ? "Weekdays"
                                                                                : recurringTask?.recurrence_type === "WEEKENDS"
                                                                                    ? "Weekends"
                                                                                    : "Custom"}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {completed ===
                                                            total && (
                                                                <div className="hidden items-center gap-1 text-[10px] font-medium text-emerald-600 sm:flex">
                                                                    <Check className="size-3" />

                                                                    Complete
                                                                </div>
                                                            )}
                                                    </div>
                                                )}
                                        </button>
                                    );
                                },
                            )}
                        </div>

                        {/* Legend */}

                        <div className="flex flex-wrap items-center gap-4 border-t px-4 py-3 text-xs text-muted-foreground sm:px-5">
                            <div className="flex items-center gap-2">
                                <span className="size-2 rounded-full bg-primary" />

                                Has tasks
                            </div>

                            <div className="flex items-center gap-2">
                                <Repeat2 className="size-3 text-violet-500" />

                                Recurring
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="size-2 rounded-full bg-primary" />

                                Today
                            </div>
                        </div>
                    </div>

                    {/* ================================================= */}
                    {/* SELECTED DATE */}
                    {/* ================================================= */}

                    <aside className="rounded-2xl border bg-card">
                        <div className="border-b p-5">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <ListChecks className="size-4" />

                                    Selected day
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        openCreateModal()
                                    }
                                    className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90"
                                    aria-label="Add task"
                                >
                                    <Plus className="size-4" />
                                </button>
                            </div>

                            <h2 className="mt-2 text-xl font-semibold">
                                {formatSelectedDate(
                                    selectedDate,
                                )}
                            </h2>

                            {selectedDate ===
                                todayKey && (
                                    <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                        Today
                                    </span>
                                )}
                        </div>

                        {/* Stats */}

                        <div className="grid grid-cols-3 gap-2 border-b p-4">
                            <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    Tasks
                                </p>

                                <p className="mt-1 text-lg font-semibold">
                                    {
                                        selectedTotalTasks
                                    }
                                </p>
                            </div>

                            <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    Done
                                </p>

                                <p className="mt-1 text-lg font-semibold">
                                    {
                                        selectedCompletedTasks
                                    }
                                </p>
                            </div>

                            <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    Progress
                                </p>

                                <p className="mt-1 text-lg font-semibold">
                                    {
                                        selectedProgress
                                    }
                                    %
                                </p>
                            </div>
                        </div>

                        {/* Progress */}

                        <div className="px-5 pt-4">
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-primary transition-all"
                                    style={{
                                        width: `${selectedProgress}%`,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Task list */}

                        <div className="p-4">
                            {loading ? (
                                <div className="flex min-h-48 items-center justify-center">
                                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : selectedDateTasks.length ===
                                0 ? (
                                <div className="flex min-h-48 flex-col items-center justify-center text-center">
                                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                                        <CalendarDays className="size-5 text-muted-foreground" />
                                    </div>

                                    <p className="mt-3 text-sm font-medium">
                                        No tasks planned
                                    </p>

                                    <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                                        Add a task for
                                        this date to
                                        start planning.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            openCreateModal()
                                        }
                                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
                                    >
                                        <Plus className="size-3.5" />

                                        Add Task
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {selectedDateTasks.map(
                                        (
                                            task,
                                        ) => (
                                            <div
                                                key={
                                                    task.id
                                                }
                                                className={[
                                                    "group rounded-xl border p-3 transition-colors",
                                                    task.completed
                                                        ? "bg-muted/30"
                                                        : "bg-background",
                                                ].join(
                                                    " ",
                                                )}
                                            >
                                                <div className="flex items-start gap-3">
                                                    {/* Complete */}

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggleTask(
                                                                task,
                                                            )
                                                        }
                                                        disabled={
                                                            updatingTaskId ===
                                                            task.id
                                                        }
                                                        className={[
                                                            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                                                            task.completed
                                                                ? "border-primary bg-primary text-primary-foreground"
                                                                : "hover:border-primary hover:bg-primary/10",
                                                        ].join(
                                                            " ",
                                                        )}
                                                        aria-label={
                                                            task.completed
                                                                ? "Mark incomplete"
                                                                : "Mark complete"
                                                        }
                                                    >
                                                        {updatingTaskId ===
                                                            task.id ? (
                                                            <Loader2 className="size-3 animate-spin" />
                                                        ) : task.completed ? (
                                                            <Check className="size-3" />
                                                        ) : (
                                                            <Circle className="size-2 fill-current text-transparent" />
                                                        )}
                                                    </button>

                                                    {/* Content */}

                                                    <div className="min-w-0 flex-1">
                                                        <p
                                                            className={[
                                                                "text-sm font-medium",
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
                                                        </p>

                                                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                                            <span>
                                                                {getCategoryLabel(
                                                                    task.category,
                                                                )}
                                                            </span>

                                                            <span
                                                                className={getPriorityClass(
                                                                    task.priority,
                                                                )}
                                                            >
                                                                {task.priority.toLowerCase()}
                                                            </span>

                                                            {task.due_time && (
                                                                <span className="inline-flex items-center gap-1">
                                                                    <Clock3 className="size-3" />

                                                                    {
                                                                        task.due_time
                                                                    }
                                                                </span>
                                                            )}

                                                            {task.recurrence_type !==
                                                                "NONE" && (
                                                                    <span className="inline-flex items-center gap-1 text-violet-500">
                                                                        <Repeat2 className="size-3" />

                                                                        {task.recurrence_type === "DAILY"
                                                                            ? "Daily"
                                                                            : task.recurrence_type === "WEEKLY"
                                                                                ? "Weekly"
                                                                                : task.recurrence_type === "WEEKDAYS"
                                                                                    ? "Weekdays"
                                                                                    : task.recurrence_type === "WEEKENDS"
                                                                                        ? "Weekends"
                                                                                        : "Custom"}
                                                                    </span>
                                                                )}
                                                        </div>
                                                    </div>

                                                    {/* Actions */}

                                                    <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openEditModal(
                                                                    task,
                                                                )
                                                            }
                                                            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                            aria-label="Edit task"
                                                        >
                                                            <Pencil className="size-3.5" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setDeletingTask(
                                                                    task,
                                                                )
                                                            }
                                                            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                                                            aria-label="Delete task"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            )}
                        </div>
                    </aside>
                </section>
            </div>

            {/* ==================================================== */}
            {/* ADD / EDIT MODAL */}
            {/* ==================================================== */}

            {showTaskModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div
                        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-background shadow-2xl"
                        role="dialog"
                        aria-modal="true"
                    >
                        {/* Modal header */}

                        <div className="flex items-center justify-between border-b p-5">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    {editingTask
                                        ? "Edit Task"
                                        : "Add Task"}
                                </h2>

                                <p className="mt-1 text-xs text-muted-foreground">
                                    {editingTask
                                        ? "Update this task occurrence."
                                        : "Create a task for your selected date."}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeTaskModal
                                }
                                disabled={
                                    saving
                                }
                                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        {/* Form */}

                        <form
                            onSubmit={
                                handleSubmit
                            }
                            className="space-y-5 p-5"
                        >
                            {/* Title */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Task title
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.title
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm(
                                            (
                                                current,
                                            ) => ({
                                                ...current,
                                                title: event
                                                    .target
                                                    .value,
                                            }),
                                        )
                                    }
                                    placeholder="e.g. Study SQL"
                                    maxLength={
                                        200
                                    }
                                    required
                                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            {/* Description */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Description
                                </label>

                                <textarea
                                    value={
                                        form.description
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm(
                                            (
                                                current,
                                            ) => ({
                                                ...current,
                                                description:
                                                    event
                                                        .target
                                                        .value,
                                            }),
                                        )
                                    }
                                    placeholder="Optional description"
                                    rows={
                                        3
                                    }
                                    className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            {/* Category / Priority */}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium">
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
                                        className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary"
                                    >
                                        <option value="PERSONAL">
                                            Personal
                                        </option>

                                        <option value="WORK">
                                            Work
                                        </option>

                                        <option value="STUDY">
                                            Study
                                        </option>

                                        <option value="FITNESS">
                                            Fitness
                                        </option>

                                        <option value="NUTRITION">
                                            Nutrition
                                        </option>

                                        <option value="HAIR_CARE">
                                            Hair Care
                                        </option>

                                        <option value="SKIN_CARE">
                                            Skin Care
                                        </option>

                                        <option value="SLEEP">
                                            Sleep
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        Priority
                                    </label>

                                    <select
                                        value={
                                            form.priority
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setForm(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,
                                                    priority:
                                                        event
                                                            .target
                                                            .value,
                                                }),
                                            )
                                        }
                                        className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary"
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
                                </div>
                            </div>

                            {/* Date / Time */}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        Date
                                    </label>

                                    <input
                                        type="date"
                                        value={
                                            form.task_date
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setForm(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,
                                                    task_date:
                                                        event
                                                            .target
                                                            .value,
                                                    recurrence_end_date:
                                                        current.recurrence_type !==
                                                            "NONE"
                                                            ? current.recurrence_end_date <
                                                                event
                                                                    .target
                                                                    .value
                                                                ? event
                                                                    .target
                                                                    .value
                                                                : current.recurrence_end_date
                                                            : event
                                                                .target
                                                                .value,
                                                }),
                                            )
                                        }
                                        required
                                        className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        Due time
                                    </label>

                                    <input
                                        type="time"
                                        value={
                                            form.due_time
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setForm(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,
                                                    due_time:
                                                        event
                                                            .target
                                                            .value,
                                                }),
                                            )
                                        }
                                        className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary"
                                    />
                                </div>
                            </div>

                            {/* Recurrence */}

                            {(!editingTask || editScope === "series") && (
                                <div className="rounded-xl border bg-muted/20 p-4">
                                    <div className="flex items-center gap-2">
                                        <Repeat2 className="size-4 text-violet-500" />

                                        <label className="text-sm font-medium">
                                            Repeat
                                        </label>
                                    </div>

                                    <div className="mt-3">
                                        <select
                                            value={
                                                form.recurrence_type
                                            }
                                            onChange={(
                                                event,
                                            ) => {
                                                const value =
                                                    event
                                                        .target
                                                        .value as RecurrenceType;

                                                setForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,
                                                        recurrence_type:
                                                            value,
                                                        recurrence_end_date:
                                                            value ===
                                                                "NONE"
                                                                ? current.task_date
                                                                : current.recurrence_end_date ||
                                                                current.task_date,
                                                        recurrence_days:
                                                            value ===
                                                                "CUSTOM"
                                                                ? current.recurrence_days
                                                                : [],
                                                        recurrence_interval:
                                                            value ===
                                                                "NONE"
                                                                ? 1
                                                                : current.recurrence_interval ||
                                                                1,
                                                    }),
                                                );
                                            }}
                                            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary"
                                        >
                                            <option value="NONE">
                                                Does not repeat
                                            </option>

                                            <option value="DAILY">
                                                Every day
                                            </option>

                                            <option value="WEEKLY">
                                                Every week
                                            </option>

                                            <option value="WEEKDAYS">
                                                Weekdays
                                            </option>

                                            <option value="WEEKENDS">
                                                Weekends
                                            </option>

                                            <option value="CUSTOM">
                                                Custom
                                            </option>
                                        </select>
                                    </div>

                                    {form.recurrence_type !==
                                        "NONE" && (
                                            <div className="mt-4 space-y-4">
                                                {(form.recurrence_type ===
                                                    "WEEKLY" ||
                                                    form.recurrence_type ===
                                                    "CUSTOM") && (
                                                        <div>
                                                            <label className="mb-2 block text-sm font-medium">
                                                                Repeat every
                                                            </label>

                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    max={52}
                                                                    value={
                                                                        form.recurrence_interval
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        setForm(
                                                                            (
                                                                                current,
                                                                            ) => ({
                                                                                ...current,
                                                                                recurrence_interval:
                                                                                    Math.max(
                                                                                        1,
                                                                                        Math.min(
                                                                                            52,
                                                                                            Number(
                                                                                                event
                                                                                                    .target
                                                                                                    .value,
                                                                                            ) ||
                                                                                            1,
                                                                                        ),
                                                                                    ),
                                                                            }),
                                                                        )
                                                                    }
                                                                    className="h-10 w-24 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary"
                                                                />

                                                                <span className="text-sm text-muted-foreground">
                                                                    week
                                                                    {form.recurrence_interval ===
                                                                        1
                                                                        ? ""
                                                                        : "s"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}

                                                {form.recurrence_type ===
                                                    "CUSTOM" && (
                                                        <div>
                                                            <label className="mb-2 block text-sm font-medium">
                                                                Repeat on
                                                            </label>

                                                            <div className="grid grid-cols-7 gap-1.5">
                                                                {[
                                                                    ["M", 0],
                                                                    ["T", 1],
                                                                    ["W", 2],
                                                                    ["T", 3],
                                                                    ["F", 4],
                                                                    ["S", 5],
                                                                    ["S", 6],
                                                                ].map(
                                                                    ([
                                                                        label,
                                                                        day,
                                                                    ]) => {
                                                                        const dayNumber =
                                                                            Number(
                                                                                day,
                                                                            );

                                                                        const selected =
                                                                            form.recurrence_days.includes(
                                                                                dayNumber,
                                                                            );

                                                                        return (
                                                                            <button
                                                                                key={`${label}-${dayNumber}`}
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setForm(
                                                                                        (
                                                                                            current,
                                                                                        ) => ({
                                                                                            ...current,
                                                                                            recurrence_days:
                                                                                                selected
                                                                                                    ? current.recurrence_days.filter(
                                                                                                        (
                                                                                                            item,
                                                                                                        ) =>
                                                                                                            item !==
                                                                                                            dayNumber,
                                                                                                    )
                                                                                                    : [
                                                                                                        ...current.recurrence_days,
                                                                                                        dayNumber,
                                                                                                    ].sort(
                                                                                                        (
                                                                                                            a,
                                                                                                            b,
                                                                                                        ) =>
                                                                                                            a -
                                                                                                            b,
                                                                                                    ),
                                                                                        }),
                                                                                    )
                                                                                }
                                                                                className={[
                                                                                    "flex h-9 items-center justify-center rounded-lg border text-xs font-medium transition-colors",
                                                                                    selected
                                                                                        ? "border-primary bg-primary text-primary-foreground"
                                                                                        : "bg-background hover:bg-accent",
                                                                                ].join(
                                                                                    " ",
                                                                                )}
                                                                                aria-pressed={
                                                                                    selected
                                                                                }
                                                                                aria-label={`Repeat on ${[
                                                                                    "Monday",
                                                                                    "Tuesday",
                                                                                    "Wednesday",
                                                                                    "Thursday",
                                                                                    "Friday",
                                                                                    "Saturday",
                                                                                    "Sunday",
                                                                                ][
                                                                                    dayNumber
                                                                                ]
                                                                                    }`}
                                                                            >
                                                                                {
                                                                                    label
                                                                                }
                                                                            </button>
                                                                        );
                                                                    },
                                                                )}
                                                            </div>

                                                            <p className="mt-2 text-xs text-muted-foreground">
                                                                Select one or more days.
                                                            </p>
                                                        </div>
                                                    )}

                                                <div>
                                                    <label className="mb-2 block text-sm font-medium">
                                                        Repeat until
                                                    </label>

                                                    <input
                                                        type="date"
                                                        value={
                                                            form.recurrence_end_date
                                                        }
                                                        min={
                                                            form.task_date
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            setForm(
                                                                (
                                                                    current,
                                                                ) => ({
                                                                    ...current,
                                                                    recurrence_end_date:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        required
                                                        className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary"
                                                    />

                                                    <p className="mt-2 text-xs text-muted-foreground">
                                                        {form.recurrence_type ===
                                                            "DAILY"
                                                            ? "A separate task occurrence will be created for each day."
                                                            : form.recurrence_type ===
                                                                "WEEKDAYS"
                                                                ? "A separate task occurrence will be created Monday through Friday."
                                                                : form.recurrence_type ===
                                                                    "WEEKENDS"
                                                                    ? "A separate task occurrence will be created on Saturday and Sunday."
                                                                    : form.recurrence_type ===
                                                                        "WEEKLY"
                                                                        ? "A separate task occurrence will be created every selected week."
                                                                        : "A separate task occurrence will be created on the selected days."}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                </div>
                            )}

                            {editingTask &&
                                editingTask.recurrence_type !== "NONE" && (
                                    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                                        <div className="mb-3 flex items-start gap-3">
                                            <Repeat2 className="mt-0.5 size-4 shrink-0 text-violet-500" />

                                            <div>
                                                <p className="text-sm font-semibold">
                                                    Edit recurring task
                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    Choose how this change should
                                                    be applied.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3">
                                                <input
                                                    type="radio"
                                                    name="calendar-edit-scope"
                                                    checked={
                                                        editScope === "single"
                                                    }
                                                    onChange={() =>
                                                        setEditScope("single")
                                                    }
                                                    className="mt-1"
                                                />

                                                <div>
                                                    <p className="text-sm font-medium">
                                                        This occurrence
                                                    </p>

                                                    <p className="text-xs text-muted-foreground">
                                                        Change only this date.
                                                    </p>
                                                </div>
                                            </label>

                                            <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3">
                                                <input
                                                    type="radio"
                                                    name="calendar-edit-scope"
                                                    checked={
                                                        editScope === "series"
                                                    }
                                                    onChange={() =>
                                                        setEditScope("series")
                                                    }
                                                    className="mt-1"
                                                />

                                                <div>
                                                    <p className="text-sm font-medium">
                                                        Entire series
                                                    </p>

                                                    <p className="text-xs text-muted-foreground">
                                                        Change the recurrence and
                                                        apply it to the series.
                                                    </p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                )}

                            {/* Notes */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Notes
                                </label>

                                <textarea
                                    value={
                                        form.notes
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm(
                                            (
                                                current,
                                            ) => ({
                                                ...current,
                                                notes: event
                                                    .target
                                                    .value,
                                            }),
                                        )
                                    }
                                    placeholder="Optional notes"
                                    rows={
                                        2
                                    }
                                    className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            {/* Actions */}

                            <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={
                                        closeTaskModal
                                    }
                                    disabled={
                                        saving
                                    }
                                    className="h-10 rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saving
                                    }
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                                >
                                    {saving && (
                                        <Loader2 className="size-4 animate-spin" />
                                    )}

                                    {editingTask
                                        ? "Save Changes"
                                        : "Create Task"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ==================================================== */}
            {/* DELETE CONFIRMATION */}
            {/* ==================================================== */}

            {deletingTask && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl">
                        <div className="flex size-11 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                            <Trash2 className="size-5" />
                        </div>

                        <h2 className="mt-4 text-lg font-semibold">
                            Delete task?
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Are you sure you want to
                            delete{" "}
                            <span className="font-medium text-foreground">
                                "{deletingTask.title}"
                            </span>
                            ?
                        </p>

                        {deletingTask.recurrence_id &&
                            deletingTask.recurrence_type !==
                            "NONE" && (
                                <div className="mt-4 space-y-2">
                                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3">
                                        <input
                                            type="radio"
                                            name="calendar-delete-scope"
                                            checked={
                                                deleteScope ===
                                                "single"
                                            }
                                            onChange={() =>
                                                setDeleteScope(
                                                    "single",
                                                )
                                            }
                                            className="mt-1"
                                        />

                                        <div>
                                            <p className="text-sm font-medium">
                                                This occurrence
                                            </p>

                                            <p className="text-xs text-muted-foreground">
                                                Delete only this date.
                                            </p>
                                        </div>
                                    </label>

                                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3">
                                        <input
                                            type="radio"
                                            name="calendar-delete-scope"
                                            checked={
                                                deleteScope ===
                                                "series"
                                            }
                                            onChange={() =>
                                                setDeleteScope(
                                                    "series",
                                                )
                                            }
                                            className="mt-1"
                                        />

                                        <div>
                                            <p className="text-sm font-medium">
                                                Entire series
                                            </p>

                                            <p className="text-xs text-muted-foreground">
                                                Delete all occurrences in this recurring series.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            )}

                        {(!deletingTask.recurrence_id ||
                            deletingTask.recurrence_type ===
                            "NONE") && (
                                <div className="mt-4 rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                                    This task is not recurring. Only this task will be deleted.
                                </div>
                            )}

                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setDeletingTask(null);
                                    setDeleteScope("single");
                                }}
                                disabled={
                                    deleting
                                }
                                className="h-10 rounded-lg border px-4 text-sm font-medium hover:bg-accent disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={
                                    confirmDelete
                                }
                                disabled={
                                    deleting
                                }
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 text-sm font-medium text-white disabled:opacity-50"
                            >
                                {deleting && (
                                    <Loader2 className="size-4 animate-spin" />
                                )}

                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}