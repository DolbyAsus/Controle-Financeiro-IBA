# Plano de evolução e homologação

Este plano orienta a entrega do sistema de Gestão Financeira de Projetos da
Igreja Batista da Aliança, inicialmente para o Colégio Batista. O sistema
continua sendo de uma única igreja, com múltiplos projetos independentes.

## Estado atual — concluído

- Fundação: Next.js, TypeScript, Tailwind, shadcn/ui, Supabase/PostgreSQL,
  GitHub e Vercel.
- Perfis e RLS: Administrador, Financeiro, Aprovador e Visualizador.
- Cadastros: projetos, etapas, categorias e fornecedores.
- Fluxo de saída: cotação, comparação humana, justificativa, orçamento,
  aprovação financeira, despesa e pagamentos parciais; despesas também podem
  ser registradas manualmente, sempre com destinatário definido.
- Fluxo de entrada: entrada direta, dashboard e relatório mensal.
- Histórico/auditoria, notificações internas e responsividade base.
- Segurança: RLS, transições protegidas, limites de entrada, CSP, cabeçalhos
  de segurança, links Drive validados, cadastro público bloqueado e política
  de senha reforçada.

## Etapa 1 — fechamento de segurança

Objetivo: concluir as duas configurações externas pendentes antes de inserir
dados financeiros reais.

1. Remover URLs curinga de redirecionamento do Supabase e permitir apenas os
   callbacks de produção e localhost.
2. Escolher Cloudflare Turnstile ou hCaptcha e configurar CAPTCHA no Supabase.
   O Auth nativo do Supabase não oferece Google reCAPTCHA.
3. Manter a chave de serviço exclusivamente no Supabase/Vercel, nunca no
   navegador ou no Git.

Critério de saída: auditoria do Supabase sem erros, URLs de retorno estritas e
CAPTCHA ativo.

## Etapa 2 — testes funcionais com usuários reais

Objetivo: validar permissões e regras com contas de cada papel.

1. Administrador cria projeto, etapa, categoria, fornecedor e usuário.
2. Aprovador registra e compara cotações, sem recomendação automática.
3. Aprovar uma cotação com justificativa e confirmar a geração do orçamento.
4. Financeiro/Admin aprova orçamento e cria despesa, ou registra uma despesa
   manual com projeto, etapa, categoria e destinatário.
5. Registrar pagamento parcial, pagamento final e conferir os saldos e o
   destinatário exibido em cada parcela.
6. Registrar entrada e conferir dashboard e relatório mensal.
7. Testar bloqueios: Visualizador não altera dados; Aprovador não aprova
   despesa; orçamento sem fornecedor/destinatário não vira despesa.
8. Testar links do Drive, datas inválidas, valores negativos, campos longos e
   encerramento de sessão.

Critério de saída: todos os fluxos aprovados pela comissão, sem divergência de
saldo ou acesso indevido.

## Etapa 3 — homologação do Colégio Batista

Objetivo: substituir a planilha sem perder rastreabilidade.

1. Cadastrar dados de referência controlados.
2. Conferir totais contra a planilha atual.
3. Definir responsáveis pelo cadastro, aprovação e conferência mensal.
4. Registrar aceite da comissão sobre telas, regras e relatórios.
5. Definir a data de corte para uso oficial do sistema.

Critério de saída: comissão aprova os dados conferidos e inicia uso oficial.

## Etapa 4 — operação assistida

Objetivo: acompanhar os primeiros ciclos sem ampliar o escopo.

1. Acompanhar os primeiros lançamentos e aprovações.
2. Revisar o relatório mensal com Financeiro/Admin.
3. Registrar dúvidas, erros e melhorias em backlog priorizado.
4. Revisar usuários ativos e papéis a cada trimestre.

Critério de saída: dois fechamentos mensais sem divergência crítica.

## Etapa 5 — evoluções após estabilização

Prioridade sugerida:

1. Paginação e busca textual para históricos extensos.
2. Indicadores adicionais por etapa e categoria, mantendo a decisão humana
   sobre cotações.
3. Modelos de justificativa e checklist de aprovação.
4. Lembretes internos de pendências e vencimentos, sem integração externa.
5. Importação assistida da planilha legada, com validação e trilha de auditoria.
6. Avaliar MFA para perfis Administrador e Financeiro.
7. Avaliar backup/recuperação, integrações, retenções/descontos/acréscimos,
   exportação e multi-igreja somente quando houver decisão formal.

## Direção visual

Enquanto não houver manual de marca ou logo oficial fornecido, a interface usa
azul profundo, branco e dourado discreto como paleta institucional: azul para
navegação e ações principais, dourado apenas como acento/foco e cores
semânticas para sucesso, atenção e erro. Todos os usos devem preservar
contraste e legibilidade em desktop, tablet e celular.

## Fora do escopo atual

- PDF ou exportações.
- Gestão completa de dízimos/ofertas.
- Integrações externas.
- Recomendação automática de cotações.
- Upload interno de arquivos.
- Multi-igreja.
