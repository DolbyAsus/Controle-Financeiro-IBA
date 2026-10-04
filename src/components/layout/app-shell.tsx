import type { ReactNode } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";

import type { UserRole } from "@/lib/navigation";
import { DesktopSidebar, MobileSidebar } from "./app-sidebar";
import { SignOutButton } from "./sign-out-button";

export function AppShell({ children, userEmail, role, notificationCount = 0, isPreview = false }: { children: ReactNode; userEmail?: string; role?: UserRole; notificationCount?: number; isPreview?: boolean }) {
  return <div className="min-h-screen bg-muted/35 lg:flex">
    <DesktopSidebar role={role} />
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur lg:px-8">
        <div className="flex min-w-0 items-center gap-3"><div className="lg:hidden"><MobileSidebar role={role} /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">Colégio Batista</p><p className="hidden text-xs text-muted-foreground sm:block">Projeto selecionado</p></div>{isPreview && <span className="hidden rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 sm:inline-block">Prévia local</span>}</div>
        <div className="flex items-center gap-1"><Link href="/notificacoes" aria-label={`Notificações${notificationCount ? `: ${notificationCount} pendências` : ""}`} className="relative inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted"><Bell className="size-4" aria-hidden="true" />{notificationCount > 0 ? <span className="absolute right-0 top-0 grid min-h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{notificationCount > 9 ? "9+" : notificationCount}</span> : null}</Link><div className="flex max-w-44 items-center gap-2 px-2"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{userEmail?.slice(0, 1).toUpperCase() ?? "I"}</span><span className="truncate text-xs">{userEmail ?? "Igreja Batista"}</span></div>{!isPreview ? <SignOutButton /> : null}</div>
      </header>
      <main className="mx-auto w-full max-w-7xl break-words p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  </div>;
}
