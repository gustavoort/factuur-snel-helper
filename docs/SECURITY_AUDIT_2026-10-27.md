# Faktuvi — auditoria de segurança inicial (2026-10-27)

## Âmbito
Revisão estática do backend oficial `gustavoort/factuur-snel-helper`, branch de trabalho `audit/security-hardening-2026-10-27`. Nenhuma alteração foi feita na branch `main`, Vercel ou Railway de produção.

## Falha confirmada
### HTML inserido sem escape na geração de PDFs
A função `generate_pdf_html` interpolava diretamente campos controláveis por utilizadores — por exemplo, descrição de linhas, notas, dados da empresa e dados de clientes — dentro de HTML enviado ao WeasyPrint. Conteúdo como tags HTML pode alterar o documento gerado e pode acionar carregamento de recursos durante a renderização. O mesmo padrão existia em alguns valores incluídos nos corpos HTML dos e-mails transacionais.

**Correção proposta nesta branch:** escapar texto dinâmico com `html.escape(..., quote=True)` na fase de patch do backend, mantendo o formato de saída e a identidade visual. O patch é deliberadamente estrito: falha o build se algum padrão esperado deixar de existir, em vez de aplicar uma correção parcial silenciosa.

## Segunda falha confirmada
### Origem de retorno do Stripe derivada diretamente do cabeçalho Origin
A função `request_origin` anterior aceitava qualquer valor com prefixo `http://` ou `https://` e utilizava-o para construir os URLs de sucesso/cancelamento do Stripe. Isso permite que um pedido autenticado influencie o destino de retorno do checkout para um domínio não autorizado.

**Correção proposta nesta branch:** aceitar o cabeçalho `Origin` apenas se corresponder exatamente a uma origem em `CORS_ORIGINS` ou à `FRONTEND_URL` configurada; caso contrário, usar o frontend configurado.

## Verificações adicionais encontradas
- A branch `main` não tem proteção de branch ativa segundo os metadados consultados. Recomenda-se ativar proteção e exigir checks antes de permitir merge.
- A política de password (mínimo 12 caracteres, máximo 128) e os filtros de propriedade para consultas de clientes associados a orçamentos/faturas já são acrescentados por `backend/patch_server.py` durante a imagem Docker; devem continuar cobertos por testes para não depender apenas de transformações de texto.
- Os fluxos reais autenticados e de pagamento não foram exercitados nesta etapa. Não foi feita nenhuma escrita na base de dados de produção.

## Validação pendente
- [x] Workflow GitHub Actions executado com sucesso: compilação do backend original e do backend após aplicar o patch, mais verificações estáticas de escaping HTML e allowlist de origens.
- Testar a renderização com payloads HTML de prova e confirmar que aparecem como texto, não como markup.
- Testar isolamento entre duas contas de teste.
- Testar Stripe em modo de teste (checkout, webhook assinado, repetição de evento e cancelamento).
- Executar testes E2E dos fluxos de clientes, orçamentos, faturas, PDF, e-mail e billing.
- Rever limites de upload, rate limiting e proteção CSRF, bem como a política de sessão/refresh.
- Só propor merge/deploy depois de os checks passarem e os testes funcionais serem confirmados.

## Estado
O check automatizado do patch passou em 2026-10-27. Os testes são estáticos/compilação; não substituem a renderização real do PDF, os testes E2E ou a validação Stripe. Esta branch é uma proposta de correção, ainda não aprovada nem implantada em produção.
