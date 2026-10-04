import type { UserRole } from "@/lib/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type OperationalNotification = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "warning" | "info";
};

export async function getOperationalNotifications(role?: UserRole): Promise<OperationalNotification[]> {
  if (!role || !isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const [quotationsResult, budgetsResult, expensesResult] = await Promise.all([
    supabase.from("quotations").select("id").in("status", ["recebida", "em_analise"]),
    supabase.from("budgets").select("id, status").in("status", ["fornecedor_pendente", "aguardando_aprovacao_financeira"]),
    supabase.from("expenses").select("id").in("status", ["aprovada", "parcialmente_paga"]),
  ]);
  const quotations = quotationsResult.data?.length ?? 0;
  const supplierPending = budgetsResult.data?.filter((budget) => budget.status === "fornecedor_pendente").length ?? 0;
  const approvalPending = budgetsResult.data?.filter((budget) => budget.status === "aguardando_aprovacao_financeira").length ?? 0;
  const expenses = expensesResult.data?.length ?? 0;
  const notifications: OperationalNotification[] = [];
  if (quotations) notifications.push({ id: "quotations", title: `${quotations} ${quotations === 1 ? "cotação aguarda" : "cotações aguardam"} decisão`, description: role === "visualizador" ? "Há propostas disponíveis para consulta." : "Compare as propostas e registre a decisão da comissão.", href: role === "visualizador" ? "/cotacoes" : "/comparar-cotacoes", tone: "warning" });
  if (supplierPending && ["admin", "financeiro"].includes(role)) notifications.push({ id: "supplier-pending", title: `${supplierPending} ${supplierPending === 1 ? "orçamento precisa" : "orçamentos precisam"} de destinatário`, description: "Defina um fornecedor cadastrado ou destinatário livre antes da aprovação financeira.", href: "/orcamentos", tone: "warning" });
  if (approvalPending && ["admin", "financeiro"].includes(role)) notifications.push({ id: "budget-pending", title: `${approvalPending} ${approvalPending === 1 ? "orçamento aguarda" : "orçamentos aguardam"} aprovação`, description: "A aprovação financeira cria a despesa correspondente.", href: "/orcamentos", tone: "warning" });
  if (expenses) notifications.push({ id: "expenses", title: `${expenses} ${expenses === 1 ? "despesa possui" : "despesas possuem"} saldo pendente`, description: role === "visualizador" || role === "aprovador" ? "Acompanhe a situação financeira das despesas." : "Registre pagamentos parciais ou integrais conforme necessário.", href: ["admin", "financeiro"].includes(role) ? "/pagamentos" : "/despesas", tone: "info" });
  return notifications;
}
