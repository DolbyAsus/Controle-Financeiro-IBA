import { Building2 } from "lucide-react";

import { createSupplier, updateSupplier } from "@/lib/actions/base-registers";
import { RegisterPageShell } from "@/components/modules/register-page-shell";
import { Pagination, paginate } from "@/components/modules/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ mensagem?: string; erro?: string; pagina?: string }>;
}) {
  const query = await searchParams;
  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const categories = supabase
    ? ((
        await supabase
          .from("categories")
          .select("id, name, projects(name)")
          .eq("status", "ativo")
          .order("name")
      ).data ?? [])
    : [];
  const suppliers = supabase
    ? ((
        await supabase
          .from("suppliers")
          .select(
            "id, name, person_type, document, main_contact, phone, email, status, notes, categories(name)",
          )
          .order("name")
      ).data ?? [])
    : [];
  const supplierPage = paginate(suppliers, query.pagina);
  return (
    <RegisterPageShell
      title="Fornecedores"
      description="Mantenha fornecedores, contatos e categoria principal para futuras cotações."
      icon={Building2}
      message={query.mensagem}
      error={query.erro}
      form={
        <form action={createSupplier} className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">
            Nome *
            <Input
              className="w-full"
              name="nome"
              required
              maxLength={160}
              placeholder="Ex.: Construtora Exemplo"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Tipo de pessoa
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="tipo_pessoa"
              defaultValue=""
            >
              <option value="">Não informado</option>
              <option value="pessoa_juridica">Pessoa jurídica</option>
              <option value="pessoa_fisica">Pessoa física</option>
              <option value="outro">Outro</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            CPF/CNPJ ou documento
            <Input className="w-full" name="documento" maxLength={40} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Contato principal
            <Input className="w-full" name="contato" maxLength={120} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Telefone
            <Input
              className="w-full"
              name="telefone"
              type="tel"
              maxLength={30}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            E-mail
            <Input
              className="w-full"
              name="email"
              type="email"
              maxLength={160}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Categoria principal
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="categoria_principal_id"
              defaultValue=""
            >
              <option value="">Não informada</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.projects?.[0]?.name
                    ? ` · ${category.projects[0].name}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Status *
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              name="status"
              defaultValue="ativo"
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Endereço
            <textarea
              className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm"
              name="endereco"
              maxLength={500}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Observações
            <textarea
              className="min-h-20 rounded-lg border border-input bg-transparent p-3 text-sm"
              name="observacoes"
              maxLength={2000}
            />
          </label>
          <div className="md:col-span-2">
            <Button type="submit">Salvar fornecedor</Button>
          </div>
        </form>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Fornecedores cadastrados</CardTitle>
          <CardDescription>
            {suppliers.length} fornecedores disponíveis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Nenhum fornecedor cadastrado ainda. Uma cotação também poderá ser
              criada sem fornecedor.
            </p>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {supplierPage.items.map((supplier) => (
                  <article key={supplier.id} className="rounded-lg border p-3">
                    <div className="flex justify-between gap-2">
                      <strong>{supplier.name}</strong>
                      <Badge variant="secondary">{supplier.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {supplier.main_contact ||
                        supplier.email ||
                        supplier.phone ||
                        "Sem contato informado"}
                    </p>
                  </article>
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierPage.items.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">
                          {supplier.name}
                        </TableCell>
                        <TableCell>
                          {supplier.main_contact || supplier.email || "—"}
                        </TableCell>
                        <TableCell>{supplier.phone || "—"}</TableCell>
                        <TableCell>
                          {supplier.categories?.[0]?.name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{supplier.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={supplierPage.page}
                totalPages={supplierPage.totalPages}
                label="fornecedores"
              />
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Editar, inativar ou bloquear fornecedor</CardTitle>
          <CardDescription>
            O histórico de cotações e despesas permanece preservado quando um
            fornecedor deixa de estar disponível.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {supplierPage.items.map((supplier) => (
            <details key={supplier.id} className="rounded-lg border p-3">
              <summary className="cursor-pointer font-medium">
                {supplier.name}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  · {supplier.status}
                </span>
              </summary>
              <form
                action={updateSupplier}
                className="mt-3 grid gap-3 md:grid-cols-2"
              >
                <input name="fornecedor_id" type="hidden" value={supplier.id} />
                <label className="grid gap-1 text-sm">
                  Nome
                  <Input name="nome" required defaultValue={supplier.name} />
                </label>
                <label className="grid gap-1 text-sm">
                  Contato
                  <Input
                    name="contato"
                    defaultValue={supplier.main_contact || ""}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Telefone
                  <Input
                    name="telefone"
                    type="tel"
                    defaultValue={supplier.phone || ""}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  E-mail
                  <Input
                    name="email"
                    type="email"
                    defaultValue={supplier.email || ""}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Status
                  <select
                    className="h-9 rounded-lg border border-input bg-background px-3"
                    name="status"
                    defaultValue={supplier.status}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="bloqueado">Bloqueado</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  Observações
                  <textarea
                    className="min-h-16 rounded-lg border border-input bg-transparent p-2"
                    name="observacoes"
                    defaultValue={supplier.notes || ""}
                  />
                </label>
                <div className="md:col-span-2">
                  <Button size="sm" type="submit">
                    Salvar alterações
                  </Button>
                </div>
              </form>
            </details>
          ))}
        </CardContent>
      </Card>
    </RegisterPageShell>
  );
}
