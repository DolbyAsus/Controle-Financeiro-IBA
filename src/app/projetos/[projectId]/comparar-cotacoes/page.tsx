import CompareQuotationsPage from "@/app/(workspace)/comparar-cotacoes/page";

export default async function ProjectCompareQuotationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ mensagem?: string; erro?: string; etapa?: string; categoria?: string; status?: string; mes?: string; pagina?: string }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  return <CompareQuotationsPage searchParams={Promise.resolve(query)} lockedProjectId={projectId} />;
}
