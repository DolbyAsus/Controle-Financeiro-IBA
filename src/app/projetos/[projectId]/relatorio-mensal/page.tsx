import MonthlyReportPage from "@/app/(workspace)/relatorio-mensal/page";

export default async function ProjectMonthlyReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  return <MonthlyReportPage searchParams={Promise.resolve(query)} lockedProjectId={projectId} />;
}
