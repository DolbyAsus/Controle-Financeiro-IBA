import type { ReactNode } from "react";
import { Bell, Repeat2 } from "lucide-react";
import Link from "next/link";

import { BrandSpectrum } from "@/components/brand/iba-logo";
import type { UserRole } from "@/lib/navigation";
import { DesktopSidebar, MobileSidebar } from "./app-sidebar";
import { SignOutButton } from "./sign-out-button";

type ActiveProject = { id: string; name: string };

export function AppShell({ children, userEmail, role, notificationCount = 0, notificationHref = "/selecionar-projeto", isPreview = false, activeProject, isGlobalAdmin = false }: { children: ReactNode; userEmail?: string; role?: UserRole; notificationCount?: number; notificationHref?: string; isPreview?: boolean; activeProject?: ActiveProject; isGlobalAdmin?: boolean }) {
  return <div className="min-h-screen bg-muted/35 lg:flex">
    <DesktopSidebar role={role} projectId={activeProject?.id} isGlobalAdmin={isGlobalAdmin} />
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b bg-background/95 px-3 shadow-[0_1px_0_rgba(0,159,227,0.05)] backdrop-blur sm:px-4 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3"><div className="lg:hidden"><MobileSidebar role={role} projectId={activeProject?.id} isGlobalAdmin={isGlobalAdmin} /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{activeProject?.name ?? "Área de trabalho"}</p><p className="hidden text-xs text-muted-foreground sm:block">{activeProject ? "Projeto ativo" : "Selecione um projeto para operar"}</p></div>{activeProject ? <Link href="/selecionar-projeto" className="hidden items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-muted sm:inline-flex"><Repeat2 className="size-3.5" aria-hidden="true" />Trocar</Link> : null}{isPreview && <span className="hidden rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 sm:inline-block">Prévia local</span>}</div>
        <div className="flex shrink-0 items-center gap-1"><Link href={notificationHref} aria-label={`Notificações${notificationCount ? `: ${notificationCount} pendências` : ""}`} className="relative inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted"><Bell className="size-4" aria-hidden="true" />{notificationCount > 0 ? <span className="absolute right-0 top-0 grid min-h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{notificationCount > 9 ? "9+" : notificationCount}</span> : null}</Link><div className="flex items-center gap-2 px-1 sm:max-w-44 sm:px-2"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{userEmail?.slice(0, 1).toUpperCase() ?? "I"}</span><span className="hidden truncate text-xs sm:inline">{userEmail ?? "Igreja Batista"}</span></div>{!isPreview ? <SignOutButton /> : null}</div>
      </header>
      <BrandSpectrum className="sticky top-16 z-10 h-0.5 opacity-80" />
      <main className="mx-auto w-full max-w-7xl break-words p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  </div>;
}
