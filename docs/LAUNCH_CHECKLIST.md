# Faktuvi — Checklist de lançamento

Última atualização: 2026-11-24

Este documento descreve o estado observado no repositório e nas verificações disponíveis. Não foi realizada nesta sessão uma verificação nova de CI, deployment, backend de produção ou Stripe.

## Convenção

- **VALIDADO**: há evidência repositório-histórica ou funcional registrada, com data.
- **IMPLEMENTADO, MAS FALTA VALIDAÇÃO FUNCIONAL**: o código foi integrado e pode ter cobertura automatizada, mas o fluxo real ainda não foi confirmado.
- **PENDENTE**: ainda não há evidência suficiente para fechar o item.

Um build, merge ou teste isolado não substitui teste E2E, deploy confirmado ou validação funcional em produção.

## VALIDADO

### Repositório e histórico — observado em 24/11/2026

- [x] Os PRs #29 a #34 foram confirmados no `main`.
- [x] O último commit observado no `main` foi `597a81ff81c7961bb91c6138d0e2caca4498bd0d`, `Make quote conversion idempotent and fix WhatsApp sharing (#34)`.
- [x] Os diffs dos PRs foram consultados para separar cobertura implementada de fluxo funcional:
  - #29 adicionou testes de isolamento e regras de planos no CI.
  - #30 implementou o retorno à página original após login.
  - #31 implementou o idioma do checkout e do portal Stripe.
  - #32 implementou o aviso de pagamento falho.
  - #33 implementou a revogação de sessões no reset e o aviso de expiração.
  - #34 implementou a conversão idempotente de orçamento e o compartilhamento por WhatsApp.
- [x] Evidências históricas úteis são mantidas abaixo como histórico; não são apresentadas como confirmação atual de CI ou deploy.

### Evidência funcional histórica — datas anteriores

- [x] **Histórico — 17/11/2026:** testes autenticados de isolamento entre contas: 41/41 PASS em contas Free.
- [x] **Histórico — 22/11/2026:** testes autenticados de isolamento entre contas: 16/16 PASS em contas pagas.
- [x] **Histórico — 22/11/2026:** o utilizador confirmou cadastro/login/logout, checkout Pro/Business em modo de teste, cancelamento pelo portal e troca de plano pelo portal.
- [x] **Histórico — 22/11/2026:** a página pública de pagamento de fatura foi confirmada, incluindo marcação da fatura como paga.
- [x] **Histórico — 22/11/2026:** o domínio `faktuvi.nl` e `www.faktuvi.nl` foi observado configurado e verificado na Vercel; o apex redireciona para `www` com HTTP 308.
- [x] **Histórico — 22/11/2026:** os endpoints públicos de planos e a rejeição de sessões não autenticadas foram observados em smoke tests.
- [x] **Histórico — 25/10/2026:** o utilizador confirmou recuperação de palavra-passe real e envio de fatura por e-mail.
- [x] **Histórico — 27/10/2026:** build, TypeScript, lint global e testes de segurança do backend passaram em execução CI registrada.
- [x] **Histórico — 27/10/2026:** o lockfile `bun.lock` estava versionado e a instalação CI usava `bun install --frozen-lockfile`.

### Infraestrutura observada anteriormente

- [x] **Histórico — 27/10/2026:** serviço Railway observado em `SUCCESS` no commit `d46587f`, com execução do Dockerfile e `patch_server.py`.
- [x] **Histórico — 22/11/2026:** o estado anterior reportava o `main` no commit `8b06455`, com CI verde e deploy Vercel/Railway observado como concluído.
- [x] Esta sessão não verificou novamente nem renovou essas confirmações.

## IMPLEMENTADO, MAS FALTA VALIDAÇÃO FUNCIONAL

- [ ] **PR #29 — isolamento e regras de planos:** há testes automatizados para proteção entre contas e limites/recursos por plano. Falta validação E2E dos cenários reais e reconciliação atual com produção.
- [ ] **PR #30 — retorno após login:** a implementação devolve o utilizador à rota original após autenticação. Falta validar o fluxo completo no navegador, incluindo URLs diretas e recarregamento.
- [ ] **PR #31 — idioma Stripe:** o código passa o idioma do app para checkout e portal. Falta confirmar NL/EN/PT em sessões reais e manter a configuração do painel consistente.
- [ ] **PR #32 — aviso de pagamento falho:** o aviso foi implementado na interface. Falta provocar falha real e confirmar cartão recusado, 3-D Secure e mensagem ao utilizador.
- [ ] **PR #33 — reset e expiração de sessão:** há testes de revogação no reset e renovação de sessão. Falta E2E em navegador real com conta, refresh e expiração visual.
- [ ] **PR #34 — conversão e WhatsApp:** há testes isolados de conversão idempotente, prazo de pagamento e geração de links WhatsApp. Não são evidência E2E: falta executar a conversão no aplicativo e abrir/partilhar nos dispositivos.

