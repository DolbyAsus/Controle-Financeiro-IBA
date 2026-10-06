import QuotationsPage from "@/app/(workspace)/cotacoes/page";

export default async function ProjectQuotationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ mensagem?: string; erro?: string; pagina?: string }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  return <QuotationsPage searchParams={Promise.resolve({ ...query, projeto: projectId })} />;
}
