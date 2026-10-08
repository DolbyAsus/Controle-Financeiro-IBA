# Status de implementação — Gestão Financeira de Projetos

Atualizado em 07/10/2026. Este arquivo é o checkpoint de execução do MVP.
Ao concluir uma etapa, registrar a evidência e iniciar a etapa sugerida na
sequência, salvo mudança de prioridade da Igreja Batista da Aliança.

## Concluído

- Fundação Next.js, TypeScript, Tailwind, shadcn/ui, Supabase, GitHub e Vercel.
- Esquema PostgreSQL, RLS, funções de transição e auditoria automática.
- Autenticação por Supabase, layout responsivo e navegação por perfil.
- Cadastro e listagem de projetos, etapas, categorias e fornecedores.
- Cotações, comparação humana, justificativa e geração de orçamento.
- Definição de destinatário, aprovação financeira, despesas originadas de
  orçamento ou lançamento manual e pagamentos parciais vinculados à despesa.
- Entradas, dashboard, relatório mensal visual e histórico de auditoria.
- Primeiro Administrador confirmado, com acesso ativo à produção.
- Produção publicada no domínio oficial da Vercel, integrada ao GitHub.
- Revisão de segurança aplicada: cadastro público bloqueado, perfis restritos,
  transições financeiras protegidas por funções/gatilhos e links limitados ao
  Google Drive via HTTPS.
- Filtros de projeto e competência no dashboard e relatório mensal, comparação
  filtrável de cotações e encerramento seguro da sessão.
- Central de notificações internas por perfil, sem integração ou envio externo.
- Isolamento multi-tenant reforçado: Administrador global opera somente na
  própria igreja, inclusive em projetos, fornecedores, perfis e auditoria.
- Fornecedores são criados/vinculados de forma atômica e cotações em análise
  são editadas por RPC autorizada, sem liberar `UPDATE` direto na Data API.
- Continuidade administrativa serializada no banco para igreja e projeto.
- Totais de dashboard/relatório calculados no PostgreSQL, sem truncamento pelo
  limite de 1.000 linhas, e paginação no banco nas listas operacionais e
  administrativas.
- Auditoria deixa de expor snapshots `old_value/new_value` e remove PII/links
  dos novos snapshots antes da persistência.
- Todas as funções `SECURITY DEFINER` da aplicação passam a usar
  `search_path` vazio, inclusive as funções legadas.
- Turnstile preparado, Data API em modo explícito, Node.js 22+, testes unitários,
  testes pgTAP e GitHub Actions adicionados.
- Runbook de implantação e preflight somente leitura adicionados para detectar
  inconsistências de tenant, vínculos e retenção antes do deploy.
- Docker/WSL operacionais e banco local validado do zero: 15 migrations e seed
  reproduzíveis, 36 testes pgTAP aprovados, lint sem erros e advisors sem
  achados `WARN/ERROR`.
- Agregação financeira exercitada com 40 mil despesas temporárias: os índices
  parciais foram usados e o filtro principal executou em aproximadamente 1 ms;
  toda a carga foi revertida ao final do teste.

## Próximas etapas priorizadas

| Ordem | Etapa | Critério de conclusão | Sugestão após concluir |
| --- | --- | --- | --- |
| 1 | Aplicar configuração externa | Ativar Turnstile e restringir Redirect URLs no Supabase hospedado. | Executar CI e matriz de perfis. |
| 2 | Validar migração e segurança | Pipeline `application` e `database` verde; matriz RLS/autorização aprovada. | Testar ponta a ponta. |
| 3 | Testes ponta a ponta e responsividade | Validar fluxos completos em desktop, tablet e celular. | Homologar com a comissão. |
| 4 | Homologação com a comissão | Cadastrar dados reais controlados e obter aceite sobre telas, valores e regras. | Iniciar operação assistida. |
| 5 | Operação assistida | Acompanhar os primeiros lançamentos e registrar melhorias priorizadas. | Planejar evolução seguinte. |

## Dependências e riscos

- Dados financeiros reais devem ser inseridos somente após a homologação da comissão.
- Não usar chave secreta do Supabase no frontend ou em arquivos versionados.
- Convites e criação de usuários devem continuar centralizados no Supabase; o
  cadastro público permanece desativado.
- A migração `20261007194900_harden_tenant_finance_and_audit.sql` foi validada
  localmente, mas ainda precisa passar na CI e no preflight somente leitura
  antes de ser aplicada ao projeto hospedado.
- MFA exige fluxo de cadastro, desafio e recuperação na interface; a opção não
  deve ser ligada isoladamente no Dashboard.
- O prazo de retenção dos registros de auditoria depende de decisão da comissão
  e do responsável legal; até lá, os snapshots ficam minimizados e inacessíveis
  pela Data API, mas não serão apagados automaticamente.

## Próxima sugestão ativa

**Marco local concluído. Próxima ação — CI e configuração hospedada.**
Executar a CI, rodar o preflight no projeto hospedado e então ativar
Turnstile/restringir Redirect URLs. Somente depois iniciar a matriz manual com
um usuário de cada papel.
