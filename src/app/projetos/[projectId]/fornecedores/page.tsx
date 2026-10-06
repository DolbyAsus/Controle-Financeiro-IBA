import SuppliersPage from "@/app/(workspace)/fornecedores/page";

export default async function ProjectSuppliersPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ mensagem?: string; erro?: string; pagina?: string }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  return <SuppliersPage searchParams={Promise.resolve({ ...query, projeto: projectId })} />;
}
