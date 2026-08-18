import type { ReactNode } from "react";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";

type AppShellProps = {
    children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar />

            <div className="flex min-w-0 flex-1 flex-col">
                <Header />

                <main className="flex-1 pb-20 lg:pb-0">
                    <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
                        {children}
                    </div>
                </main>
            </div>

            <MobileNav />
        </div>
    );
}