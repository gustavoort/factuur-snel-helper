# Faktuvi — auditoria de segurança inicial (2026-10-27)

## Âmbito
Revisão estática do backend oficial `gustavoort/factuur-snel-helper`, branch de trabalho `audit/security-hardening-2026-10-27`. Nenhuma alteração foi feita na branch `main`, Vercel ou Railway de produção.

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

## SEO, desempenho e cabeçalhos
- Adicionado `public/sitemap.xml` apenas com páginas públicas canónicas e referenciado em `robots.txt`.
- Adicionados títulos, descrições e URLs canónicos às páginas Privacy e Terms.
- Removida a dependência de uma folha de estilos de fonte externa; o site usa uma pilha de fontes do sistema.
- Adicionados cabeçalhos HTTP de segurança: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy e Permissions-Policy.

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
- [x] Testes automatizados para quotas Free, bloqueio de acesso pago sem estado/ID Stripe e bloqueio de checkout duplicado no código.
- Testar Stripe em modo de teste (checkout, webhook assinado, repetição de evento e cancelamento).
- Executar testes E2E dos fluxos de clientes, orçamentos, faturas, PDF, e-mail e billing.
- Rever limites de upload, rate limiting e proteção CSRF, bem como a política de sessão/refresh.
- Só propor merge/deploy depois de os checks passarem e os testes funcionais serem confirmados.

## Estado
Os checks automatizados passaram na branch de auditoria em 2026-10-27. A validação real de checkout/webhook Stripe, o teste de isolamento com duas contas e a renderização PDF ainda dependem de testes autenticados/integração. Não afirmar estes fluxos como testados até haver evidência. A branch ainda precisa de merge e verificação pós-deploy.
