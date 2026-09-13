# Recriar a landing pública

## Objetivo
Substituir somente a página pública por uma experiência premium em holandês para profissionais de serviços, mantendo login, cadastro, autenticação, dashboard e demais páginas sem alterações.

## Implementação
- Criar uma navegação fixa que muda ao rolar, com menu móvel e links internos para Product, Hoe het werkt, Voor vakmensen e Prijzen.
- Construir o hero com o posicionamento “Van klus naar betaald”, chamadas para `/register` e `/login`, e um mockup responsivo feito inteiramente com componentes da página.
- Montar as seções solicitadas: problema e fluxo, três etapas, Money Recovery, Job Memory marcado “In ontwikkeling”, Meerwerk, resumo semanal, funcionalidades, públicos, comparação, preços visuais, FAQ e chamada final.
- Usar `[NOME DO PRODUTO]` em toda a landing, sem alterar a marca usada dentro do produto.
- Preservar os três idiomas já suportados no projeto; a nova landing será escrita em holandês por padrão e o rodapé manterá o seletor NL/EN/PT para expansão futura.
- Adicionar apenas estilos e animações necessários à landing, com suporte a redução de movimento e adaptação para 375px até 1920px.

## Detalhes técnicos
- Alterar `src/routes/index.tsx` e adicionar componentes exclusivos da landing em um novo arquivo, sem tocar nas rotas autenticadas.
- Acrescentar tokens semânticos e utilitários de animação em `src/styles.css`, preservando os tokens usados pelo aplicativo interno.
- Carregar uma fonte legível pelo cabeçalho do documento e atualizar somente os metadados da rota pública.
- Manter preços apenas como apresentação; nenhuma lógica de cobrança será alterada.

## Validação
- Confirmar que `/`, `/login` e `/register` carregam corretamente.
- Verificar visualmente desktop e mobile, incluindo menu, FAQ, links, ausência de overflow e estados ao rolar.
- Confirmar typecheck e build sem erros.
