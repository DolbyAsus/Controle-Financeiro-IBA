import type { ReactNode } from "react";
import { Bell, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/navigation";
import { DesktopSidebar, MobileSidebar } from "./app-sidebar";

export function AppShell({ children, userEmail, role, isPreview = false }: { children: ReactNode; userEmail?: string; role?: UserRole; isPreview?: boolean }) {
  return <div className="min-h-screen bg-muted/35 lg:flex">
    <DesktopSidebar role={role} />
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur lg:px-8">
        <div className="flex min-w-0 items-center gap-3"><div className="lg:hidden"><MobileSidebar role={role} /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">Colégio Batista</p><p className="hidden text-xs text-muted-foreground sm:block">Projeto selecionado</p></div>{isPreview && <span className="hidden rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 sm:inline-block">Prévia local</span>}</div>
        <div className="flex items-center gap-1"><Button variant="ghost" size="icon" aria-label="Notificações"><Bell className="size-4" aria-hidden="true" /></Button><Button variant="ghost" className="max-w-44 justify-start"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{userEmail?.slice(0, 1).toUpperCase() ?? "I"}</span><span className="truncate text-xs">{userEmail ?? "Igreja Batista"}</span><ChevronDown className="ml-auto size-3.5" aria-hidden="true" /></Button></div>
      </header>
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  </div>;
}
