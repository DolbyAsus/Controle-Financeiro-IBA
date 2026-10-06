import PaymentsPage from "@/app/(workspace)/pagamentos/page";

export default async function ProjectPaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ mensagem?: string; erro?: string; despesa?: string; pagina?: string; pagina_despesas?: string }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  return <PaymentsPage searchParams={Promise.resolve({ ...query, projeto: projectId })} />;
}
