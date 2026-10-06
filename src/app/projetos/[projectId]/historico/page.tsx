import HistoryPage from "@/app/(workspace)/historico/page";

export default async function ProjectHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ pagina?: string }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  return <HistoryPage searchParams={Promise.resolve(query)} lockedProjectId={projectId} />;
}
