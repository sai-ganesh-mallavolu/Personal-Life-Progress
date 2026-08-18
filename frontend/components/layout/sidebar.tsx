"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
    Activity,
    AlertTriangle,
    BarChart3,
    CalendarDays,
    CheckSquare,
    CircleUserRound,
    Dumbbell,
    Flame,
    FolderKanban,
    Goal,
    HeartPulse,
    Home,
    Leaf,
    ListChecks,
    LogOut,
    Moon,
    Settings,
    Sparkles,
    Timer,
    Trash2,
    Utensils,
    X,
} from "lucide-react";

import {
    deleteAccount,
    removeToken,
} from "@/lib/api";

type NavigationItem = {
    label: string;
    href: string;
    icon: React.ComponentType<{
        className?: string;
    }>;
};

const primaryNavigation: NavigationItem[] = [
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: Home,
    },
    {
        label: "Tasks",
        href: "/tasks",
        icon: ListChecks,
    },
    {
        label: "Today",
        href: "/today",
        icon: ListChecks,
    },
    {
        label: "Calendar",
        href: "/calendar",
        icon: CalendarDays,
    },
];

const lifeNavigation: NavigationItem[] = [
    {
        label: "Work & Study",
        href: "/work",
        icon: CheckSquare,
    },
    {
        label: "Fitness",
        href: "/fitness",
        icon: Dumbbell,
    },
    {
        label: "Nutrition",
        href: "/nutrition",
        icon: Utensils,
    },
    {
        label: "Hair Care",
        href: "/hair-care",
        icon: Sparkles,
    },
    {
        label: "Skin Care",
        href: "/skin-care",
        icon: HeartPulse,
    },
    {
        label: "Sleep",
        href: "/sleep",
        icon: Moon,
    },
];

const progressNavigation: NavigationItem[] = [
    {
        label: "Goals",
        href: "/goals",
        icon: Goal,
    },
    {
        label: "Analytics",
        href: "/analytics",
        icon: BarChart3,
    },
    {
        label: "Streaks",
        href: "/streaks",
        icon: Flame,
    },
    {
        label: "Journal",
        href: "/journal",
        icon: Leaf,
    },
    {
        label: "Focus",
        href: "/focus",
        icon: Timer,
    },
    {
        label: "Projects",
        href: "/projects",
        icon: FolderKanban,
    },
];

