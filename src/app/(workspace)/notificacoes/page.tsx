import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BellRing } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOperationalNotifications } from "@/lib/notifications";
import { getProjectWorkspaceAccess } from "@/lib/project-access";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  lockedProjectId,
}: {
  lockedProjectId?: string;
}) {
  if (!lockedProjectId) redirect("/selecionar-projeto");
  if (!isSupabaseConfigured())
    return <NotificationContent notifications={[]} />;
  const access = await getProjectWorkspaceAccess(lockedProjectId);
  if (!access) redirect("/selecionar-projeto?erro=projeto-nao-disponivel");
  return (
    <NotificationContent
      notifications={await getOperationalNotifications(access.projectRole, lockedProjectId)}
    />
  );
}

function NotificationContent({
  notifications,
}: {
  notifications: Awaited<ReturnType<typeof getOperationalNotifications>>;
}) {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-primary">
          Acompanhamento operacional
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Notificações
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pendências internas atualizadas a partir dos registros do sistema. Não
          há integrações externas nesta etapa.
        </p>
      </section>
      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Não há pendências operacionais para este perfil.
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={
                notification.tone === "warning" ? "border-amber-200" : undefined
              }
            >
              <CardHeader>
                <CardTitle className="flex items-start gap-3 text-base">
                  <BellRing
                    className={
                      notification.tone === "warning"
                        ? "mt-0.5 size-5 text-amber-600"
                        : "mt-0.5 size-5 text-primary"
                    }
                  />
                  {notification.title}
                </CardTitle>
                <CardDescription>{notification.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href={notification.href}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Ver pendência
                  <ArrowRight className="size-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
