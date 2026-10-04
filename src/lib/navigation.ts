import {
  BarChart3, Building2, ClipboardList, CreditCard, FileBarChart,
  FolderKanban, Landmark, ReceiptText, Tags, Users, WalletCards,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = { href: string; label: string; icon: LucideIcon };

export const primaryNavigation: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/projetos", label: "Projetos", icon: FolderKanban },
  { href: "/etapas", label: "Etapas", icon: ClipboardList },
  { href: "/categorias", label: "Categorias", icon: Tags },
  { href: "/fornecedores", label: "Fornecedores", icon: Building2 },
  { href: "/cotacoes", label: "Cotações", icon: ReceiptText },
  { href: "/comparar-cotacoes", label: "Comparar cotações", icon: WalletCards },
  { href: "/orcamentos", label: "Orçamentos", icon: Landmark },
  { href: "/despesas", label: "Despesas", icon: CreditCard },
  { href: "/pagamentos", label: "Pagamentos", icon: CreditCard },
  { href: "/entradas", label: "Entradas", icon: WalletCards },
  { href: "/relatorio-mensal", label: "Relatório mensal", icon: FileBarChart },
  { href: "/usuarios", label: "Usuários", icon: Users },
];
