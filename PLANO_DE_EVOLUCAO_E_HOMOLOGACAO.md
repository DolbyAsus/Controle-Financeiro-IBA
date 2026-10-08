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

1. **Concluído no código:** isolamento de igreja em todas as funções/policies
   administrativas e financeiras.
2. **Concluído no código:** criação e vínculo de fornecedor atômicos, edição
   autorizada de cotação e proteção contra remoção concorrente do último
   Administrador.
3. **Concluído no código:** agregações financeiras no banco, paginação de
   históricos e cadastros críticos, índices de FKs e minimização da auditoria.
4. **Concluído no código:** Turnstile configurado no Auth local, exposição
   automática de novas tabelas desativada e Node.js 22 como versão mínima.
5. **Concluído no código:** testes unitários, pgTAP e pipeline de qualidade e
   segurança no GitHub Actions.
6. **Concluído no código:** funções privilegiadas com `search_path` vazio,
   preflight somente leitura e runbook de implantação/reversão.
7. **Dependência externa:** remover URLs curinga de redirecionamento no projeto
   hospedado e permitir apenas produção e localhost.
8. **Dependência externa:** cadastrar a chave secreta do Turnstile e ativar a
   proteção CAPTCHA no projeto hospedado do Supabase.
9. Manter chaves secretas exclusivamente no Supabase/Vercel, nunca no
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

1. Busca textual e paginação por cursor para catálogos de escala muito alta;
   as listas críticas já usam paginação no banco.
2. Indicadores adicionais por etapa e categoria, mantendo a decisão humana
   sobre cotações.
3. Modelos de justificativa e checklist de aprovação.
4. Lembretes internos de pendências e vencimentos, sem integração externa.
5. Importação assistida da planilha legada, com validação e trilha de auditoria.
6. Implementar a experiência de cadastro e desafio MFA para Administrador e
   Financeiro após decisão da comissão; não habilitar MFA no Auth sem o fluxo
   completo na interface.
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

## Registro de riscos ativo

| Risco | Probabilidade | Impacto | Sinal de alerta | Mitigação | Dono |
| --- | --- | --- | --- | --- | --- |
| CAPTCHA configurado no repositório, mas não no Supabase hospedado | Média | Alto | Login aceita requisição sem token CAPTCHA | Aplicar secret/provider no Dashboard antes de dados reais | Administrador da plataforma |
| URLs de retorno amplas no Auth hospedado | Média | Alto | Redirect URL com curinga | Restringir allowlist a produção e localhost | Administrador da plataforma |
| Migração validada localmente, mas ainda não aplicada ao projeto hospedado | Baixa | Alto | Divergência encontrada no preflight ou na CI | Executar preflight somente leitura, exigir CI verde e usar janela coordenada de deploy | Desenvolvimento |
| Alertas do `braces` na cadeia dev do ESLint sem versão corrigida | Média | Baixo | `npm audit` completo acusa 5 altas; produção acusa 0 | Não processar padrões não confiáveis no lint e atualizar quando houver release | Desenvolvimento |
| Retenção da auditoria ainda sem prazo formal | Média | Médio | Crescimento contínuo ou retenção além da necessidade | Comissão e responsável legal definem prazo; só então criar descarte automatizado e testado | Comissão / responsável legal |