## Observação Stripe — consulta em 24/11/2026

- [ ] **Conta consultada:** `acct_1QYTrOQtQUiogBIR`.
  - Preço ativo `faktuvi_pro_monthly`: EUR 999 centavos/mês, `price_1UecNlQtQUiogBIRVLpAn0ak`.
  - Preço ativo `faktuvi_business_monthly`: EUR 2499 centavos/mês, `price_1UecNoQtQUiogBIRQKW6GD1l`.
- [ ] A correspondência desta conta com a chave Stripe configurada no backend ainda não foi comprovada. Não foi confirmado que esta conta é definitivamente usada pelo backend.
- [ ] **Primeira conta consultada:** `acct_1RXoMxLtWqj6kso2`.
  - Não retornou preços nas consultas.
  - Não retornou assinaturas na listagem geral.
  - Foram criados apenas o relógio `clock_1UfD67LtWqj6kso2fOBWcPWH` e o cliente `cus_VgaHNrE0ij9eQm`.
  - Não há assinatura criada nessa conta nem vínculo validado com o app.
- [ ] Recursos QA isolados não são prova E2E.
- [ ] A simulação da troca **Business para Pro não foi executada** e continua pendente.

## PENDENTE

### Cobertura técnica por prioridade

1. **Confirmar CI e deploy do `main`:** conferir o estado atual dos workflows, Vercel e Railway após o último commit observado.
2. **Confirmar ambiente de cobrança:** validar chave secreta/publicável, ambiente, webhook, lookup keys, produtos, portal e vínculo real com o backend.
3. **Validar downgrade e falhas de pagamento/webhook:** executar downgrade Business → Pro; testar falha de pagamento, cartão recusado, 3-D Secure e `invoice.payment_failed`.
4. **Validar sessão, conversão e WhatsApp:** testar refresh/expiração, reset com revogação, conversão idempotente de orçamento e partilha WhatsApp conforme lacunas E2E.
5. **Validar desktop, mobile e estados de erro:** fluxos em desktop/mobile, URLs diretas, refresh, API offline, respostas 4xx/5xx e estados vazios.
6. **Revisar acessibilidade:** teclado, labels, foco, contraste, headings e diálogos.
7. **Consolidar evidências:** registrar comandos, datas, resultados, commits, IDs de CI e confirmações funcionais em uma última revisão.

### Stripe e lançamento comercial

- [ ] Manter o nome público da conta Stripe pendente até haver evidência de resolução: deve deixar de aparecer como "B&GSTORE" no checkout, portal e extrato do cartão.
- [ ] Manter o Adaptive Pricing pendente até haver evidência de resolução no painel da Stripe e nas assinaturas existentes.
- [ ] Decidir IVA/BTW e a configuração de cobrança antes do modo live.
- [ ] Configurar, após aprovação, conta Stripe live, chaves no Railway, webhook live e segredo de assinatura.
- [ ] Configurar produtos live Faktuvi Pro/Business com `faktuvi_pro_monthly` e `faktuvi_business_monthly`.
- [ ] Confirmar portal com troca de plano e cancelamento no fim do período.
- [ ] Testar uma assinatura nova em EUR e a descida Business → Pro em ambiente controlado.
- [ ] Revisar juridicamente privacidade e termos.

## Dependências do utilizador — etapa final

Estas decisões/ações dependem do utilizador e não devem ser tratadas como concluídas pelo repositório:

- [ ] Decisão contábil sobre IVA/BTW: Stripe Tax ou preços com IVA incluído.
- [ ] Acesso e configuração da conta Stripe live.
- [ ] Fornecimento/configuração dos segredos de produção necessários.
- [ ] Revisão jurídica de privacidade e termos.
- [ ] Autorização para realizar pagamento real controlado.
- [ ] Autorização própria para eventual estorno.

## Limites desta atualização

Esta alteração atualiza somente `docs/LAUNCH_CHECKLIST.md`. Não cria funcionalidades, recursos Stripe, configurações ou segredos; não executa merge/deploy; não confirma CI/deploy atuais; não valida a correspondência entre Stripe e backend; não executa pagamento real ou estorno.
