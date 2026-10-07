"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type LinkedRecord = {
  id: string;
  title: string;
  value: number | string;
  status: string;
  projectName: string;
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function LinkedRecordList({
  title,
  icon: Icon,
  items,
  emptyMessage,
}: {
  title: string;
  icon: LucideIcon;
  items: LinkedRecord[];
  emptyMessage: string;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <section className="rounded-lg border" aria-label={title}>
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Icon className="size-4 text-primary" aria-hidden="true" />{title}</h3>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      {items.length === 0 ? <p className="px-3 py-3 text-sm text-muted-foreground">{emptyMessage}</p> : <ul className="divide-y">{pageItems.map((item) => <li key={item.id} className="space-y-1 px-3 py-2 text-sm"><div className="flex items-start justify-between gap-2"><span className="min-w-0 break-words font-medium">{item.title}</span><Badge className="shrink-0" variant="secondary">{item.status}</Badge></div><p className="text-xs text-muted-foreground">{item.projectName} · {money.format(Number(item.value))}</p></li>)}</ul>}
      {totalPages > 1 ? <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-xs"><span className="text-muted-foreground">Página {safePage} de {totalPages}</span><div className="flex gap-2"><Button type="button" size="xs" variant="outline" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</Button><Button type="button" size="xs" variant="outline" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Próxima</Button></div></div> : null}
    </section>
  );
}