function NavigationGroup({
    items,
    pathname,
}: {
    items: NavigationItem[];
    pathname: string;
}) {
    return (
        <nav className="space-y-1">
            {items.map((item) => {
                const Icon = item.icon;

                const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                        pathname.startsWith(
                            `${item.href}/`,
                        ));

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={[
                            "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                            isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        ].join(" ")}
                    >
                        <Icon
                            className={[
                                "size-4 shrink-0 transition-colors",
                                isActive
                                    ? "text-primary-foreground"
                                    : "text-muted-foreground group-hover:text-accent-foreground",
                            ].join(" ")}
                        />

                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const [showProfileMenu, setShowProfileMenu] =
        useState(false);

    const [showDeleteDialog, setShowDeleteDialog] =
        useState(false);

    const [password, setPassword] =
        useState("");

    const [deleteError, setDeleteError] =
        useState<string | null>(null);

    const [loggingOut, setLoggingOut] =
        useState(false);

    const [deletingAccount, setDeletingAccount] =
        useState(false);

    // ========================================================
    // LOGOUT
    // ========================================================

    const handleLogout = () => {
        setLoggingOut(true);

        // IMPORTANT:
        // Logout only removes the browser token.
        // User data remains in the database.
        removeToken();

        router.replace("/login");
    };

    // ========================================================
    // OPEN DELETE ACCOUNT
    // ========================================================

    const openDeleteAccountDialog = () => {
        setShowProfileMenu(false);
        setShowDeleteDialog(true);
        setPassword("");
        setDeleteError(null);
    };

    // ========================================================
    // CLOSE DELETE ACCOUNT
    // ========================================================

    const closeDeleteAccountDialog = () => {
        if (deletingAccount) {
            return;
        }

        setShowDeleteDialog(false);
        setPassword("");
        setDeleteError(null);
    };

    // ========================================================
    // DELETE ACCOUNT
    // ========================================================

    const handleDeleteAccount = async () => {
        if (!password.trim()) {
            setDeleteError(
                "Please enter your current password.",
            );
            return;
        }

        try {
            setDeletingAccount(true);
            setDeleteError(null);

            await deleteAccount({
                password,
            });

            // Account is permanently deleted
            // on the backend at this point.
            removeToken();

            router.replace("/login");
        } catch (error) {
            setDeleteError(
                error instanceof Error
                    ? error.message
                    : "Unable to delete your account.",
            );
        } finally {
            setDeletingAccount(false);
        }
    };

    return (
        <>
            <aside className="hidden h-screen w-64 shrink-0 border-r bg-sidebar lg:flex lg:flex-col">
                {/* ================================================== */}
                {/* BRAND */}
                {/* ================================================== */}

                <div className="flex h-16 items-center border-b px-5">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2"
                    >
                        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <Activity className="size-4" />
                        </div>

                        <div className="leading-tight">
                            <p className="text-sm font-semibold tracking-tight">
                                Life Progress
                            </p>

                            <p className="text-[11px] text-muted-foreground">
                                Personal Progress OS
                            </p>
                        </div>
                    </Link>
                </div>

                {/* ================================================== */}
                {/* NAVIGATION */}
                {/* ================================================== */}

                <div className="flex-1 overflow-y-auto px-3 py-5">
                    <div className="space-y-6">
                        {/* OVERVIEW */}

                        <section>
                            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                Overview
                            </p>

                            <NavigationGroup
                                items={primaryNavigation}
                                pathname={pathname}
                            />
                        </section>

                        {/* LIFE */}

                        <section>
                            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                Life
                            </p>

                            <NavigationGroup
                                items={lifeNavigation}
                                pathname={pathname}
                            />
                        </section>

                        {/* PROGRESS */}

                        <section>
                            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                Progress
                            </p>

                            <NavigationGroup
                                items={progressNavigation}
                                pathname={pathname}
                            />
                        </section>
                    </div>
                </div>

                {/* ================================================== */}
                {/* BOTTOM */}
                {/* ================================================== */}

                <div className="border-t p-3">
                    {/* SETTINGS */}

                    <Link
                        href="/settings"
                        className={[
                            "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                            pathname === "/settings"
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        ].join(" ")}
                    >
                        <Settings className="size-4" />

                        <span>Settings</span>
                    </Link>

                    {/* ================================================== */}
                    {/* PROFILE MENU */}
                    {/* ================================================== */}

                    <div className="relative mt-2">
                        {showProfileMenu && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border bg-card shadow-xl">
                                {/* PROFILE HEADER */}

                                <div className="flex items-center justify-between border-b px-4 py-3">
                                    <div>
                                        <p className="text-sm font-semibold">
                                            Your Profile
                                        </p>

                                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                                            Personal account
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowProfileMenu(
                                                false,
                                            )
                                        }
                                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                        aria-label="Close profile menu"
                                    >
                                        <X className="size-4" />
                                    </button>
                                </div>

                                {/* PROFILE ACTIONS */}

                                <div className="p-2">
                                    {/* LOGOUT */}

                                    <button
                                        type="button"
                                        onClick={
                                            handleLogout
                                        }
                                        disabled={
                                            loggingOut ||
                                            deletingAccount
                                        }
                                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <LogOut className="size-4" />

                                        <span>
                                            {loggingOut
                                                ? "Logging out..."
                                                : "Logout"}
                                        </span>
                                    </button>

                                    {/* DELETE ACCOUNT */}

                                    <button
                                        type="button"
                                        onClick={
                                            openDeleteAccountDialog
                                        }
                                        disabled={
                                            loggingOut ||
                                            deletingAccount
                                        }
                                        className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Trash2 className="size-4" />

                                        <span>
                                            Delete Account
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* PROFILE BUTTON */}

                        <button
                            type="button"
                            onClick={() =>
                                setShowProfileMenu(
                                    (current) =>
                                        !current,
                                )
                            }
                            className={[
                                "flex w-full items-center gap-3 rounded-lg border bg-background/60 p-3 text-left transition-colors",
                                showProfileMenu
                                    ? "border-primary/30 bg-accent"
                                    : "hover:bg-accent",
                            ].join(" ")}
                            aria-expanded={
                                showProfileMenu
                            }
                            aria-haspopup="menu"
                        >
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                                <CircleUserRound className="size-4 text-muted-foreground" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium">
                                    Your Profile
                                </p>

                                <p className="truncate text-[11px] text-muted-foreground">
                                    Personal account
                                </p>
                            </div>
                        </button>
                    </div>
                </div>
            </aside>

            {/* ====================================================== */}
            {/* DELETE ACCOUNT DIALOG */}
            {/* ====================================================== */}

            {showDeleteDialog && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-account-title"
                >
                    <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
                        {/* HEADER */}

                        <div className="flex items-start gap-4">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                                <AlertTriangle className="size-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <h2
                                    id="delete-account-title"
                                    className="text-lg font-semibold"
                                >
                                    Delete your account?
                                </h2>

                                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                                    This action permanently
                                    deletes your account
                                    and all associated
                                    progress.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeDeleteAccountDialog
                                }
                                disabled={
                                    deletingAccount
                                }
                                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                                aria-label="Close delete account dialog"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        {/* WARNING */}

                        <div className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                            <p className="text-sm font-medium text-destructive">
                                The following will be
                                permanently deleted:
                            </p>

                            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                                <li>
                                    • Your account
                                </li>

                                <li>
                                    • All your tasks
                                </li>

                                <li>
                                    • Focus session
                                    history
                                </li>

                                <li>
                                    • All account
                                    progress data
                                </li>

                                <li>
                                    • Your login
                                    credentials
                                </li>
                            </ul>
                        </div>

                        {/* PASSWORD */}

                        <div className="mt-5">
                            <label
                                htmlFor="delete-account-password"
                                className="text-sm font-medium"
                            >
                                Enter your current
                                password
                            </label>

                            <input
                                id="delete-account-password"
                                type="password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(
                                        event.target
                                            .value,
                                    )
                                }
                                placeholder="Current password"
                                disabled={
                                    deletingAccount
                                }
                                autoComplete="current-password"
                                className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        {/* ERROR */}

                        {deleteError && (
                            <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                                {deleteError}
                            </div>
                        )}

                        {/* ACTIONS */}

                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={
                                    closeDeleteAccountDialog
                                }
                                disabled={
                                    deletingAccount
                                }
                                className="h-11 rounded-xl border px-5 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={
                                    handleDeleteAccount
                                }
                                disabled={
                                    deletingAccount ||
                                    !password.trim()
                                }
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-destructive px-5 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Trash2 className="size-4" />

                                {deletingAccount
                                    ? "Deleting..."
                                    : "Delete My Account"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}