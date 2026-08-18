"use client";

import {
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronDown,
    Clock3,
    Edit3,
    Filter,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-react";
import {
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from "react";

import {
    createTask,
    deleteTask,
    deleteTaskSeries,
    getGoals,
    getTasks,
    subscribeToTaskSync,
    updateTask,
    updateTaskSeries,
    type Goal,
    type Task,
    type TaskCreate,
} from "@/lib/api";

type ViewFilter =
    | "ALL"
    | "TODAY"
    | "UPCOMING"
    | "COMPLETED"
    | "PENDING";

const categories = [
    "PERSONAL",
    "WORK",
    "STUDY",
    "FITNESS",
    "NUTRITION",
    "HAIR_CARE",
    "SKIN_CARE",
    "SLEEP",
    "OTHER",
];

const priorities = [
    "LOW",
    "MEDIUM",
    "HIGH",
];

const recurrenceTypes = [
    "NONE",
    "DAILY",
    "WEEKLY",
    "WEEKDAYS",
    "WEEKENDS",
    "CUSTOM",
] as const;

const weekdays = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
];

function getRecurrenceLabel(task: Task): string | null {
    const type = task.recurrence_type;

    if (!type || type === "NONE") {
        return null;
    }

    if (type === "DAILY") {
        return "Daily";
    }

    if (type === "WEEKLY") {
        return task.recurrence_interval > 1
            ? `Every ${task.recurrence_interval} weeks`
            : "Weekly";
    }

    if (type === "WEEKDAYS") {
        return "Weekdays";
    }

    if (type === "WEEKENDS") {
        return "Weekends";
    }

    if (type === "CUSTOM") {
        const days = Array.isArray(task.recurrence_days)
            ? task.recurrence_days
            : [];

        const names = days
            .map(
                (day) =>
                    weekdays.find((item) => item.value === day)?.label,
            )
            .filter(Boolean);

        const dayLabel =
            names.length > 0 ? names.join(", ") : "Custom days";

        return task.recurrence_interval > 1
            ? `${dayLabel} • Every ${task.recurrence_interval} weeks`
            : dayLabel;
    }

    return null;
}

function getRecurrenceEndLabel(
    endDate: string | null | undefined,
): string | null {
    return endDate ? `Until ${formatTaskDate(endDate)}` : null;
}

const emptyTask: TaskCreate = {
    title: "",
    description: "",
    goal_id: null,
    category: "PERSONAL",
    priority: "MEDIUM",
    task_date: new Date().toISOString().slice(0, 10),
    due_time: "",
    notes: "",
    recurrence_type: "NONE",
    recurrence_end_date: null,
    recurrence_days: [],
    recurrence_interval: 1,
};

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

function formatTaskDate(value: string): string {
    const date = new Date(
        `${value}T00:00:00`,
    );

    return new Intl.DateTimeFormat(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric",
        },
    ).format(date);
}

function formatCategory(value: string): string {
    return value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) =>
            letter.toUpperCase(),
        );
}

function getPriorityClass(priority: string): string {
    switch (priority.toUpperCase()) {
        case "HIGH":
            return "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400";

        case "LOW":
            return "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400";

        default:
            return "border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
    }
}

