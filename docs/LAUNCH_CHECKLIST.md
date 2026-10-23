# FactuurSnel — Checklist de lançamento

Última atualização: 2026-10-23

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
- [x] Railway: deployment `SUCCESS` do repositório oficial `gustavoort/factuur-snel-helper`, branch `main`, commit `7163f5c`; logs confirmam execução de `python patch_server.py` no Dockerfile.
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

- [ ] Versionar um lockfile de dependências consistente. O `bun.lock` antigo foi removido no PR de segurança para não reinstalar a versão vulnerável; o preview atual constrói com `npm install`, mas ainda falta gerar e commitar um `package-lock.json` validado.
- [x] Build/runtime do backend confirmado no Railway: deployment `SUCCESS`; logs mostram as etapas do Dockerfile, instalação de requisitos e execução de `python patch_server.py`. Os fluxos funcionais ainda requerem testes separados.
- [x] Fonte e implantação do serviço Railway confirmadas: `gustavoort/factuur-snel-helper`, branch `main`, root `/backend`; deployment `SUCCESS` no commit `7163f5c`.
- [x] Confirmar novo build e deploy Railway a partir do repositório correto: concluído no commit `7163f5c`.
- [x] Resolver o bloqueio de segurança do Vercel: PR #1 foi integrado no commit `36c50ce`; `@tanstack/react-start` está fixado em `1.168.61` (versão corrigida para CVE-2026-102989) e o deployment de produção ficou `READY`.
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
- [ ] Configurar `RESEND_API_KEY` e `EMAIL_FROM` no Railway (não aparecem entre as variáveis atuais); sem `RESEND_API_KEY`, o backend devolve HTTP 503 ao enviar email.
- [ ] Configurar domínio de envio/SPF/DKIM no Resend e realizar teste real somente na etapa final.

## Testes de produção já executados

| Teste | Resultado |
| --- | --- |
| Deploy após config Vite nativa | PASS — Vercel READY |
| Deploy após remoção da dependência Lovable do `package.json` | PASS — Vercel READY |
| Deploy de produção após correção CVE-2026-102989 | PASS — Vercel `READY`, commit `36c50ce` |
| Deploy da nova landing | PASS — Vercel READY |
| `GET /` | PASS — HTTP 200 |
| `GET /login` | PASS — HTTP 200 |
| `GET /api/auth/me` sem sessão | PASS — HTTP 401 esperado |
| `GET /api/subscription/plans` | PASS — HTTP 200, JSON com planos Free/Pro/Business |
| Verificação HTML da nova landing | PASS PARCIAL — conteúdo funcional alinhado; metadata foi corrigida em commit posterior |
| Backend consolidado no repositório oficial | PASS — deployment Railway `SUCCESS`, build executou `patch_server.py` |
| `GET /api/dashboard` | PASS parcial — métrica Railway mostra 1 resposta 2xx; confirmar comportamento autenticado com sessão de teste |

## Infraestrutura confirmada

- Vercel projeto `factuur-snel-helper` está ligado a `gustavoort/factuur-snel-helper`, branch `main`.
- O serviço Railway de produção está configurado com `gustavoort/factuur-snel-helper`, branch `main`, root `/backend`, preservando domínio e variáveis existentes. As variáveis `RESEND_API_KEY` e `EMAIL_FROM` ainda não aparecem na configuração consultada.
- A configuração do serviço Railway ainda reporta builder RAILPACK, mas o deployment atual gerou a imagem via BuildKit e os logs mostram etapas do Dockerfile, incluindo `RUN python patch_server.py`. Manter esta divergência documentada e confirmar novamente no próximo deploy.
- O backend do repositório oficial já foi implantado com sucesso no Railway. Permanecem pendentes os testes end-to-end de autenticação, CRUD, PDFs, email, WhatsApp e pagamentos.

## Regra de conclusão

O projeto não será marcado como pronto enquanto houver qualquer bloqueador acima sem validação ou enquanto a aplicação depender operacionalmente do repositório legado.