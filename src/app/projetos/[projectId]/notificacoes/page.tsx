import NotificationsPage from "@/app/(workspace)/notificacoes/page";

export default async function ProjectNotificationsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <NotificationsPage lockedProjectId={projectId} />;
}
