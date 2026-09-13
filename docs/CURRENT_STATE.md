# FactuurSnel — Estado técnico atual

Data da auditoria inicial: 2026-09-13
Repositório oficial: `gustavoort/factuur-snel-helper`
Branch auditada: `main`

> Este documento descreve apenas o que foi confirmado diretamente no código do repositório atual. Pontos que dependem de backend externo, configuração de deploy ou credenciais são identificados como pendentes de validação de runtime.

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

O backend não está contido neste repositório. Por isso, banco de dados, regras server-side, Resend, Stripe e persistência real precisam ser validados contra o serviço backend já existente e o ambiente de produção.

Não foi encontrada integração frontend direta com Supabase no código auditado.

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

Há, porém, código específico de Lovable no fluxo de reporting de erros que precisa ser substituído antes da independência completa da plataforma.

## 11. Dependências do Lovable confirmadas

### Dependência de build
`vite.config.ts` importa `defineConfig` de `@lovable.dev/vite-tanstack-config`. Esse pacote também está listado em `devDependencies`.

O comentário do próprio arquivo afirma que o pacote injeta/configura TanStack Start, React, Tailwind, Nitro, aliases, variáveis VITE e plugins de erro. Portanto ele não pode ser removido sem antes reproduzir a configuração necessária nativamente.

### Runtime/dev tooling
- `src/lib/lovable-error-reporting.ts`
- chamada de `reportLovableError` em `src/routes/__root.tsx`
- pasta `.lovable/`
- README ainda orientado ao fluxo de desenvolvimento Lovable

## 12. Arquivos/configurações que exigem atenção antes do lançamento

- `.env` está versionado, embora atualmente tenha tamanho mínimo; deve ser removido do controle de versão e mantido apenas `.env.example`.
- README atual está obsoleto e orienta desenvolvimento via Lovable.
- `vite.config.ts` ainda depende diretamente do Lovable.
- metadata global ainda usa `FactuurSnel`/Twitter fixos e precisa ser revisada na etapa final de SEO/branding.
- `public/robots.txt` precisa ser validado para produção.
- sitemap não foi identificado na árvore auditada.
- não foi identificado teste automatizado do frontend no repositório atual.

## 13. Itens ainda não validados em runtime

Os pontos abaixo não podem ser declarados como aprovados apenas pela leitura do código e serão validados durante a revisão de produção:

- build limpo fora do ambiente Lovable;
- lint completo;
- comportamento real do proxy `/api` no deploy;
- login/cadastro/logout/refresh contra backend real;
- recuperação e redefinição de palavra-passe;
- CRUD real de clientes;
- CRUD real de orçamentos;
- CRUD real de faturas;
- geração/download/envio de PDF, quando exposto pelo backend;
- checkout e webhook Stripe;
- persistência e origem dos dados do dashboard;
- permissões/autorização server-side;
- Resend e emails transacionais;
- comportamento de callbacks em domínio final.

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
