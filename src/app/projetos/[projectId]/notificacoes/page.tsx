import NotificationsPage from "@/app/(workspace)/notificacoes/page";

export default async function ProjectNotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ pagina?: string }>;
}) {
  const { projectId } = await params;
  return <NotificationsPage lockedProjectId={projectId} searchParams={searchParams} />;
}
