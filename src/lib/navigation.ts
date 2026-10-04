import {
  BarChart3, Building2, ClipboardList, CreditCard, FileBarChart, History,
  FolderKanban, Landmark, ReceiptText, Tags, Users, WalletCards,
  type LucideIcon,
} from "lucide-react";

export type UserRole = "admin" | "financeiro" | "aprovador" | "visualizador";
export type NavigationItem = { href: string; label: string; icon: LucideIcon; roles?: UserRole[] };

export const primaryNavigation: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/projetos", label: "Projetos", icon: FolderKanban, roles: ["admin"] },
  { href: "/etapas", label: "Etapas", icon: ClipboardList, roles: ["admin", "financeiro"] },
  { href: "/categorias", label: "Categorias", icon: Tags, roles: ["admin", "financeiro"] },
  { href: "/fornecedores", label: "Fornecedores", icon: Building2, roles: ["admin", "financeiro"] },
  { href: "/cotacoes", label: "Cotações", icon: ReceiptText },
  { href: "/comparar-cotacoes", label: "Comparar cotações", icon: WalletCards },
  { href: "/orcamentos", label: "Orçamentos", icon: Landmark },
  { href: "/despesas", label: "Despesas", icon: CreditCard },
  { href: "/pagamentos", label: "Pagamentos", icon: CreditCard },
  { href: "/entradas", label: "Entradas", icon: WalletCards },
  { href: "/relatorio-mensal", label: "Relatório mensal", icon: FileBarChart },
  { href: "/historico", label: "Histórico", icon: History, roles: ["admin", "financeiro"] },
  { href: "/usuarios", label: "Usuários", icon: Users, roles: ["admin"] },
];
