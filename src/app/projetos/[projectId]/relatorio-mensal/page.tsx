import MonthlyReportPage from "@/app/(workspace)/relatorio-mensal/page";

export default async function ProjectMonthlyReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    inicio?: string;
    fim?: string;
    pagina_entradas?: string;
    pagina_despesas?: string;
    pagina_pagamentos?: string;
    pagina_orcamentos?: string;
  }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  return <MonthlyReportPage searchParams={Promise.resolve(query)} lockedProjectId={projectId} />;
}
