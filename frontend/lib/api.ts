const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ??
    "http://127.0.0.1:8000";

// ============================================================
// AUTH TYPES
// ============================================================

export type LoginRequest = {
    email: string;
    password: string;
};

export type RegisterRequest = {
    name: string;
    email: string;
    password: string;
};

export type DeleteAccountRequest = {
    password: string;
};

export type TokenResponse = {
    access_token: string;
    token_type: string;
};

export type UserResponse = {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
};

// ============================================================
// TASK TYPES
// ============================================================

export type RecurrenceType =
    | "NONE"
    | "DAILY"
    | "WEEKLY"
    | "WEEKDAYS"
    | "WEEKENDS"
    | "CUSTOM";

export type Task = {
    id: number;
    user_id: number;

    title: string;
    description: string | null;

    category: string;
    priority: string;

    // ========================================================
    // GOAL
    // ========================================================

    goal_id: number | null;

    task_date: string;
    due_time: string | null;

    completed: boolean;
    completed_at: string | null;

    notes: string | null;

    // ========================================================
    // RECURRENCE
    // ========================================================

    recurrence_id: string | null;

    recurrence_type: RecurrenceType;

    recurrence_end_date: string | null;

    recurrence_days: string | null;

    recurrence_interval: number;

    created_at: string;
    updated_at: string;
};

export type TaskCreate = {
    title: string;

    description?: string | null;

    category?: string;

    priority?: string;

    // ========================================================
    // GOAL
    // ========================================================

    goal_id?: number | null;

    task_date: string;

    due_time?: string | null;

    notes?: string | null;

    // ========================================================
    // RECURRENCE
    // ========================================================

    recurrence_type?: RecurrenceType;

    recurrence_end_date?: string | null;

    recurrence_days?: number[];

    recurrence_interval?: number;
};

export type TaskUpdate = {
    title?: string;

    description?: string | null;

    category?: string;

    priority?: string;

    // ========================================================
    // GOAL
    // ========================================================

    goal_id?: number | null;

    task_date?: string;

    due_time?: string | null;

    completed?: boolean;

    notes?: string | null;

    // ========================================================
    // RECURRENCE
    // ========================================================

    recurrence_type?: RecurrenceType;

    recurrence_end_date?: string | null;

    recurrence_days?: number[];

    recurrence_interval?: number;
};

// ============================================================
// TASK SYNC EVENTS
// ============================================================

export type TaskSyncEventType =
    | "created"
    | "updated"
    | "deleted"
    | "series-deleted"
    | "series-updated";

export type TaskSyncEvent = {
    type: TaskSyncEventType;

    task?: Task;

    taskId?: number;

    recurrenceId?: string;
};

const TASK_SYNC_EVENT =
    "life-progress:task-changed";

export function emitTaskSyncEvent(
    event: TaskSyncEvent,
): void {
    if (
        typeof window ===
        "undefined"
    ) {
        return;
    }

    window.dispatchEvent(
        new CustomEvent<TaskSyncEvent>(
            TASK_SYNC_EVENT,
            {
                detail: event,
            },
        ),
    );
}

export function subscribeToTaskSync(
    callback: (
        event: TaskSyncEvent,
    ) => void,
): () => void {
    if (
        typeof window ===
        "undefined"
    ) {
        return () => { };
    }

    const handler = (
        event: Event,
    ) => {
        const customEvent =
            event as CustomEvent<TaskSyncEvent>;

        callback(
            customEvent.detail,
        );
    };

    window.addEventListener(
        TASK_SYNC_EVENT,
        handler,
    );

    return () => {
        window.removeEventListener(
            TASK_SYNC_EVENT,
            handler,
        );
    };
}

// ============================================================
// FOCUS TYPES
// ============================================================

export type FocusSessionCreate = {
    started_at: string;
    ended_at: string;
    duration_minutes: number;
    task_id?: number | null;
};

export type FocusSessionResponse = {
    id: number;
    user_id: number;
    task_id: number | null;
    started_at: string;
    ended_at: string;
    duration_minutes: number;
};

export type FocusTimeResponse = {
    total_minutes: number;
};

// ============================================================
// GOAL TYPES
// ============================================================

export type Goal = {
    id: number;
    user_id: number;

    title: string;
    description: string | null;

    category: string;

    target_value: number;
    current_value: number;

    start_date: string;
    target_date: string;

    status: string;

    created_at: string;
    updated_at: string;
};

