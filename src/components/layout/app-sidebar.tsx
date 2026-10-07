"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, Menu, ShieldCheck, Users } from "lucide-react";

import { BrandSpectrum, IbaMark } from "@/components/brand/iba-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { type UserRole, projectNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function NavigationLinks({ role, projectId, isGlobalAdmin = false }: { role?: UserRole; projectId?: string; isGlobalAdmin?: boolean }) {
  const pathname = usePathname();
  const items = projectId
    ? projectNavigation.map((item) => ({ ...item, href: `/projetos/${projectId}${item.href}` }))
    : [{ href: "/selecionar-projeto", label: "Selecionar projeto", icon: FolderKanban }];
  return <nav aria-label="Navegação principal" className="space-y-1 px-3 pb-4">
    {items.filter((item) => !item.roles || !role || item.roles.includes(role)).map(({ href, icon: Icon, label }) => (
      <Link key={href} href={href} className={cn("flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors", pathname === href ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
        <Icon className="size-4" aria-hidden="true" />{label}
      </Link>
    ))}
    {isGlobalAdmin ? <>
      <Link href="/usuarios" className={cn("flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors", pathname === "/usuarios" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Users className="size-4" aria-hidden="true" />Usuários globais</Link>
      <Link href="/admin/resumo-geral" className={cn("flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors", pathname === "/admin/resumo-geral" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><ShieldCheck className="size-4" aria-hidden="true" />Resumo geral</Link>
    </> : null}
  </nav>;
}

export function Brand({ projectId }: { projectId?: string }) {
  return <Link href={projectId ? `/projetos/${projectId}/dashboard` : "/selecionar-projeto"} className="flex items-center gap-3 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
    <IbaMark />
    <span className="min-w-0"><span className="block truncate text-sm font-semibold">Gestão Financeira</span><span className="block truncate text-xs text-muted-foreground">Igreja Batista da Aliança</span></span>
  </Link>;
}

export function DesktopSidebar({ role, projectId, isGlobalAdmin = false }: { role?: UserRole; projectId?: string; isGlobalAdmin?: boolean }) {
  return <aside className="sticky top-0 hidden h-dvh w-68 shrink-0 flex-col overflow-hidden border-r bg-sidebar lg:flex"><BrandSpectrum className="h-1 shrink-0" /><Brand projectId={projectId} /><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"><NavigationLinks role={role} projectId={projectId} isGlobalAdmin={isGlobalAdmin} /></div></aside>;
}

export function MobileSidebar({ role, projectId, isGlobalAdmin = false }: { role?: UserRole; projectId?: string; isGlobalAdmin?: boolean }) {
  return <Sheet>
    <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Abrir menu" />}><Menu className="size-5" aria-hidden="true" /></SheetTrigger>
    <SheetContent side="left" className="h-dvh max-h-dvh w-[min(20rem,85vw)] overflow-hidden p-0">
      <SheetHeader className="sr-only"><SheetTitle>Menu principal</SheetTitle><SheetDescription>Navegação do sistema financeiro.</SheetDescription></SheetHeader>
      <BrandSpectrum className="h-1 shrink-0" /><Brand projectId={projectId} /><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1 touch-pan-y"><NavigationLinks role={role} projectId={projectId} isGlobalAdmin={isGlobalAdmin} /></div>
    </SheetContent>
  </Sheet>;
}
