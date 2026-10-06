import CategoriesPage from "@/app/(workspace)/categorias/page";

export default async function ProjectCategoriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ mensagem?: string; erro?: string; pagina?: string }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  return <CategoriesPage searchParams={Promise.resolve({ ...query, projeto: projectId })} />;
}
