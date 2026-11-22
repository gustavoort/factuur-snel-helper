# Faktuvi — Estado técnico atual

Data da auditoria inicial: 2026-09-13
Última atualização de estado: 2026-11-22
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
- `/privacy`
- `/terms`
- `/invoice-paid` — página pública de retorno do pagamento de fatura pela Stripe (sucesso e `?status=canceled`)

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

Não foi encontrada integração frontend direta com Supabase no código auditado. Resend, persistência, autorização entre contas e a faturação Stripe (modo de teste) foram testados em produção; ver secção 13.

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
- verificar estado do pagamento;
- abrir o portal de cliente da Stripe (cancelar, trocar de plano, atualizar cartão).

O dashboard também exibe o plano atual quando disponível. Ver secção 17 para o modelo de faturação Stripe.

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
- Existe CI para build, TypeScript, ESLint global, smoke tests públicos e testes do webhook Stripe (`backend/test_webhook_reliability.py`). Os testes entre contas e de pagamento foram executados manualmente com scripts de QA; ainda não correm automaticamente no CI.
- Privacidade e termos ainda devem passar por revisão jurídica antes do lançamento comercial definitivo.
- O envio transacional de e-mail (recuperação de palavra-passe e fatura) foi testado manualmente pelo utilizador e funcionou em produção. Outros fluxos continuam por testar.

## 13. Estado dos testes de runtime

### Confirmado (produção, 22/11/2026)

- `main` no commit `8b06455` (PR #27); Vercel e Railway `success` nesse commit. O bloqueio de quota da Vercel de 27/10 está resolvido: cada merge em `main` volta a publicar automaticamente.
- Cadastro, login, logout, recuperação de palavra-passe, CRUD de clientes/orçamentos/faturas, PDF e envio por e-mail: confirmados pelo utilizador e/ou pelos testes de QA.
- Isolamento entre contas: 41/41 PASS (17/11/2026) com duas contas Free; 16/16 PASS (22/11/2026) com contas pagas (portal, regras de plano, isolamento). Uma fatura não pode referenciar o orçamento de outra conta (PR #19).
- Checkout Stripe de assinatura (Pro e Business) em modo de teste: pagamento, webhook e ativação do plano confirmados em três contas.
- Webhook Stripe: processamento idempotente com claim/lease; corrigidos o claim que nunca processava eventos (PR #20) e o conflito de caminho no MongoDB que devolvia 503 após aplicar o efeito (PR #26). Entrega nova após o PR #26 confirmada com HTTP 200 no Workbench.
- Cancelamento pelo portal (`cancel_at`) mostrado como cancelamento agendado (PR #23).
- Troca de plano pelo portal: Pro → Business aplicado de imediato com cobrança proporcional; Business → Pro agendado para o fim do período (PR #27).
- Link de pagamento de fatura (plano Business): cancelamento e pagamento regressam à página pública `/invoice-paid`; a fatura fica paga e um novo link é recusado (PR #22).

### Ainda pendente de teste funcional

- Execução da descida de plano agendada (primeira data: 17/12/2026, conta de teste A).
- Checkout de uma assinatura nova depois do PR #27, para confirmar EUR sem Adaptive Pricing e uso dos preços fixos.
- Falhas de pagamento (`invoice.payment_failed`, cartão recusado, 3-D Secure) e renovação mensal real.
- Links WhatsApp e conversão de orçamento em fatura em fluxo completo.
- Comportamento de desktop/mobile, acessibilidade básica e fluxos de erro 4xx/5xx com sessão real.
- Todo o fluxo em modo live da Stripe (ainda não configurado; ver LAUNCH_CHECKLIST).

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

Resolvidos: dependência do Lovable, backend não versionado, SEO/metadata, domínio e Resend.

Em aberto:

1. Stripe ainda em modo de teste, numa conta cujo nome público é "B&GSTORE"; falta configurar a conta live (ver checklist).
2. Testes entre contas e de pagamento são scripts manuais; não existe E2E automático no CI.
3. Privacidade e termos sem revisão jurídica.
4. Assinaturas de teste antigas foram criadas com Adaptive Pricing e são cobradas em USD; desligar a opção no painel da Stripe.

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

## 17. Faturação Stripe

- Conta Stripe usada pelo backend: modo de teste (`livemode: false`). Webhook `https://www.faktuvi.nl/api/webhook/stripe` (API `2024-12-18.acacia`) com os eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created/updated/deleted`, `invoice.paid` e `invoice.payment_failed`.
- Preços fixos com lookup keys `faktuvi_pro_monthly` (€9,99/mês) e `faktuvi_business_monthly` (€24,99/mês). O checkout usa-os quando existem e, caso contrário, recorre a `price_data`.
- O plano local é derivado do preço atual da assinatura (lookup key → valor mensal em EUR → `metadata.plan` como recurso), porque o portal troca o preço mas não o metadado.
- `adaptive_pricing` está desligado em todos os Checkout Sessions: o cliente paga sempre em EUR.
- Portal de cliente: cancelamento no fim do período, atualização de cartão e dados, histórico de faturas e troca entre Faktuvi Pro e Faktuvi Business. Upgrade com cobrança proporcional imediata (`always_invoice`); downgrade agendado para o fim do período.
- Retornos: assinatura → `/payment-success?session_id=…` (autenticada), cancelamento → `/billing`; fatura → `/invoice-paid` (pública); portal → `/billing`.
- Uma assinatura existente nunca é alterada pelo endpoint de checkout: pedidos de mudança de plano são enviados para o portal, e um segundo checkout é bloqueado se já existir assinatura ativa.
