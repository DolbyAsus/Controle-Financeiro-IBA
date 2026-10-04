# Status de implementação — Gestão Financeira de Projetos

Atualizado em 04/10/2026. Este arquivo é o checkpoint de execução do MVP.
Ao concluir uma etapa, registrar a evidência e iniciar a etapa sugerida na
sequência, salvo mudança de prioridade da Igreja Batista da Aliança.

## Concluído

- Fundação Next.js, TypeScript, Tailwind, shadcn/ui, Supabase, GitHub e Vercel.
- Esquema PostgreSQL, RLS, funções de transição e auditoria automática.
- Autenticação por Supabase, layout responsivo e navegação por perfil.
- Cadastro e listagem de projetos, etapas, categorias e fornecedores.
- Cotações, comparação humana, justificativa e geração de orçamento.
- Definição de destinatário, aprovação financeira, despesas e pagamentos parciais.
- Entradas, dashboard, relatório mensal visual e histórico de auditoria.
- Convite do primeiro Administrador enviado para `arthur.feerreira@outlook.com`.

## Próximas etapas priorizadas

| Ordem | Etapa | Critério de conclusão | Sugestão após concluir |
| --- | --- | --- | --- |
| 1 | Validar o primeiro acesso | Administrador aceita o convite, define senha, entra no preview e visualiza a navegação de Admin. | Iniciar a gestão de usuários. |
| 2 | Gestão de usuários | Admin consegue consultar perfis, alterar função/status e a ação gera histórico. O convite continua sendo feito no Supabase no MVP. | Iniciar edição e encerramento dos cadastros-base. |
| 3 | Completar ciclos operacionais | Permitir editar/inativar projetos, etapas, categorias e fornecedores; registrar cotação não selecionada/cancelada e cancelar despesa com justificativa. | Executar testes ponta a ponta. |
| 4 | Testes ponta a ponta e responsividade | Validar os fluxos completos de saída e entrada em desktop, tablet e celular, incluindo RLS e perfis. | Corrigir achados e preparar homologação. |
| 5 | Homologação com a comissão | Cadastrar dados reais controlados do Colégio Batista e obter aceite sobre telas, valores e regras. | Preparar produção. |
| 6 | Produção | Variáveis públicas configuradas na Vercel para produção, branch aprovada e deploy autorizado pela Igreja. | Iniciar operação assistida. |

## Dependências e riscos

- O convite do Administrador precisa ser aceito antes do primeiro teste autenticado.
- A aprovação para produção continua pendente; o ambiente publicado atualmente é Preview.
- Dados financeiros reais devem ser inseridos somente após a homologação da comissão.
- Não usar chave secreta do Supabase no frontend ou em arquivos versionados.

## Próxima sugestão ativa

**Etapa 1 — validar o primeiro acesso.** Assim que o convite for aceito, testar
login, perfil `admin`, visibilidade das telas e criação de um registro de teste.
