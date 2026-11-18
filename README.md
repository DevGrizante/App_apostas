# Book Brasileirão

Book de apostas de campeão fechadas no WhatsApp: boletagem a partir da mensagem, book filtrável, marcação a mercado, payoff por campeão e batimento por contraparte. Começa pela escolha da competição (hoje só o Brasileirão 2026).

## Visual
- Cores da bandeira com significado: anil é o fundo, amarelo é ação, verde é ganho, vermelho é perda. Tokens em `src/estilo.css`, tema claro e escuro.
- Números em Barlow Condensed (o "placar"), texto em Barlow, via Google Fonts; sem rede, cai na fonte do sistema.
- Telas em `src/telas/`, peças comuns em `src/comum.jsx`, dados de exemplo e competições em `src/dados.js`.
- Celular: abas embaixo e botão "+" no centro. Computador (900px ou mais): barra lateral; de 1180px as telas abrem em duas colunas.

## Senha
- Criada no primeiro acesso, uma por aparelho, e pedida sempre que o app abre (`src/senha.js`, `src/telas/Senha.jsx`).
- Guarda só o hash PBKDF2. Tranca a tela, não cifra as boletas: o link abre para qualquer um, só que sem os dados de outro aparelho.
- "Esqueci a senha" apaga todos os dados do app naquele aparelho (fica só o tema).

```
npm install
npm run dev      # http://127.0.0.1:5180
npm run check    # trava parser, payoff, MTM e o link do WhatsApp
```

## Convenções
- Operação por **lote**, preço de **0 a 100**. No fim do campeonato o campeão paga 100 e os demais pagam 0.
- Lado é sempre a **nossa** ponta. Compra [C] de Q lotes a P: campeão `+Q × (100 − P)`, senão `−Q × P`. Venda [V]: o oposto.
- Notional = Q × P em R$ (o que sai de caixa na compra). Tomei 200 a 85 = R$ 17.000.
- MTM = Q × (P_hoje − P_entrada), com sinal trocado na venda. Com P_hoje = 100 vira o próprio payoff de liquidação.
- O preço de hoje também é a chance implícita do time (85 = 85%).
- "Saldo a liquidar" no batimento é o MTM de hoje da contraparte: nada liquida antes do fim do campeonato.
- Os 20 times de `src/logica.js → TIMES` são a Série A de 2025. Troque a lista quando a temporada mudar.
- Boletas, preços, status e tema ficam no `localStorage` do navegador: não há servidor nem cópia em outro lugar. As chaves são `book:v2:*`; o modelo antigo de volume e odd não é lido.

## No celular
Publicado em https://devgrizante.github.io/App_apostas/ a cada push na `main` (`.github/workflows/pages.yml`). No celular, abra o link e use "Adicionar a tela inicial". As boletas ficam so no aparelho.
