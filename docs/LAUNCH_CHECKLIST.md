# FactuurSnel — Checklist de lançamento

Última atualização: 2026-10-22

Este checklist é atualizado contra o código e deploy reais. Um item só recebe `OK` quando foi verificado; build isolado não é suficiente para aprovar um fluxo funcional.

## FUNCIONANDO

- [x] Repositório oficial `gustavoort/factuur-snel-helper` acessível e com deploy Git → Vercel ativo.
- [x] Landing pública responde HTTP 200 em produção.
- [x] Build Vercel continua `READY` após substituir a configuração Vite/Lovable por configuração nativa TanStack/Vite/Nitro.
- [x] Build Vercel continua `READY` após remover `@lovable.dev/vite-tanstack-config` do `package.json`.
- [x] Rotas públicas existentes: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/privacy`, `/terms`.
- [x] Estrutura de rotas privadas protegida por `ProtectedRoute`.
- [x] Cliente HTTP same-origin `/api` com cookies e refresh automático de sessão.
- [x] Módulos frontend existentes para clientes, orçamentos, faturas, empresa, billing e dashboard.
- [x] Traduções NL/EN/PT presentes no projeto.
- [x] Responsividade básica do shell interno: sidebar desktop + menu móvel.
- [x] Código fonte do backend atual consolidado em `backend/` dentro do repositório oficial.
- [x] Requisitos Python, Dockerfile e patch de produção do backend consolidados no repositório oficial.
- [x] Proxy `/api` em produção validado: endpoint autenticado devolve 401 quando não há sessão e endpoint público de planos devolve 200.

## CORRIGIDO

- [x] Dependência de execução do `vite.config.ts` em `@lovable.dev/vite-tanstack-config` removida.
- [x] Dependência não utilizada `@lovable.dev/vite-tanstack-config` removida do `package.json`.
- [x] Reporting de erros específico do Lovable removido do root da aplicação.
- [x] Arquivo de runtime `src/lib/lovable-error-reporting.ts` removido.
- [x] Metadados e planos `.lovable/` removidos.
- [x] Instruções `AGENTS.md` específicas do Lovable removidas.
- [x] Exceções Lovable do `bunfig.toml` removidas.
- [x] README antigo orientado ao Lovable substituído por documentação do projeto.
- [x] Landing substituída por versão que anuncia apenas funcionalidades comprovadas no produto atual.
- [x] Placeholders públicos `[NOME DO PRODUTO]` e `contact@example.com` removidos da landing.
- [x] Preços da landing alinhados ao backend atual: Free, Pro e Business.
- [x] Rotas reais de privacidade e condições adicionadas.
- [x] `robots.txt` ajustado para evitar indexação das principais rotas privadas.
- [x] Metadata da home sem placeholder de produto.

## ALTERADO

- [x] `vite.config.ts` agora usa configuração nativa Vite + TanStack Start + Nitro + React + Tailwind + tsconfig paths.
- [x] Documentação técnica real criada em `docs/CURRENT_STATE.md`.
- [x] Repositório helper definido como única fonte oficial para novas alterações.
- [x] Backend legado necessário foi copiado para `backend/` no repositório oficial sem alterar ainda o serviço Railway em produção.
- [x] Landing reposicionada para clientes, ofertas, faturas, PDF/e-mail/WhatsApp e pagamentos, removendo promessas de módulos ainda inexistentes.

## REMOVIDO

- [x] `.lovable/project.json`.
- [x] Planos históricos dentro de `.lovable/plan/`.
- [x] `AGENTS.md` com sincronização Lovable.
- [x] `src/lib/lovable-error-reporting.ts`.
- [x] chamada de `reportLovableError` no root.
- [x] Claims públicos de Werkregistratie, Meerwerk/Money Recovery e Job Memory como se já fossem funcionalidades disponíveis.

## PENDENTE — BLOQUEADORES DE LANÇAMENTO

- [ ] Regenerar/sincronizar `bun.lock` numa instalação limpa para retirar referências antigas do pacote Lovable.
- [ ] Validar `backend/server.py` + `backend/patch_server.py` em build/runtime isolado. Foi adicionado `backend/railway.json` para forçar o Dockerfile, mas a compilação e o arranque ainda não foram validados.
- [x] Fonte do serviço Railway alterada para `gustavoort/factuur-snel-helper`, branch `main`, root `/backend` (configuração verificada; implantação do novo código ainda não comprovada).
- [ ] Confirmar novo build e deploy Railway a partir do commit de `factuur-snel-helper`. O deploy FAILED mais recente consultado foi construído do repositório legado, portanto não valida o backend consolidado.
- [ ] Auditar e testar cadastro, login, logout, refresh de sessão e recuperação/redefinição de palavra-passe contra o backend real.
- [ ] Testar CRUD real de clientes.
- [ ] Testar CRUD, PDF, email, WhatsApp e conversão de orçamentos.
- [ ] Testar CRUD, PDF, email, WhatsApp, pagamento e marcação de faturas.
- [ ] Testar billing/checkout e retorno de pagamento.
- [ ] Confirmar contratos e autorização do backend para todos os endpoints usados pelo frontend.
- [ ] Executar instalação limpa, lint e build fora do ambiente Lovable.
- [ ] Testar fluxos reais em desktop e mobile, incluindo URLs diretas, refresh, sessão expirada, API offline, erros 4xx/5xx e estados vazios.
- [ ] Revisar acessibilidade básica: teclado, labels, foco, contraste, headings e diálogos.
- [ ] Revisar dependências e vulnerabilidades.
- [ ] Finalizar sitemap/canonical/Open Graph com a URL oficial quando o domínio final for definido.
- [ ] Revisar juridicamente privacidade/termos antes do lançamento comercial definitivo.
- [ ] Configurar domínio somente após todos os itens de código estarem aprovados.
- [ ] Configurar Resend/domínio de envio/SPF/DKIM e realizar teste real somente na etapa final.

## Testes de produção já executados

| Teste | Resultado |
| --- | --- |
| Deploy após config Vite nativa | PASS — Vercel READY |
| Deploy após remoção da dependência Lovable do `package.json` | PASS — Vercel READY |
| Deploy da nova landing | PASS — Vercel READY |
| `GET /` | PASS — HTTP 200 |
| `GET /login` | PASS — HTTP 200 |
| `GET /api/auth/me` sem sessão | PASS — HTTP 401 esperado |
| `GET /api/subscription/plans` | PASS — HTTP 200 |
| Verificação HTML da nova landing | PASS PARCIAL — conteúdo funcional alinhado; metadata foi corrigida em commit posterior |
| Backend consolidado no repositório oficial | PASS de versionamento — runtime no novo repositório ainda não validado |

## Infraestrutura confirmada

- Vercel projeto `factuur-snel-helper` está ligado a `gustavoort/factuur-snel-helper`, branch `main`.
- O serviço Railway de produção está configurado com `gustavoort/factuur-snel-helper`, branch `main`, root `/backend`, preservando domínio e variáveis existentes.
- O serviço Railway ainda reporta builder RAILPACK na configuração consultada. O repositório agora inclui `backend/railway.json` com builder DOCKERFILE; confirmar nos logs do próximo build se essa configuração foi aplicada.
- O código do backend está no repositório oficial. A nova origem está configurada, mas é necessário comprovar o primeiro deploy do código novo e seus fluxos reais.

## Regra de conclusão

O projeto não será marcado como pronto enquanto houver qualquer bloqueador acima sem validação ou enquanto a aplicação depender operacionalmente do repositório legado.