export function TasksView() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] =
        useState<number | null>(null);

    const [deletingTask, setDeletingTask] =
        useState<Task | null>(null);

    const [deleteScope, setDeleteScope] =
        useState<"single" | "series">("single");

    const [error, setError] =
        useState<string | null>(null);

    const [search, setSearch] =
        useState("");

    const [viewFilter, setViewFilter] =
        useState<ViewFilter>("ALL");

    const [categoryFilter, setCategoryFilter] =
        useState("ALL");

    const [priorityFilter, setPriorityFilter] =
        useState("ALL");

    const [showAddTask, setShowAddTask] =
        useState(false);

    const [editingTask, setEditingTask] =
        useState<Task | null>(null);

    const [editScope, setEditScope] =
        useState<"single" | "series">("single");

    const [newTask, setNewTask] =
        useState<TaskCreate>({
            ...emptyTask,
            task_date: getTodayDate(),
        });

    const [editForm, setEditForm] =
        useState<TaskCreate>({
            ...emptyTask,
        });

    // ========================================================
    // LOAD TASKS
    // ========================================================

    const loadTasks = async () => {
        try {
            setLoading(true);
            setError(null);

            const [data, goalData] = await Promise.all([
                getTasks(),
                getGoals(),
            ]);

            setTasks(data);
            setGoals(goalData);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load tasks.",
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
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

                    setTasks((current) => {
                        const alreadyExists =
                            current.some(
                                (task) =>
                                    task.id ===
                                    event.task!.id,
                            );

                        if (alreadyExists) {
                            return current;
                        }

                        return [
                            event.task!,
                            ...current,
                        ];
                    });

                    return;
                }

                if (event.type === "updated") {
                    if (!event.task) {
                        return;
                    }

                    setTasks((current) =>
                        current.map((task) =>
                            task.id ===
                                event.task!.id
                                ? event.task!
                                : task,
                        ),
                    );

                    setEditingTask((current) => {
                        if (
                            current?.id !==
                            event.task!.id
                        ) {
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

                    void loadTasks();

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
                    if (
                        typeof event.taskId !==
                        "number"
                    ) {
                        return;
                    }

                    setTasks((current) =>
                        current.filter(
                            (task) =>
                                task.id !==
                                event.taskId,
                        ),
                    );

                    setEditingTask((current) =>
                        current?.id ===
                            event.taskId
                            ? null
                            : current,
                    );
                }
            });

        return unsubscribe;
    }, []);

    // ========================================================
    // FILTERED TASKS
    // ========================================================

    const filteredTasks = useMemo(() => {
        const today = getTodayDate();

        const normalizedSearch =
            search.trim().toLowerCase();

        return [...tasks]
            .filter((task) => {
                if (
                    normalizedSearch &&
                    !task.title
                        .toLowerCase()
                        .includes(normalizedSearch) &&
                    !(task.description ?? "")
                        .toLowerCase()
                        .includes(normalizedSearch)
                ) {
                    return false;
                }

                if (
                    categoryFilter !== "ALL" &&
                    task.category.toUpperCase() !==
                    categoryFilter
                ) {
                    return false;
                }

                if (
                    priorityFilter !== "ALL" &&
                    task.priority.toUpperCase() !==
                    priorityFilter
                ) {
                    return false;
                }

                switch (viewFilter) {
                    case "TODAY":
                        return task.task_date === today;

                    case "UPCOMING":
                        return (
                            task.task_date > today &&
                            !task.completed
                        );

                    case "COMPLETED":
                        return task.completed;

                    case "PENDING":
                        return !task.completed;

                    default:
                        return true;
                }
            })
            .sort((a, b) => {
                if (
                    a.task_date !==
                    b.task_date
                ) {
                    return a.task_date.localeCompare(
                        b.task_date,
                    );
                }

                if (
                    (a.due_time ?? "") !==
                    (b.due_time ?? "")
                ) {
                    return (
                        a.due_time ?? ""
                    ).localeCompare(
                        b.due_time ?? "",
                    );
                }

                return a.id - b.id;
            });
    }, [
        tasks,
        search,
        viewFilter,
        categoryFilter,
        priorityFilter,
    ]);

    // ========================================================
    // COUNTS
    // ========================================================

    const counts = useMemo(() => {
        const today = getTodayDate();

        return {
            all: tasks.length,

            today: tasks.filter(
                (task) =>
                    task.task_date === today,
            ).length,

            upcoming: tasks.filter(
                (task) =>
                    task.task_date > today &&
                    !task.completed,
            ).length,

            completed: tasks.filter(
                (task) => task.completed,
            ).length,

            pending: tasks.filter(
                (task) => !task.completed,
            ).length,
        };
    }, [tasks]);

    // ========================================================
    // TOGGLE TASK
    // ========================================================

    const toggleTask = async (
        task: Task,
    ) => {
        try {
            setError(null);

            const updatedTask =
                await updateTask(
                    task.id,
                    {
                        completed:
                            !task.completed,
                    },
                );

            setTasks((current) =>
                current.map((item) =>
                    item.id === updatedTask.id
                        ? updatedTask
                        : item,
                ),
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to update task.",
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

        if (!newTask.title?.trim()) {
            setError(
                "Task title is required.",
            );
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const createdTask =
                await createTask({
                    title:
                        newTask.title.trim(),

                    description:
                        newTask.description?.trim() ||
                        null,

                    category:
                        newTask.category ??
                        "PERSONAL",

                    priority:
                        newTask.priority ??
                        "MEDIUM",

                    goal_id:
                        newTask.goal_id ?? null,

                    task_date:
                        newTask.task_date,

                    due_time:
                        newTask.due_time ||
                        null,

                    notes:
                        newTask.notes?.trim() ||
                        null,

                    recurrence_type:
                        newTask.recurrence_type ?? "NONE",

                    recurrence_end_date:
                        newTask.recurrence_end_date || null,

                    recurrence_days:
                        newTask.recurrence_days ?? [],

                    recurrence_interval:
                        newTask.recurrence_interval ?? 1,
                });

            setTasks((current) => [
                createdTask,
                ...current,
            ]);

            setShowAddTask(false);

            setNewTask({
                ...emptyTask,
                task_date:
                    getTodayDate(),
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to create task.",
            );
        } finally {
            setSaving(false);
        }
    };

    // ========================================================
    // OPEN EDIT
    // ========================================================

    const openEdit = (task: Task) => {
        setEditingTask(task);

        setEditScope(
            task.recurrence_type &&
                task.recurrence_type !== "NONE"
                ? "single"
                : "single",
        );

        setEditForm({
            title: task.title,
            description:
                task.description ?? "",
            category: task.category,
            priority: task.priority,
            goal_id: task.goal_id ?? null,
            task_date: task.task_date,
            due_time:
                task.due_time ?? "",
            notes: task.notes ?? "",
            recurrence_type:
                task.recurrence_type ?? "NONE",
            recurrence_end_date:
                task.recurrence_end_date ?? null,
            recurrence_days:
                Array.isArray(task.recurrence_days)
                    ? task.recurrence_days
                    : [],
            recurrence_interval:
                task.recurrence_interval ?? 1,
        });

        setError(null);
    };

    // ========================================================
    // UPDATE TASK
    // ========================================================

    const handleUpdateTask = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        if (
            !editingTask ||
            !editForm.title?.trim()
        ) {
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const updateData = {
                title: editForm.title.trim(),

                description:
                    editForm.description?.trim() ||
                    null,

                category:
                    editForm.category,

                priority:
                    editForm.priority,

                goal_id:
                    editForm.goal_id ?? null,

                task_date:
                    editForm.task_date,

                due_time:
                    editForm.due_time ||
                    null,

                notes:
                    editForm.notes?.trim() ||
                    null,

                ...(editScope === "series"
                    ? {
                        recurrence_type:
                            editForm.recurrence_type ??
                            "NONE",

                        recurrence_end_date:
                            editForm.recurrence_end_date ||
                            null,

                        recurrence_days:
                            editForm.recurrence_days ??
                            [],

                        recurrence_interval:
                            editForm.recurrence_interval ??
                            1,
                    }
                    : {}),
            };

            const updatedTask =
                editScope === "series"
                    ? await updateTaskSeries(
                        editingTask.id,
                        updateData,
                    )
                    : await updateTask(
                        editingTask.id,
                        updateData,
                    );

            /*
             * Series update can change multiple
             * occurrences, so reload everything.
             */
            if (editScope === "series") {
                const refreshedTasks =
                    await getTasks();

                setTasks(refreshedTasks);
            } else {
                setTasks((current) =>
                    current.map((task) =>
                        task.id === updatedTask.id
                            ? updatedTask
                            : task,
                    ),
                );
            }

            setEditingTask(null);
            setEditScope("single");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to update task.",
            );
        } finally {
            setSaving(false);
        }
    };

    // ========================================================
    // DELETE TASK
    // ========================================================

    const handleDeleteTask = (
        task: Task,
    ) => {
        setDeletingTask(task);
        setDeleteScope("single");
        setError(null);
    };

    const confirmDeleteTask = async () => {
        if (!deletingTask) {
            return;
        }

        try {
            setDeletingId(deletingTask.id);
            setError(null);

            if (
                deleteScope === "series" &&
                deletingTask.recurrence_id
            ) {
                await deleteTaskSeries(
                    deletingTask.recurrence_id,
                );

                setTasks((current) =>
                    current.filter(
                        (item) =>
                            item.recurrence_id !==
                            deletingTask.recurrence_id,
                    ),
                );
            } else {
                await deleteTask(
                    deletingTask.id,
                );

                setTasks((current) =>
                    current.filter(
                        (item) =>
                            item.id !==
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
            setDeletingId(null);
        }
    };

    // ========================================================
    // TASK FORM
    // ========================================================

    const renderTaskForm = (
        form: TaskCreate,
        setForm: (
            value: TaskCreate,
        ) => void,
        onSubmit: (
            event: FormEvent<HTMLFormElement>,
        ) => void,
        submitLabel: string,
        onCancel: () => void,
    ) => {
        return (
            <form
                onSubmit={onSubmit}
                className="space-y-5"
            >
                <div>
                    <label
                        htmlFor="task-title"
                        className="mb-1.5 block text-sm font-medium"
                    >
                        Title
                    </label>

                    <input
                        id="task-title"
                        value={
                            form.title
                        }
                        onChange={(event) =>
                            setForm({
                                ...form,
                                title:
                                    event.target
                                        .value,
                            })
                        }
                        placeholder="What do you want to accomplish?"
                        maxLength={200}
                        autoFocus
                        className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                    />
                </div>

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
                            form.description ??
                            ""
                        }
                        onChange={(event) =>
                            setForm({
                                ...form,
                                description:
                                    event.target
                                        .value,
                            })
                        }
                        placeholder="Optional description"
                        rows={3}
                        className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                    />
                </div>

                <div>
                    <label
                        htmlFor="task-goal"
                        className="mb-1.5 block text-sm font-medium"
                    >
                        Goal
                    </label>

                    <select
                        id="task-goal"
                        value={form.goal_id ?? ""}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                goal_id: event.target.value
                                    ? Number(event.target.value)
                                    : null,
                            })
                        }
                        className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                    >
                        <option value="">No goal</option>

                        {goals.map((goal) => (
                            <option
                                key={goal.id}
                                value={goal.id}
                            >
                                {goal.title}
                            </option>
                        ))}
                    </select>

                    <p className="mt-1.5 text-xs text-muted-foreground">
                        Optionally connect this task to a goal.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
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
                                form.category ??
                                "PERSONAL"
                            }
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    category:
                                        event.target
                                            .value,
                                })
                            }
                            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                        >
                            {categories.map(
                                (category) => (
                                    <option
                                        key={
                                            category
                                        }
                                        value={
                                            category
                                        }
                                    >
                                        {formatCategory(
                                            category,
                                        )}
                                    </option>
                                ),
                            )}
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
                                form.priority ??
                                "MEDIUM"
                            }
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    priority:
                                        event.target
                                            .value,
                                })
                            }
                            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                        >
                            {priorities.map(
                                (priority) => (
                                    <option
                                        key={
                                            priority
                                        }
                                        value={
                                            priority
                                        }
                                    >
                                        {priority}
                                    </option>
                                ),
                            )}
                        </select>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="task-date"
                            className="mb-1.5 block text-sm font-medium"
                        >
                            Date
                        </label>

                        <input
                            id="task-date"
                            type="date"
                            value={
                                form.task_date
                            }
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    task_date:
                                        event.target
                                            .value,
                                })
                            }
                            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="task-time"
                            className="mb-1.5 block text-sm font-medium"
                        >
                            Due time
                        </label>

                        <input
                            id="task-time"
                            type="time"
                            value={
                                form.due_time ??
                                ""
                            }
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    due_time:
                                        event.target
                                            .value,
                                })
                            }
                            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                        />
                    </div>
                </div>

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
                            form.notes ?? ""
                        }
                        onChange={(event) =>
                            setForm({
                                ...form,
                                notes:
                                    event.target
                                        .value,
                            })
                        }
                        placeholder="Optional notes"
                        rows={2}
                        className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                    />
                </div>
                <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                    <div>
                        <label
                            htmlFor="task-recurrence"
                            className="mb-1.5 block text-sm font-medium"
                        >
                            Repeat
                        </label>

                        <select
                            id="task-recurrence"
                            value={form.recurrence_type ?? "NONE"}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    recurrence_type:
                                        event.target
                                            .value as TaskCreate["recurrence_type"],
                                    recurrence_days: [],
                                    recurrence_interval: 1,
                                })
                            }
                            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                        >
                            {recurrenceTypes.map((type) => (
                                <option key={type} value={type}>
                                    {type === "NONE"
                                        ? "Does not repeat"
                                        : type === "DAILY"
                                            ? "Every day"
                                            : type === "WEEKLY"
                                                ? "Every week"
                                                : type === "WEEKDAYS"
                                                    ? "Weekdays"
                                                    : type === "WEEKENDS"
                                                        ? "Weekends"
                                                        : "Custom"}
                                </option>
                            ))}
                        </select>
                    </div>

                    {form.recurrence_type === "WEEKLY" && (
                        <div>
                            <label
                                htmlFor="task-recurrence-interval"
                                className="mb-1.5 block text-sm font-medium"
                            >
                                Repeat every
                            </label>

                            <div className="flex items-center gap-2">
                                <input
                                    id="task-recurrence-interval"
                                    type="number"
                                    min={1}
                                    max={52}
                                    value={
                                        form.recurrence_interval ?? 1
                                    }
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            recurrence_interval: Math.min(
                                                52,
                                                Math.max(
                                                    1,
                                                    Number(
                                                        event.target.value,
                                                    ) || 1,
                                                ),
                                            ),
                                        })
                                    }
                                    className="h-10 w-24 rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                                />
                                <span className="text-sm text-muted-foreground">
                                    week(s)
                                </span>
                            </div>
                        </div>
                    )}

                    {form.recurrence_type === "CUSTOM" && (
                        <>
                            <div>
                                <p className="mb-2 text-sm font-medium">
                                    Repeat on
                                </p>

                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {weekdays.map((day) => {
                                        const selected =
                                            form.recurrence_days?.includes(
                                                day.value,
                                            ) ?? false;

                                        return (
                                            <label
                                                key={day.value}
                                                className={[
                                                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                                                    selected
                                                        ? "border-primary bg-primary/5"
                                                        : "hover:bg-muted/40",
                                                ].join(" ")}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => {
                                                        const current =
                                                            form.recurrence_days ??
                                                            [];

                                                        const next = selected
                                                            ? current.filter(
                                                                (value) =>
                                                                    value !==
                                                                    day.value,
                                                            )
                                                            : [
                                                                ...current,
                                                                day.value,
                                                            ].sort(
                                                                (a, b) =>
                                                                    a - b,
                                                            );

                                                        setForm({
                                                            ...form,
                                                            recurrence_days:
                                                                next,
                                                        });
                                                    }}
                                                    className="size-4 rounded border-input"
                                                />
                                                {day.label}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="task-custom-interval"
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    Repeat every
                                </label>

                                <div className="flex items-center gap-2">
                                    <input
                                        id="task-custom-interval"
                                        type="number"
                                        min={1}
                                        max={52}
                                        value={
                                            form.recurrence_interval ?? 1
                                        }
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                recurrence_interval:
                                                    Math.min(
                                                        52,
                                                        Math.max(
                                                            1,
                                                            Number(
                                                                event.target
                                                                    .value,
                                                            ) || 1,
                                                        ),
                                                    ),
                                            })
                                        }
                                        className="h-10 w-24 rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        week(s)
                                    </span>
                                </div>
                            </div>
                        </>
                    )}

                    {form.recurrence_type &&
                        form.recurrence_type !== "NONE" && (
                            <div>
                                <label
                                    htmlFor="task-recurrence-end"
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    Repeat until
                                </label>

                                <input
                                    id="task-recurrence-end"
                                    type="date"
                                    min={form.task_date}
                                    value={
                                        form.recurrence_end_date ?? ""
                                    }
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            recurrence_end_date:
                                                event.target.value || null,
                                        })
                                    }
                                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                                />
                            </div>
                        )}

                    <p className="text-xs text-muted-foreground">
                        Recurrence settings are shared with Calendar and
                        Dashboard for this task.
                    </p>
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving
                            ? "Saving..."
                            : submitLabel}
                    </button>
                </div>
            </form>
        );
    };

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <>
            <div className="space-y-6">
                {/* HEADER */}

                <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Manage everything you
                            want to accomplish.
                        </p>

                        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                            Tasks
                        </h1>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setError(null);
                            setNewTask({
                                ...emptyTask,
                                task_date:
                                    getTodayDate(),
                            });
                            setShowAddTask(true);
                        }}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                    >
                        <Plus className="size-4" />
                        Add Task
                    </button>
                </section>

                {/* ERROR */}

                {error && (
                    <div className="flex items-start justify-between gap-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                        <span>{error}</span>

                        <button
                            type="button"
                            onClick={() =>
                                setError(null)
                            }
                            aria-label="Close error"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                )}

                {/* SUMMARY */}

                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {(
                        [
                            {
                                label: "All",
                                count: counts.all,
                                filter: "ALL" as ViewFilter,
                            },
                            {
                                label: "Today",
                                count: counts.today,
                                filter: "TODAY" as ViewFilter,
                            },
                            {
                                label: "Upcoming",
                                count: counts.upcoming,
                                filter: "UPCOMING" as ViewFilter,
                            },
                            {
                                label: "Pending",
                                count: counts.pending,
                                filter: "PENDING" as ViewFilter,
                            },
                            {
                                label: "Completed",
                                count: counts.completed,
                                filter: "COMPLETED" as ViewFilter,
                            },
                        ]
                    ).map(
                        ({
                            label,
                            count,
                            filter,
                        }) => (
                            <button
                                key={label}
                                type="button"
                                onClick={() =>
                                    setViewFilter(filter)
                                }
                                className={[
                                    "rounded-xl border bg-card p-4 text-left transition-colors",
                                    viewFilter === filter
                                        ? "border-primary bg-primary/5"
                                        : "hover:bg-muted/40",
                                ].join(" ")}
                            >
                                <p className="text-xs text-muted-foreground">
                                    {label}
                                </p>

                                <p className="mt-1 text-2xl font-semibold">
                                    {count}
                                </p>
                            </button>
                        ),
                    )}
                </section>

                {/* SEARCH + FILTERS */}

                <section className="rounded-2xl border bg-card p-4 sm:p-5">
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                            <input
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target
                                            .value,
                                    )
                                }
                                placeholder="Search tasks..."
                                className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                            />
                        </div>

                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                            <select
                                value={
                                    categoryFilter
                                }
                                onChange={(event) =>
                                    setCategoryFilter(
                                        event.target
                                            .value,
                                    )
                                }
                                className="h-10 w-full min-w-44 appearance-none rounded-lg border bg-background pl-9 pr-9 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                            >
                                <option value="ALL">
                                    All categories
                                </option>

                                {categories.map(
                                    (category) => (
                                        <option
                                            key={
                                                category
                                            }
                                            value={
                                                category
                                            }
                                        >
                                            {formatCategory(
                                                category,
                                            )}
                                        </option>
                                    ),
                                )}
                            </select>

                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        </div>

                        <div className="relative">
                            <select
                                value={
                                    priorityFilter
                                }
                                onChange={(event) =>
                                    setPriorityFilter(
                                        event.target
                                            .value,
                                    )
                                }
                                className="h-10 w-full min-w-36 appearance-none rounded-lg border bg-background px-3 pr-9 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                            >
                                <option value="ALL">
                                    All priorities
                                </option>

                                {priorities.map(
                                    (priority) => (
                                        <option
                                            key={
                                                priority
                                            }
                                            value={
                                                priority
                                            }
                                        >
                                            {priority}
                                        </option>
                                    ),
                                )}
                            </select>

                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        </div>
                    </div>
                </section>

                {/* TASK LIST */}

                <section className="overflow-hidden rounded-2xl border bg-card">
                    <div className="flex items-center justify-between border-b px-5 py-4 sm:px-6">
                        <div>
                            <h2 className="font-semibold tracking-tight">
                                {viewFilter ===
                                    "ALL"
                                    ? "All tasks"
                                    : `${viewFilter.charAt(0)}${viewFilter.slice(1).toLowerCase()} tasks`}
                            </h2>

                            <p className="mt-1 text-xs text-muted-foreground">
                                {
                                    filteredTasks.length
                                }{" "}
                                task
                                {filteredTasks.length ===
                                    1
                                    ? ""
                                    : "s"}{" "}
                                shown
                            </p>
                        </div>

                        {filteredTasks.length >
                            0 && (
                                <span className="text-xs text-muted-foreground">
                                    {
                                        counts.completed
                                    }{" "}
                                    completed
                                </span>
                            )}
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            Loading tasks...
                        </div>
                    ) : filteredTasks.length ===
                        0 ? (
                        <div className="p-10 text-center">
                            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                                <CheckCircle2 className="size-5 text-muted-foreground" />
                            </div>

                            <p className="mt-4 text-sm font-medium">
                                No tasks found
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                                Try changing your
                                filters or create a
                                new task.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {filteredTasks.map(
                                (task) => (
                                    <div
                                        key={
                                            task.id
                                        }
                                        className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:p-5"
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleTask(
                                                    task,
                                                )
                                            }
                                            className={[
                                                "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                                                task.completed
                                                    ? "border-primary bg-primary text-primary-foreground"
                                                    : "border-muted-foreground/30 hover:border-primary",
                                            ].join(
                                                " ",
                                            )}
                                            aria-label={
                                                task.completed
                                                    ? "Mark task as pending"
                                                    : "Mark task as completed"
                                            }
                                        >
                                            {task.completed && (
                                                <Check className="size-3.5" />
                                            )}
                                        </button>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3
                                                    className={[
                                                        "truncate text-sm font-medium",
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
                                                </h3>

                                                <span
                                                    className={[
                                                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                                                        getPriorityClass(
                                                            task.priority,
                                                        ),
                                                    ].join(
                                                        " ",
                                                    )}
                                                >
                                                    {
                                                        task.priority
                                                    }
                                                </span>
                                            </div>

                                            {task.description && (
                                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                    {
                                                        task.description
                                                    }
                                                </p>
                                            )}

                                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                <span>
                                                    {
                                                        formatCategory(
                                                            task.category,
                                                        )
                                                    }
                                                </span>

                                                {task.goal_id && (
                                                    <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary">
                                                        Goal:{" "}
                                                        {goals.find(
                                                            (goal) =>
                                                                goal.id ===
                                                                task.goal_id,
                                                        )?.title ?? `#${task.goal_id}`}
                                                    </span>
                                                )}

                                                <span className="flex items-center gap-1">
                                                    <CalendarDays className="size-3" />
                                                    {
                                                        formatTaskDate(
                                                            task.task_date,
                                                        )
                                                    }
                                                </span>

                                                {task.due_time && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock3 className="size-3" />
                                                        {task.due_time.slice(
                                                            0,
                                                            5,
                                                        )}
                                                    </span>
                                                )}

                                                {getRecurrenceLabel(task) && (
                                                    <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                                        ↻{" "}
                                                        {getRecurrenceLabel(task)}
                                                    </span>
                                                )}

                                                {getRecurrenceEndLabel(
                                                    task.recurrence_end_date,
                                                ) && (
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {getRecurrenceEndLabel(
                                                                task.recurrence_end_date,
                                                            )}
                                                        </span>
                                                    )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 sm:shrink-0">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openEdit(
                                                        task,
                                                    )
                                                }
                                                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                aria-label={`Edit ${task.title}`}
                                            >
                                                <Edit3 className="size-4" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDeleteTask(
                                                        task,
                                                    )
                                                }
                                                disabled={
                                                    deletingId ===
                                                    task.id
                                                }
                                                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                                                aria-label={`Delete ${task.title}`}
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>
                    )}
                </section>
            </div>

            {/* ================================================== */}
            {/* ADD TASK MODAL */}
            {/* ================================================== */}

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
                                <X className="size-4" />
                            </button>
                        </div>

                        {renderTaskForm(
                            newTask,
                            setNewTask,
                            handleCreateTask,
                            "Create Task",
                            () =>
                                setShowAddTask(
                                    false,
                                ),
                        )}
                    </div>
                </div>
            )}

            {/* ================================================== */}
            {/* EDIT TASK MODAL */}
            {/* ================================================== */}

            {editingTask && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setEditingTask(null);
                            setEditScope("single");
                        }
                    }}
                >
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-semibold tracking-tight">
                                    Edit Task
                                </h2>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Update the details
                                    of your task.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setEditingTask(null);
                                    setEditScope("single");
                                }}
                                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                aria-label="Close"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        {editingTask?.recurrence_type &&
                            editingTask.recurrence_type !== "NONE" && (
                                <div className="mb-5 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                                    <div className="mb-3">
                                        <p className="text-sm font-semibold">
                                            Edit recurring task
                                        </p>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Choose whether this change applies
                                            only to this occurrence or the entire
                                            recurring series.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3">
                                            <input
                                                type="radio"
                                                name="task-edit-scope"
                                                value="single"
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
                                                    Change only this task.
                                                </p>
                                            </div>
                                        </label>

                                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3">
                                            <input
                                                type="radio"
                                                name="task-edit-scope"
                                                value="series"
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
                                                    Apply changes to the recurring
                                                    task series.
                                                </p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}

                        {renderTaskForm(
                            editForm,
                            setEditForm,
                            handleUpdateTask,
                            "Save Changes",
                            () => {
                                setEditingTask(null);
                                setEditScope("single");
                            },
                        )}
                    </div>
                </div>
            )}
            {/* ================================================== */}
            {/* DELETE TASK MODAL */}
            {/* ================================================== */}

            {deletingTask && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setDeletingTask(null);
                            setDeleteScope("single");
                        }
                    }}
                >
                    <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-semibold tracking-tight">
                                    Delete Task
                                </h2>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Choose what you want to delete.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setDeletingTask(null);
                                    setDeleteScope("single");
                                }}
                                disabled={deletingId === deletingTask.id}
                                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                aria-label="Close"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <p className="mb-4 text-sm">
                            <span className="font-medium">
                                "{deletingTask.title}"
                            </span>
                        </p>

                        {deletingTask.recurrence_id &&
                            deletingTask.recurrence_type !==
                            "NONE" && (
                                <div className="space-y-2">
                                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3">
                                        <input
                                            type="radio"
                                            name="tasks-delete-scope"
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
                                            name="tasks-delete-scope"
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
                                <div className="rounded-lg border bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                                    This task is not recurring. Only this task will be deleted.
                                </div>
                            )}

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setDeletingTask(null);
                                    setDeleteScope("single");
                                }}
                                disabled={
                                    deletingId ===
                                    deletingTask.id
                                }
                                className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={
                                    confirmDeleteTask
                                }
                                disabled={
                                    deletingId ===
                                    deletingTask.id
                                }
                                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                {deletingId ===
                                    deletingTask.id
                                    ? "Deleting..."
                                    : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}