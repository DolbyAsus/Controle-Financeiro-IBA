import BudgetsPage from "@/app/(workspace)/orcamentos/page";

export default async function ProjectBudgetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ mensagem?: string; erro?: string; pagina?: string }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  return <BudgetsPage searchParams={Promise.resolve({ ...query, projeto: projectId })} />;
}