export type GoalCreate = {
    title: string;

    description?: string | null;

    category?: string;

    target_value?: number;

    current_value?: number;

    start_date: string;
    target_date: string;

    status?: string;
};

export type GoalUpdate = {
    title?: string;

    description?: string | null;

    category?: string;

    target_value?: number;

    current_value?: number;

    start_date?: string;
    target_date?: string;

    status?: string;
};

// ============================================================
// TOKEN MANAGEMENT
// ============================================================

const TOKEN_KEY =
    "life_progress_token";

export function saveToken(
    token: string,
): void {
    if (
        typeof window ===
        "undefined"
    ) {
        return;
    }

    localStorage.setItem(
        TOKEN_KEY,
        token,
    );
}

export function getToken(): string | null {
    if (
        typeof window ===
        "undefined"
    ) {
        return null;
    }

    return localStorage.getItem(
        TOKEN_KEY,
    );
}

export function removeToken(): void {
    if (
        typeof window ===
        "undefined"
    ) {
        return;
    }

    localStorage.removeItem(
        TOKEN_KEY,
    );
}

// ============================================================
// GENERIC API REQUEST
// ============================================================

async function apiRequest<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const token = getToken();

    const headers = new Headers(
        options.headers,
    );

    headers.set(
        "Content-Type",
        "application/json",
    );

    if (token) {
        headers.set(
            "Authorization",
            `Bearer ${token}`,
        );
    }

    let response: Response;

    try {
        response = await fetch(
            `${API_BASE_URL}${path}`,
            {
                ...options,
                headers,
            },
        );
    } catch {
        throw new Error(
            "Unable to connect to the server. Please make sure the backend is running.",
        );
    }

    // ========================================================
    // AUTHENTICATION FAILURE
    // ========================================================

    if (
        response.status ===
        401
    ) {
        removeToken();

        if (
            typeof window !==
            "undefined" &&
            window.location.pathname !==
            "/login"
        ) {
            window.location.replace(
                "/login",
            );
        }

        throw new Error(
            "Your session has expired. Please login again.",
        );
    }

    // ========================================================
    // OTHER API ERRORS
    // ========================================================

    if (!response.ok) {
        let message =
            `Request failed with status ${response.status}`;

        try {
            const error =
                await response.json();

            if (
                typeof error.detail ===
                "string"
            ) {
                message =
                    error.detail;
            } else if (
                Array.isArray(
                    error.detail,
                )
            ) {
                const firstError =
                    error.detail[0];

                if (
                    firstError?.msg
                ) {
                    message =
                        firstError.msg;
                }
            }
        } catch {
            // Keep default error message.
        }

        throw new Error(
            message,
        );
    }

    // ========================================================
    // NO CONTENT
    // ========================================================

    if (
        response.status ===
        204
    ) {
        return undefined as T;
    }

    // ========================================================
    // JSON RESPONSE
    // ========================================================

    return response.json() as Promise<T>;
}

// ============================================================
// AUTH API
// ============================================================

