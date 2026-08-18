"use client";

import Link from "next/link";
import {
    Activity,
    Bell,
    CalendarDays,
    CheckSquare,
    Dumbbell,
    Flame,
    Goal,
    HeartPulse,
    Home,
    Leaf,
    ListChecks,
    Menu,
    Moon,
    Settings,
    Sparkles,
    Timer,
    Utensils,
    BarChart3,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

const navigation = [
    {
        section: "Overview",
        items: [
            { label: "Dashboard", href: "/dashboard", icon: Home },
            { label: "Today", href: "/today", icon: ListChecks },
            { label: "Calendar", href: "/calendar", icon: CalendarDays },
        ],
    },
    {
        section: "Life",
        items: [
            { label: "Work & Study", href: "/work", icon: CheckSquare },
            { label: "Fitness", href: "/fitness", icon: Dumbbell },
            { label: "Nutrition", href: "/nutrition", icon: Utensils },
            { label: "Hair Care", href: "/hair-care", icon: Sparkles },
            { label: "Skin Care", href: "/skin-care", icon: HeartPulse },
            { label: "Sleep", href: "/sleep", icon: Moon },
        ],
    },
    {
        section: "Progress",
        items: [
            { label: "Goals", href: "/goals", icon: Goal },
            { label: "Analytics", href: "/analytics", icon: BarChart3 },
            { label: "Streaks", href: "/streaks", icon: Flame },
            { label: "Journal", href: "/journal", icon: Leaf },
            { label: "Focus", href: "/focus", icon: Timer },
        ],
    },
];

export function Header() {
    return (
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
            <div className="lg:hidden">
                <Sheet>
                    <SheetTrigger
                        render={
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-9"
                                aria-label="Open navigation"
                            />
                        }
                    >
                        <Menu className="size-5" />
                    </SheetTrigger>

                    <SheetContent side="left" className="w-72 p-0">
                        <SheetHeader className="border-b px-5 py-5 text-left">
                            <SheetTitle className="flex items-center gap-2">
                                <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <Activity className="size-4" />
                                </span>
                                Life Progress
                            </SheetTitle>

                            <SheetDescription>
                                Personal Progress OS
                            </SheetDescription>
                        </SheetHeader>

                        <div className="overflow-y-auto px-4 py-5">
                            <div className="space-y-6">
                                {navigation.map((group) => (
                                    <section key={group.section}>
                                        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                            {group.section}
                                        </p>

                                        <nav className="space-y-1">
                                            {group.items.map((item) => {
                                                const Icon = item.icon;

                                                return (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                                    >
                                                        <Icon className="size-4" />
                                                        <span>{item.label}</span>
                                                    </Link>
                                                );
                                            })}
                                        </nav>
                                    </section>
                                ))}

                                <section className="border-t pt-4">
                                    <Link
                                        href="/settings"
                                        className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                    >
                                        <Settings className="size-4" />
                                        Settings
                                    </Link>
                                </section>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            <div className="hidden flex-1 items-center lg:flex">
                <div className="relative w-full max-w-sm">
                    <svg
                        aria-hidden="true"
                        className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <circle cx="11" cy="11" r="7" />
                        <path d="m20 20-3.5-3.5" />
                    </svg>

                    <input
                        type="search"
                        placeholder="Search..."
                        className="h-9 w-full rounded-lg border bg-muted/30 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                    />
                </div>
            </div>

            <div className="ml-auto flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    aria-label="Notifications"
                >
                    <Bell className="size-4" />
                </Button>

                <div className="ml-2 hidden items-center gap-2 border-l pl-3 sm:flex">
                    <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        SG
                    </div>

                    <div className="hidden leading-tight xl:block">
                        <p className="text-xs font-medium">Your Profile</p>
                        <p className="text-[11px] text-muted-foreground">
                            Personal account
                        </p>
                    </div>
                </div>
            </div>
        </header>
    );
}