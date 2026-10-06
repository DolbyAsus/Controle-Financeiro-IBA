"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, Menu, ShieldCheck } from "lucide-react";

import { BrandSpectrum, IbaMark } from "@/components/brand/iba-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { type UserRole, projectNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function NavigationLinks({ role, projectId }: { role?: UserRole; projectId?: string }) {
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
    {role === "admin" ? <Link href="/admin/resumo-geral" className={cn("flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors", pathname === "/admin/resumo-geral" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><ShieldCheck className="size-4" aria-hidden="true" />Resumo geral</Link> : null}
  </nav>;
}

export function Brand({ projectId }: { projectId?: string }) {
  return <Link href={projectId ? `/projetos/${projectId}/dashboard` : "/selecionar-projeto"} className="flex items-center gap-3 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
    <IbaMark />
    <span className="min-w-0"><span className="block truncate text-sm font-semibold">Gestão Financeira</span><span className="block truncate text-xs text-muted-foreground">Igreja Batista da Aliança</span></span>
  </Link>;
}

export function DesktopSidebar({ role, projectId }: { role?: UserRole; projectId?: string }) {
  return <aside className="hidden min-h-screen w-68 shrink-0 border-r bg-sidebar lg:block"><BrandSpectrum className="h-1" /><Brand projectId={projectId} /><NavigationLinks role={role} projectId={projectId} /></aside>;
}

export function MobileSidebar({ role, projectId }: { role?: UserRole; projectId?: string }) {
  return <Sheet>
    <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Abrir menu" />}><Menu className="size-5" aria-hidden="true" /></SheetTrigger>
    <SheetContent side="left" className="w-[min(20rem,85vw)] p-0">
      <SheetHeader className="sr-only"><SheetTitle>Menu principal</SheetTitle><SheetDescription>Navegação do sistema financeiro.</SheetDescription></SheetHeader>
      <BrandSpectrum className="h-1" /><Brand projectId={projectId} /><NavigationLinks role={role} projectId={projectId} />
    </SheetContent>
  </Sheet>;
}
