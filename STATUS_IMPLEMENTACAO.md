# Status de implementação — Gestão Financeira de Projetos

Atualizado em 08/10/2026. Este arquivo é o checkpoint de execução do MVP.
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
- Contas, sessões e dados operacionais de teste removidos antes da homologação;
  o ambiente hospedado está intencionalmente sem usuário administrador.
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
- Docker/WSL operacionais e banco local validado do zero: 16 migrations
  reproduzíveis, 42 testes pgTAP aprovados, lint sem erros e advisors sem
  achados `WARN/ERROR`.
- Agregação financeira exercitada com 40 mil despesas temporárias: os índices
  parciais foram usados e o filtro principal executou em aproximadamente 1 ms;
  toda a carga foi revertida ao final do teste.
- Projeto hospedado reconstruído em 08/10/2026 a partir das 16 migrations,
  sem seed adicional; histórico local/remoto alinhado e `db push --dry-run`
  sem pendências.
- Autenticação hospedada alinhada: cadastro público desativado, Turnstile
  preservado, confirmação de e-mail e TOTP habilitados, OTP de 8 dígitos,
  senha mínima de 10 caracteres com letras maiúsculas/minúsculas, número e
  símbolo, e limite de login/cadastro reduzido para 10 por janela.
- PR de segurança integrada à `main` no commit `3a83cd6` e implantação de
  produção confirmada pela Vercel.
- Backup local criptografado validado e tarefa semanal configurada para sexta,
  às 20h no horário de São Paulo, sem execução atrasada quando o PC estiver
  desligado.

## Próximas etapas priorizadas

| Ordem | Etapa | Critério de conclusão | Sugestão após concluir |
| --- | --- | --- | --- |
| 1 | Criar o primeiro Administrador | Criar conta pelo fluxo administrativo do Supabase e promover o perfil inicial de forma controlada. | Criar contas temporárias por papel. |
| 2 | Matriz manual de perfis | Confirmar isolamento com contas separadas de Administrador, Financeiro, Comissão, Visualizador e Administrador de projeto. | Testar ponta a ponta. |
| 3 | Testes ponta a ponta e responsividade | Validar fluxos completos em desktop, tablet e celular e excluir novamente as contas/dados temporários. | Homologar com a comissão. |
| 4 | Homologação com a comissão | Cadastrar dados reais controlados e obter aceite sobre telas, valores e regras. | Iniciar operação assistida. |
| 5 | Operação assistida | Acompanhar os primeiros lançamentos e registrar melhorias priorizadas. | Planejar evolução seguinte. |

## Dependências e riscos

- Dados financeiros reais devem ser inseridos somente após a homologação da comissão.
- Não usar chave secreta do Supabase no frontend ou em arquivos versionados.
- Convites e criação de usuários devem continuar centralizados no Supabase; o
  cadastro público permanece desativado.
- O ambiente está sem conta administrativa. Antes do uso funcional, criar o
  primeiro Administrador e executar a matriz manual de perfis; até lá, o login
  não concede acesso operacional a ninguém.
- TOTP está disponível no Supabase, mas ainda precisa ter seu fluxo de
  cadastramento, desafio e recuperação homologado na interface antes de ser
  exigido como segundo fator obrigatório.
- O certificado de recuperação EFS do backup local deve ser exportado para
  mídia externa offline; sem ele, uma reinstalação do Windows pode impedir a
  leitura dos arquivos criptografados.
- O prazo de retenção dos registros de auditoria depende de decisão da comissão
  e do responsável legal; até lá, os snapshots ficam minimizados e inacessíveis
  pela Data API, mas não serão apagados automaticamente.

## Próxima sugestão ativa

**Banco e aplicação promovidos. Próxima ação — bootstrap administrativo.**
Criar o primeiro Administrador de forma controlada e iniciar a matriz manual
com uma conta separada para cada papel antes de inserir dados reais.
