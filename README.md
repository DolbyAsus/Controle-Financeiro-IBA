# Gestão Financeira de Projetos da Igreja

Aplicação da Igreja Batista da Aliança para controlar cotações, orçamentos,
despesas, pagamentos, entradas e relatórios de projetos — inicialmente, o
Colégio Batista.

## Desenvolvimento

```bash
npm install
copy .env.example .env.local
npm run dev
```

Use Node.js 22 ou superior. Antes de enviar alterações:

```bash
npm run lint
npm run typecheck
npm test
npm audit --omit=dev --audit-level=high
```

Os testes de banco exigem Docker:

```powershell
$env:SUPABASE_AUTH_CAPTCHA_SECRET="1x0000000000000000000000000000000AA"
npx --yes supabase@2.120.0 start
npx --yes supabase@2.120.0 db reset --local
npm run test:db
npx --yes supabase@2.120.0 db lint --local --level error --fail-on error
npx --yes supabase@2.120.0 db advisors --local --type all --level warn --fail-on warn
```

As migrations ficam em `supabase/migrations`. O acesso ao banco é protegido
por Supabase Auth e Row Level Security; não use nem exponha uma chave de
serviço no navegador.

Antes de aplicar a migração de segurança no projeto hospedado, siga
`MIGRATION_RUNBOOK.md` e execute `supabase/migration_preflight.sql`. O
preflight é somente leitura e não deve ser confundido com uma migration.

O Turnstile usa `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no navegador e
`SUPABASE_AUTH_CAPTCHA_SECRET` apenas no Auth do Supabase. Em produção, ative o
provider no Dashboard e mantenha a secret fora do Git. Restrinja também as
Redirect URLs do Auth aos endereços exatos de produção e desenvolvimento.
