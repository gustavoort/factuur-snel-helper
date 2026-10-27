# Faktuvi — Estado técnico atual

Data da auditoria inicial: 2026-09-13
Última atualização de estado: 2026-10-25
Repositório oficial: `gustavoort/factuur-snel-helper`
Branch auditada: `main`

> Este documento descreve apenas o que foi confirmado diretamente no código do repositório atual. Pontos que dependem de backend externo, configuração de deploy ou credenciais são identificados como pendentes de validação de runtime.

## Identidade e domínio atuais

- Marca pública: **Faktuvi**.
- Assinatura: **Faktuvi — Offertes. Facturen. Overzicht.**
- Paleta: `#245747` (verde principal), `#E5EEE8` (verde claro), `#F7F5EF` (fundo quente), `#292F2C` (texto).
- Domínio principal configurado na Vercel: `www.faktuvi.nl`; `faktuvi.nl` redireciona para `www.faktuvi.nl`.
- Ícone: `public/faktuvi.svg`; a Vercel marcou os dois domínios como verificados. A verificação do domínio na Vercel não substitui um teste DNS/HTTP externo após propagação.

## 1. Arquitetura

A aplicação é um frontend/full-stack React com TanStack Start e roteamento file-based do TanStack Router. As páginas públicas e privadas vivem em `src/routes`. As rotas autenticadas usam o layout `_authenticated`, que desativa SSR para essa área e envolve as páginas com `ProtectedRoute` + `AppLayout`.

A aplicação usa React Query para estado remoto e cache, Axios para comunicação HTTP e i18next/react-i18next para internacionalização. O frontend não acessa diretamente MongoDB, Supabase ou outro banco; os dados são consumidos por uma API HTTP externa através de `/api`.

## 2. Stack confirmada

- React 19
- TypeScript 5.8
- Vite 8
- TanStack Start
- TanStack Router
- TanStack React Query
- Tailwind CSS 4
- Radix UI / componentes shadcn-style
- Axios
- React Hook Form + Zod
- i18next + react-i18next
- Recharts
- Sonner
- Nitro
- Bun lockfile presente

## 3. Estrutura principal

- `src/components/` — componentes de produto, layout, landing e UI
- `src/contexts/` — contexto de autenticação
- `src/i18n/` — configuração, formatação e traduções NL/EN/PT
- `src/lib/` — clientes da API e normalizadores
- `src/routes/` — páginas/rotas públicas e autenticadas
- `src/server.ts` — wrapper do servidor TanStack Start para falhas SSR
- `src/start.ts` — entrada da aplicação
- `public/` — favicon e robots
- `.lovable/` — metadados/planos específicos do Lovable

## 4. Rotas públicas confirmadas

- `/` — landing page
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`

## 5. Rotas privadas confirmadas

- `/dashboard`
- `/clients`
- `/clients/new`
- `/clients/:id/edit`
- `/quotes`
- `/quotes/new`
- `/quotes/:id`
- `/quotes/:id/edit`
- `/invoices`
- `/invoices/new`
- `/invoices/:id`
- `/invoices/:id/edit`
- `/company`
- `/billing`
- `/payment-success`

## 6. Autenticação

A autenticação atual é API-based e usa cookies/sessão via `withCredentials: true`. O frontend chama:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`

O interceptor Axios tenta refresh automático em resposta HTTP 401 e repete a requisição original uma vez. Se o refresh falha, o `AuthContext` limpa o usuário e o cache privado do React Query.

A área privada é protegida por `ProtectedRoute`. As rotas autenticadas usam `ssr: false`.

## 7. API e backend

Em produção, todas as requisições usam same-origin `/api`. Em desenvolvimento local pode ser definido `VITE_API_URL`, que é normalizado para `<base>/api`.

O backend FastAPI está agora versionado em `backend/` neste repositório. O serviço Railway de produção usa `gustavoort/factuur-snel-helper`, branch `main`, diretório `/backend`; o deployment do commit `7163f5c` está `SUCCESS`. Os logs de build confirmam o uso do Dockerfile, a instalação dos requisitos e a execução de `python patch_server.py`.

