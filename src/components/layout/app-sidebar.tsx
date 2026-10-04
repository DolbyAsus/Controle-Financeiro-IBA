"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Church, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { primaryNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function NavigationLinks() {
  const pathname = usePathname();
  return <nav aria-label="Navegação principal" className="space-y-1 px-3 pb-4">
    {primaryNavigation.map(({ href, icon: Icon, label }) => (
      <Link key={href} href={href} className={cn("flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors", pathname === href ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
        <Icon className="size-4" aria-hidden="true" />{label}
      </Link>
    ))}
  </nav>;
}

export function Brand() {
  return <Link href="/dashboard" className="flex items-center gap-3 px-5 py-5">
    <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><Church className="size-5" aria-hidden="true" /></span>
    <span className="min-w-0"><span className="block truncate text-sm font-semibold">Gestão de Projetos</span><span className="block truncate text-xs text-muted-foreground">Igreja Batista da Aliança</span></span>
  </Link>;
}

export function DesktopSidebar() {
  return <aside className="hidden min-h-screen w-68 shrink-0 border-r bg-card lg:block"><Brand /><NavigationLinks /></aside>;
}

export function MobileSidebar() {
  return <Sheet>
    <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Abrir menu" />}><Menu className="size-5" aria-hidden="true" /></SheetTrigger>
    <SheetContent side="left" className="w-[min(20rem,85vw)] p-0">
      <SheetHeader className="sr-only"><SheetTitle>Menu principal</SheetTitle><SheetDescription>Navegação do sistema financeiro.</SheetDescription></SheetHeader>
      <Brand /><NavigationLinks />
    </SheetContent>
  </Sheet>;
}
