import IncomePage from "@/app/(workspace)/entradas/page";

export default async function ProjectIncomePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ mensagem?: string; erro?: string; pagina?: string }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  return <IncomePage searchParams={Promise.resolve({ ...query, projeto: projectId })} />;
}