As métricas recentes do Railway mostram respostas 2xx em `/api/subscription/plans` e `/api/dashboard`. `/api/auth/me` tem respostas 401 sem sessão, esperadas, e também uma resposta 2xx. Isto confirma conectividade básica, não os fluxos completos de autenticação, persistência e faturação.

Não foi encontrada integração frontend direta com Supabase no código auditado. Resend, Stripe, persistência e autorização ainda precisam de testes funcionais com uma conta de teste.

## 8. Módulos funcionais presentes no frontend

### Clientes
Existe camada de API, formulário, listagem, criação e edição.

### Orçamentos
Existe camada de API, criação, edição, listagem e detalhe.

### Faturas
Existe camada de API, criação, edição, listagem e detalhe.

### Empresa
Existe página e camada de API para dados da empresa.

### Assinatura / billing
Existe camada de API para:

- listar planos;
- consultar assinatura atual;
- iniciar checkout;
- verificar estado do pagamento.

O dashboard também exibe o plano atual quando disponível.

### Dashboard
Consome `/api/dashboard` e exibe clientes, orçamentos, faturas, receita paga, valores em aberto e itens recentes.

## 9. Internacionalização

Há recursos completos separados para:

- `nl`
- `en`
- `pt`

A seleção de idioma é persistida e aplicada ao `lang` do documento após hidratação. As páginas usam chaves i18n de forma ampla.

## 10. Tratamento de erro

Existe tratamento global de erro no root, mensagens de API traduzidas e um wrapper server-side para converter falhas SSR catastróficas em uma página HTML de erro.

A pesquisa atual do código não encontrou dependências nem referências runtime ao Lovable; as ocorrências restantes são referências históricas na documentação.

## 11. Remoção do Lovable e segurança de dependências

- `vite.config.ts` usa configuração nativa Vite + TanStack Start + Nitro + React + Tailwind + `vite-tsconfig-paths`; já não importa `@lovable.dev/vite-tanstack-config`.
- A dependência de configuração do Lovable, o reporting de erros específico, os metadados `.lovable/` e as instruções antigas do Lovable foram removidos.
- O deployment de produção do Vercel foi corrigido no commit `36c50ce`: `@tanstack/react-start` está fixado em `1.168.61`, versão corrigida para CVE-2026-102989, e o deployment está `READY`.
- O `bun.lock` está versionado e o CI usa `bun install --frozen-lockfile`. A auditoria `bun audit --audit-level high` passou depois de atualizar Vite para `8.1.6` e Zod para `4.6.7`; build, TypeScript e ESLint global (sem a regra de formatação Prettier) também passaram.
- O domínio `faktuvi.nl` está verificado no Resend; os registos DNS foram adicionados na Hostinger. O utilizador confirmou teste real bem-sucedido de recuperação de palavra-passe e envio de fatura por e-mail. As variáveis `RESEND_API_KEY` e `EMAIL_FROM` estão configuradas no Railway.

## 12. Arquivos/configurações que exigem atenção antes do lançamento

- Manter `bun.lock` sincronizado com `package.json`; o CI agora falha se houver vulnerabilidades de dependência de severidade alta.
- [x] Metadata da homepage, canonical e Open Graph usam o domínio definitivo `https://www.faktuvi.nl/`.
- [x] `robots.txt` e `sitemap.xml` estão publicados e verificados pelo smoke test.
- Existe CI para build, TypeScript, ESLint global e smoke tests públicos; ainda falta E2E autenticado completo entre contas.
- Privacidade e termos ainda devem passar por revisão jurídica antes do lançamento comercial definitivo.
- O envio transacional de e-mail (recuperação de palavra-passe e fatura) foi testado manualmente pelo utilizador e funcionou em produção. Outros fluxos continuam por testar.

## 13. Estado dos testes de runtime

### Confirmado

- Build e deployment de produção Vercel `READY` no commit `36c50ce`, após corrigir a dependência vulnerável do TanStack Start.
- Deployment Railway `SUCCESS` no repositório oficial, commit `7163f5c`; o build executou `backend/patch_server.py`.
- `/api/subscription/plans` respondeu 2xx; `/api/dashboard` respondeu 2xx em métricas recentes do Railway.
- `/api/auth/me` devolve 401 quando não há sessão, comportamento esperado; também há uma resposta 2xx nas métricas recentes.

