# Faktuvi — auditoria de segurança inicial (2026-10-27)

## Âmbito
Revisão do backend oficial `gustavoort/factuur-snel-helper`, inicialmente conduzida na branch `audit/security-hardening-2026-10-27`. No início da auditoria não foram alteradas a branch `main`, a base de dados ou a infraestrutura de produção.

## Falha confirmada
### HTML inserido sem escape na geração de PDFs
A função `generate_pdf_html` interpolava diretamente campos controláveis por utilizadores — por exemplo, descrição de linhas, notas, dados da empresa e dados de clientes — dentro de HTML enviado ao WeasyPrint. Conteúdo como tags HTML pode alterar o documento gerado e pode acionar carregamento de recursos durante a renderização. O mesmo padrão existia em alguns valores incluídos nos corpos HTML dos e-mails transacionais.

**Correção implementada nesta branch:** escapar texto dinâmico com `html.escape(..., quote=True)` na fase de patch do backend, mantendo o formato de saída e a identidade visual. O patch é deliberadamente estrito: falha o build se algum padrão esperado deixar de existir, em vez de aplicar uma correção parcial silenciosa.

## Segunda falha confirmada
### Origem de retorno do Stripe derivada diretamente do cabeçalho Origin
A função `request_origin` anterior aceitava qualquer valor com prefixo `http://` ou `https://` e utilizava-o para construir os URLs de sucesso/cancelamento do Stripe. Isso permite que um pedido autenticado influencie o destino de retorno do checkout para um domínio não autorizado.

**Correção proposta nesta branch:** aceitar o cabeçalho `Origin` apenas se corresponder exatamente a uma origem em `CORS_ORIGINS` ou à `FRONTEND_URL` configurada; caso contrário, usar o frontend configurado.

## Terceira falha confirmada
### Permissões de funcionalidades premium dependiam demasiado da interface
O backend precisava de garantir que utilizadores Free não conseguiam usar diretamente endpoints de upload de logótipo, branding PDF e envio de e-mails, e que links de pagamento exigiam Business. Também era necessário tratar subscrições expiradas ou com pagamento em atraso como sem acesso premium.

**Correção implementada nesta branch:** controlo de plano no backend, mantendo limites Free de 5 orçamentos e 5 faturas por mês, acesso ao envio de e-mail e logótipo apenas para Pro/Business, e links Stripe apenas para Business. A interface apresenta uma opção de upgrade nos pontos premium. O logótipo não é devolvido nem renderizado no plano Free.

## CSRF e cookies de sessão
A interface de produção chama o backend através do proxy same-origin `/api` do próprio domínio. A configuração anterior emitia cookies de autenticação com `SameSite=None`, permitindo o envio dos cookies em pedidos cross-site. A correção define `SameSite=Lax` para access e refresh tokens, mantendo `HttpOnly` e `Secure` em produção; a configuração foi adicionada ao teste de CI. Esta medida reduz a exposição a CSRF sem exigir cookies cross-site para o fluxo atual.

## SEO, desempenho e cabeçalhos
- Adicionado `public/sitemap.xml` apenas com páginas públicas canónicas e referenciado em `robots.txt`.
- Adicionados títulos, descrições e URLs canónicos às páginas Privacy e Terms.
- Removida a dependência de uma folha de estilos de fonte externa; o site usa uma pilha de fontes do sistema.
- Adicionados cabeçalhos HTTP de segurança: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy e Permissions-Policy.

## Falhas adicionais identificadas na validação posterior
### Limites mensais do Free contornáveis
As rotas diretas de criação tinham limite mensal, mas a duplicação de orçamentos e a conversão de orçamento em fatura não repetiam a verificação. A correção adiciona a mesma verificação do plano efetivo nessas rotas, com teste automatizado de contagem 4/5 e exceção para planos pagos.

### Checkout recorrente duplicado
A rota de checkout podia criar outra subscrição recorrente para uma conta que já tinha uma subscrição associada. A correção impede novo checkout enquanto o estado anterior não estiver resolvido, e devolve a faturação quando o plano já está ativo.

### Estado de cancelamento
O webhook de atualização de subscrição agora preserva o estado de cancelamento no final do período, mantendo as permissões até a subscrição efetivamente terminar.

## Verificações adicionais encontradas
- A branch `main` não tem proteção de branch ativa segundo os metadados consultados. Recomenda-se ativar proteção e exigir checks antes de permitir merge.
- A política de password (mínimo 12 caracteres, máximo 128) e os filtros de propriedade para consultas de clientes associados a orçamentos/faturas já são acrescentados por `backend/patch_server.py` durante a imagem Docker; devem continuar cobertos por testes para não depender apenas de transformações de texto.
- Os fluxos reais autenticados e de pagamento não foram exercitados nesta etapa. Não foi feita nenhuma escrita na base de dados de produção.

## Validação pendente
- [x] Compilação do backend original e do backend após aplicar o patch.
- [x] Testes automatizados da lógica de planos Free/Pro/Business, incluindo cancelamento no fim do período e subscrição em atraso.
- [x] Testes automatizados da allowlist de origem do Stripe e verificações por rota para logótipo, e-mail e links de pagamento.
- [x] Instalação frontend com lockfile, lint dos ficheiros alterados e build de produção.
- [x] Smoke test do preview Vercel: páginas públicas, `robots.txt`, `sitemap.xml` e `/api/subscription/plans` responderam HTTP 200; os cabeçalhos de segurança estavam presentes.
- Testar a renderização real do PDF com payloads HTML de prova e confirmar que aparecem como texto, não como markup.
- Testar isolamento entre duas contas de teste.
- [x] CI adicional para contornar limites Free por duplicação/conversão e evitar checkout recorrente duplicado.
- Testar Stripe em modo de teste (checkout, webhook assinado, repetição de evento e cancelamento).
- Executar testes E2E dos fluxos de clientes, orçamentos, faturas, PDF, e-mail e billing.
- Rever limites de upload, rate limiting e proteção CSRF, bem como a política de sessão/refresh.
## Validação pós-deploy — 2026-10-27
- Pull request #4 integrado na `main`; produção não foi alterada antes de os checks de compilação, lint e build passarem.
- Vercel: deployment de produção READY no commit `8e733ad6aa0da4e3bd7f6f04438f3238d71aa283`.
- Railway: deployment SUCCESS no mesmo commit; logs mostram arranque da aplicação e criação dos índices da base de dados.
- Smoke tests de produção: homepage, Privacy, Terms, `robots.txt`, `sitemap.xml` e `/api/subscription/plans` responderam HTTP 200. O endpoint de planos confirmou Free/Pro/Business; os cabeçalhos HSTS, nosniff e X-Frame-Options foram observados.
- A homepage passou a emitir canonical para `https://www.faktuvi.nl/`; as páginas Privacy e Terms também têm canonical e metadados.
- Os pedidos sem sessão a endpoints protegidos retornaram 401, comportamento esperado.

## Limitações restantes
O checkout Stripe autenticado, o webhook com assinatura real, os eventos duplicados, o isolamento de duas contas e a renderização PDF com payloads maliciosos não foram exercitados ponta a ponta por uma sessão de teste autenticada. Os checks de CI cobrem a lógica de entitlement e a transformação/compilação do backend, mas não substituem esses testes integrados. Não declarar esses cenários como validados até haver evidência.
