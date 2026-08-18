"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BarChart3,
    CheckSquare,
    Home,
    ListChecks,
    Plus,
} from "lucide-react";

const navigation = [
    {
        label: "Home",
        href: "/dashboard",
        icon: Home,
    },
    {
        label: "Today",
        href: "/today",
        icon: ListChecks,
    },
    {
        label: "Work",
        href: "/work",
        icon: CheckSquare,
    },
    {
        label: "Analytics",
        href: "/analytics",
        icon: BarChart3,
    },
];

export function MobileNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
            <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
                {navigation.slice(0, 2).map((item) => {
                    const Icon = item.icon;
                    const isActive =
                        pathname === item.href ||
                        (item.href !== "/dashboard" &&
                            pathname.startsWith(`${item.href}/`));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={[
                                "flex min-w-14 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground",
                            ].join(" ")}
                        >
                            <Icon className="size-4" />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}

                <Link
                    href="/today"
                    aria-label="Add"
                    className="flex size-11 -translate-y-3 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background"
                >
                    <Plus className="size-5" />
                </Link>

                {navigation.slice(2).map((item) => {
                    const Icon = item.icon;
                    const isActive =
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={[
                                "flex min-w-14 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground",
                            ].join(" ")}
                        >
                            <Icon className="size-4" />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}