### Ainda pendente de teste funcional

- Cadastro, login, logout e refresh de sessão com conta de teste. Recuperação/redefinição de palavra-passe foi testada manualmente pelo utilizador e funcionou.
- CRUD real de clientes, orçamentos e faturas, incluindo autorização entre utilizadores.
- Geração e download de PDFs, links WhatsApp e conversão de orçamento em fatura. O utilizador confirmou envio de fatura por e-mail via Resend.
- Checkout e webhooks Stripe em modo de teste; validar idempotência e estados de subscrição.
- Instalação limpa, lint e testes automatizados; a compilação de produção passou, mas não substitui estes testes.
- Comportamento de desktop/mobile, acessibilidade básica e fluxos de erro 4xx/5xx.

## 14. Funcionalidades que ainda não existem no produto atual

Não foram identificados, na árvore atual, módulos próprios para o novo posicionamento de produto, como:

- Trabalhos/Projetos;
- captura de horas, materiais, despesas e notas por trabalho;
- Meerwerk estruturado;
- Money Recovery;
- Job Memory;
- assistente de fechamento semanal.

Esses módulos devem ser implementados apenas quando houver suporte real no backend/persistência; não serão apresentados como funcionais através de mocks.

## 15. Riscos de produção identificados

1. Dependência direta de build do Lovable.
2. Backend não versionado neste repositório, criando dependência operacional externa que precisa permanecer documentada.
3. Ausência de evidência de suíte de testes automatizados frontend.
4. Necessidade de validar todos os contratos API existentes contra o backend real.
5. SEO e metadata ainda não finalizados.
6. Configuração de domínio e Resend ainda deve permanecer para a última etapa, conforme decisão de produto.

## 16. Estratégia de consolidação

O `factuur-snel-helper` é a única fonte oficial a partir desta auditoria. O repositório legado `gustavoort/FactuurSnel` não deve receber novas alterações. Funcionalidades antigas só devem ser consultadas/migradas se ficar comprovado que estão ausentes aqui e ainda são necessárias para o lançamento.

A ordem segura de execução é:

1. documentar e validar contratos existentes;
2. remover dependência operacional do Lovable sem regressão;
3. preservar e corrigir os fluxos atuais;
4. consolidar landing + produto interno;
5. adicionar apenas funcionalidades de lançamento com backend real;
6. executar build/lint/testes de fluxo;
7. preparar produção;
8. por último configurar domínio e Resend.

## Atualização operacional dos deployments — 27/10/2026 09:28 UTC

Esta atualização substitui as referências históricas a deployments anteriores nas secções acima.

- GitHub `main`: commit `8ef1a6ce`. O CI passou com `bun.lock`, `bun audit --audit-level high`, build, `tsc --noEmit`, ESLint global (exceto regra Prettier) e testes de segurança do backend.
- Railway: deployment `SUCCESS` no commit `8ef1a6ce`. Logs confirmam arranque, criação de índices, endpoint público dos planos com HTTP 200 e endpoints protegidos com HTTP 401 sem sessão.
- Vercel: o alias de produção `www.faktuvi.nl` ainda aponta para o deployment `READY` do commit `b90caef1`; não há deployment publicado para o `main` mais recente.
- A tentativa de criar deployment Vercel para o commit `8ef1a6ce` foi recusada com HTTP 402 devido ao limite diário `api-deployments-free-per-day` (mais de 100 deployments no dia; a API indicou esperar 24 horas). Não foi alterada a faturação nem qualquer configuração de plano.
- Próximo passo operacional: depois de o limite Vercel reiniciar, publicar o `main` mais recente e executar novamente o smoke test de produção. Não considerar a atualização de dependências frontend publicada até isso ocorrer.
- O checkout Stripe E2E continua deliberadamente para o fim; não foi iniciado nenhum pagamento real nem de teste nesta etapa.