export async function login(
    data: LoginRequest,
): Promise<TokenResponse> {
    const response =
        await fetch(
            `${API_BASE_URL}/api/v1/auth/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",
                },

                body: JSON.stringify(
                    data,
                ),
            },
        );

    if (!response.ok) {
        let message =
            "Login failed";

        try {
            const error =
                await response.json();

            if (
                typeof error.detail ===
                "string"
            ) {
                message =
                    error.detail;
            } else if (
                Array.isArray(
                    error.detail,
                ) &&
                error.detail[0]?.msg
            ) {
                message =
                    error.detail[0].msg;
            }
        } catch {
            // Keep default error message.
        }

        throw new Error(
            message,
        );
    }

    return response.json();
}

export async function register(
    data: RegisterRequest,
): Promise<UserResponse> {
    const response =
        await fetch(
            `${API_BASE_URL}/api/v1/auth/register`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",
                },

                body: JSON.stringify(
                    data,
                ),
            },
        );

    if (!response.ok) {
        let message =
            "Registration failed";

        try {
            const error =
                await response.json();

            if (
                typeof error.detail ===
                "string"
            ) {
                message =
                    error.detail;
            } else if (
                Array.isArray(
                    error.detail,
                ) &&
                error.detail[0]?.msg
            ) {
                message =
                    error.detail[0].msg;
            }
        } catch {
            // Keep default error message.
        }

        throw new Error(
            message,
        );
    }

    return response.json();
}

export async function deleteAccount(
    data: DeleteAccountRequest,
): Promise<void> {
    await apiRequest<void>(
        "/api/v1/auth/me",
        {
            method: "DELETE",

            body: JSON.stringify(
                data,
            ),
        },
    );

    removeToken();
}

// ============================================================
// TASK API
// ============================================================

export async function getTasks(): Promise<Task[]> {
    return apiRequest<Task[]>(
        "/api/v1/tasks",
    );
}

export async function getTask(
    taskId: number,
): Promise<Task> {
    return apiRequest<Task>(
        `/api/v1/tasks/${taskId}`,
    );
}

export async function createTask(
    data: TaskCreate,
): Promise<Task> {
    const task =
        await apiRequest<Task>(
            "/api/v1/tasks",
            {
                method: "POST",

                body: JSON.stringify(
                    data,
                ),
            },
        );

    // Notify Dashboard,
    // Tasks and Calendar.
    emitTaskSyncEvent({
        type: "created",
        task,
    });

    return task;
}

export async function updateTask(
    taskId: number,
    data: TaskUpdate,
): Promise<Task> {
    const task =
        await apiRequest<Task>(
            `/api/v1/tasks/${taskId}`,
            {
                method: "PATCH",

                body: JSON.stringify(
                    data,
                ),
            },
        );

    // Notify Dashboard,
    // Tasks and Calendar.
    emitTaskSyncEvent({
        type: "updated",
        task,
    });

    return task;
}

export async function updateTaskSeries(
    taskId: number,
    data: TaskUpdate,
): Promise<Task> {
    const task =
        await apiRequest<Task>(
            `/api/v1/tasks/series/${taskId}`,
            {
                method: "PATCH",
                body: JSON.stringify(data),
            },
        );

    emitTaskSyncEvent({
        type: "updated",
        task,
    });

    return task;
}

export async function deleteTask(
    taskId: number,
): Promise<void> {
    await apiRequest<void>(
        `/api/v1/tasks/${taskId}`,
        {
            method: "DELETE",
        },
    );

    // Notify Dashboard,
    // Tasks and Calendar.
    emitTaskSyncEvent({
        type: "deleted",
        taskId,
    });
}

export async function deleteTaskSeries(
    recurrenceId: string,
): Promise<void> {
    await apiRequest<void>(
        `/api/v1/tasks/series/${encodeURIComponent(recurrenceId)}`,
        {
            method: "DELETE",
        },
    );

    emitTaskSyncEvent({
        type: "series-deleted",
        recurrenceId,
    });
}

// ============================================================
// FOCUS API
// ============================================================

export async function createFocusSession(
    data: FocusSessionCreate,
): Promise<FocusSessionResponse> {
    return apiRequest<FocusSessionResponse>(
        "/api/v1/focus/sessions",
        {
            method: "POST",

            body: JSON.stringify(
                data,
            ),
        },
    );
}

export async function getTodayFocusTime(): Promise<FocusTimeResponse> {
    return apiRequest<FocusTimeResponse>(
        "/api/v1/focus/today",
    );
}

// ============================================================
// GOALS API
// ============================================================

export async function getGoals(): Promise<Goal[]> {
    return apiRequest<Goal[]>(
        "/api/v1/goals",
    );
}

export async function getGoal(
    goalId: number,
): Promise<Goal> {
    return apiRequest<Goal>(
        `/api/v1/goals/${goalId}`,
    );
}

export async function createGoal(
    data: GoalCreate,
): Promise<Goal> {
    return apiRequest<Goal>(
        "/api/v1/goals",
        {
            method: "POST",

            body: JSON.stringify(
                data,
            ),
        },
    );
}

export async function updateGoal(
    goalId: number,
    data: GoalUpdate,
): Promise<Goal> {
    return apiRequest<Goal>(
        `/api/v1/goals/${goalId}`,
        {
            method: "PATCH",

            body: JSON.stringify(
                data,
            ),
        },
    );
}

export async function deleteGoal(
    goalId: number,
): Promise<void> {
    await apiRequest<void>(
        `/api/v1/goals/${goalId}`,
        {
            method: "DELETE",
        },
    );
}