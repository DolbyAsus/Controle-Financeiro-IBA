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

As migrations ficam em `supabase/migrations`. O acesso ao banco é protegido
por Supabase Auth e Row Level Security; não use nem exponha uma chave de
serviço no navegador.
