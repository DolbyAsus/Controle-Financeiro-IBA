import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export const DEFAULT_PAGE_SIZE = 10;

export function paginationRange(
  pageValue?: string,
  pageSize = DEFAULT_PAGE_SIZE,
) {
  const parsedPage = Number.parseInt(pageValue ?? "1", 10);
  const page = Number.isFinite(parsedPage) ? Math.max(parsedPage, 1) : 1;
  const from = (page - 1) * pageSize;
  return { page, from, to: from + pageSize - 1, pageSize };
}

export function databasePage<T>(
  items: T[],
  count: number | null,
  page: number,
  pageSize = DEFAULT_PAGE_SIZE,
) {
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  return { items, page: Math.min(page, totalPages), totalPages, count: count ?? 0 };
}

export function paginate<T>(
  items: T[],
  pageValue?: string,
  pageSize = DEFAULT_PAGE_SIZE,
) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const parsedPage = Number.parseInt(pageValue ?? "1", 10);
  const page = Number.isFinite(parsedPage)
    ? Math.min(Math.max(parsedPage, 1), totalPages)
    : 1;
  const start = (page - 1) * pageSize;

  return { items: items.slice(start, start + pageSize), page, totalPages };
}

type PaginationProps = {
  page: number;
  totalPages: number;
  params?: Record<string, string | undefined>;
  pageParam?: string;
  label?: string;
};

export function Pagination({
  page,
  totalPages,
  params = {},
  pageParam = "pagina",
  label = "registros",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const href = (targetPage: number) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value && key !== pageParam) search.set(key, value);
    });
    search.set(pageParam, String(targetPage));
    return `?${search.toString()}`;
  };

  return (
    <nav
      className="mt-4 flex flex-col gap-2 border-t pt-3 text-sm sm:flex-row sm:items-center sm:justify-between"
      aria-label={`Paginação de ${label}`}
    >
      <p className="text-muted-foreground">
        Página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            className={buttonVariants({ variant: "outline", size: "sm" })}
            href={href(page - 1)}
          >
            <ChevronLeft className="size-3.5" />
            Anterior
          </Link>
        ) : (
          <span
            className={`${buttonVariants({ variant: "outline", size: "sm" })} cursor-not-allowed opacity-50`}
            aria-disabled="true"
          >
            <ChevronLeft className="size-3.5" />
            Anterior
          </span>
        )}
        {page < totalPages ? (
          <Link
            className={buttonVariants({ variant: "outline", size: "sm" })}
            href={href(page + 1)}
          >
            Próxima
            <ChevronRight className="size-3.5" />
          </Link>
        ) : (
          <span
            className={`${buttonVariants({ variant: "outline", size: "sm" })} cursor-not-allowed opacity-50`}
            aria-disabled="true"
          >
            Próxima
            <ChevronRight className="size-3.5" />
          </span>
        )}
      </div>
    </nav>
  );
}
