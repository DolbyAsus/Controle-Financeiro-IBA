import ExpensesPage from "@/app/(workspace)/despesas/page";

export default async function ProjectExpensesPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ mensagem?: string; erro?: string; pagina?: string }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  return <ExpensesPage searchParams={Promise.resolve({ ...query, projeto: projectId })} />;
}
