# Status de implementação — Gestão Financeira de Projetos

Atualizado em 05/10/2026. Este arquivo é o checkpoint de execução do MVP.
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

## Próximas etapas priorizadas

| Ordem | Etapa | Critério de conclusão | Sugestão após concluir |
| --- | --- | --- | --- |
| 1 | Testes de segurança e perfis | Executar a matriz de RLS, autorização, links externos e transições concorrentes com usuários reais. | Corrigir achados críticos. |
| 2 | Testes ponta a ponta e responsividade | Validar os fluxos completos de saída e entrada em desktop, tablet e celular. | Homologar com a comissão. |
| 3 | Homologação com a comissão | Cadastrar dados reais controlados do Colégio Batista e obter aceite sobre telas, valores e regras. | Iniciar operação assistida. |
| 4 | Operação assistida | Acompanhar os primeiros lançamentos e registrar melhorias priorizadas. | Planejar evolução seguinte. |

## Dependências e riscos

- Dados financeiros reais devem ser inseridos somente após a homologação da comissão.
- Não usar chave secreta do Supabase no frontend ou em arquivos versionados.
- Convites e criação de usuários devem continuar centralizados no Supabase; o
  cadastro público permanece desativado.

## Próxima sugestão ativa

**Implementação funcional concluída. Etapa 1 — testes de segurança e perfis.**
Validar acesso por papel, bloqueio de cadastro público, transições de cotação,
despesas manuais, pagamentos parciais e links do Google Drive antes de
cadastrar dados reais.
