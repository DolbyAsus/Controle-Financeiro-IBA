import StagesPage from "@/app/(workspace)/etapas/page";

export default async function ProjectStagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ mensagem?: string; erro?: string; pagina?: string }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  return <StagesPage searchParams={Promise.resolve({ ...query, projeto: projectId })} />;
}
