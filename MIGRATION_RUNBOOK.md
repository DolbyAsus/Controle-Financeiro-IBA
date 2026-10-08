# Runbook da migração de segurança

Migrações-alvo:

- `supabase/migrations/20261007194900_harden_tenant_finance_and_audit.sql`;
- `supabase/migrations/20261008060522_reject_quotations_on_supplier_deactivation.sql`.

## 1. Validação local após reiniciar o Windows

1. Entrar no Windows e abrir o Docker Desktop. No primeiro uso, aceitar os
   termos apresentados pelo aplicativo.
2. Aguardar o engine responder a `docker info`.
3. No PowerShell, na raiz do projeto, definir apenas para a sessão uma chave
   local de teste e executar:

   ```powershell
   $env:SUPABASE_AUTH_CAPTCHA_SECRET = "local-test-secret"
   npx --yes supabase@2.120.0 start
   npx --yes supabase@2.120.0 db reset --local
   npm run test:db
   npx --yes supabase@2.120.0 db lint --local --level error --fail-on error
   npx --yes supabase@2.120.0 db advisors --local --type all --level warn --fail-on warn
   ```

4. Exigir o reset completo, os 36 testes pgTAP e o lint de banco sem erro.
5. Executar também `npm run lint`, `npm run typecheck`, `npm test` e
   `npm run build` antes de promover o código.

## 2. Preflight no projeto hospedado

1. Criar um backup recuperável ou confirmar um snapshot recente do banco.
2. Comparar o histórico antes de qualquer push:

   ```powershell
   npx --yes supabase@2.120.0 migration list --linked
   npx --yes supabase@2.120.0 db push --linked --dry-run --include-all --skip-vault
   ```

   Se o remoto não registrar migrações antigas, não usar `--include-all` e não
   executar `migration repair` apenas porque os nomes estão ausentes. Primeiro
   comparar um banco-sombra construído até a última versão remota com o schema
   hospedado. Só reparar o histórico depois de confirmar que as diferenças são
   conhecidas, revisar funções e privilégios e garantir um backup recuperável.
3. Executar `supabase/migration_preflight.sql` no SQL Editor ou pelo CLI. O
   arquivo inicia uma transação `read only`, retorna um resumo anônimo como
   último resultado e termina com `rollback`:

   ```powershell
   npx --yes supabase@2.120.0 db query --linked `
     --file supabase/migration_preflight.sql --output json
   ```

4. Investigar todo resultado marcado como `esperado: 0`. Não corrigir vínculos
   inválidos escolhendo automaticamente outro projeto, categoria, etapa ou
   fornecedor: a relação correta é uma decisão de negócio.
5. Registrar a quantidade de snapshots históricos de auditoria com campos
   sensíveis. A migração bloqueia esses JSONs para `authenticated` e redige
   eventos futuros, mas uma limpeza retroativa deve ser aprovada como decisão
   de retenção porque elimina parte do histórico.

   Decisão registrada em 2026-10-08: preservar os snapshots históricos sob o
   novo bloqueio de coluna. Não executar limpeza retroativa nesta implantação.

6. Exigir lint e advisors remotos sem achados de segurança pendentes. A proteção
   contra senhas vazadas deve estar habilitada no Auth antes do go-live:

   ```powershell
   npx --yes supabase@2.120.0 db lint --linked --level error --fail-on error
   npx --yes supabase@2.120.0 db advisors --linked `
     --type all --level warn --fail-on warn
   ```

## 3. Implantação coordenada

A migração revoga escrita direta em fornecedores, vínculos de fornecedores e
cotações. A versão anterior da aplicação fica parcialmente incompatível assim
que esses privilégios forem removidos. Portanto:

1. Reservar uma janela curta sem lançamentos financeiros concorrentes.
2. Aplicar a migração no banco.
3. Publicar imediatamente a versão da aplicação que usa as novas RPCs.
4. Não executar `db reset` nem restaurar seed no projeto hospedado.
5. Configurar no Supabase hospedado o Turnstile, as Redirect URLs exatas e a
   política explícita da Data API; `supabase/config.toml` governa o ambiente
   local e não substitui essa configuração remota.

## 4. Smoke test pós-implantação

Validar com contas separadas, sem reutilizar a mesma sessão:

- administrador global da igreja A não enxerga dados da igreja B;
- administrador/financeiro de um projeto não altera outro projeto;
- visualizador não grava fornecedores, cotações ou finanças;
- criação e edição de fornecedor mantêm o vínculo com o projeto;
- ao desativar ou bloquear fornecedor, a interface pede confirmação e todas as
  cotações em análise desse fornecedor são rejeitadas na mesma transação, com
  justificativa, responsável e horário;
- edição de cotação aceita apenas etapa, categoria e fornecedor ativos;
- pagamentos parciais recalculam saldo e status da despesa;
- dashboard e relatório mensal conciliam com consultas SQL de controle;
- histórico mostra somente metadados, sem `old_value` ou `new_value`.

## 5. Reversão

Não há `down migration` automática: a mudança combina políticas RLS, grants,
funções e gatilhos. Se surgir uma falha antes de haver novos lançamentos, usar o
snapshot criado no preflight. Se já houver novos lançamentos, preservar os
dados e aplicar uma correção adiante; não restaurar o banco por cima deles.
