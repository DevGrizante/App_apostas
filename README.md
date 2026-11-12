# Book Brasileirão

Book de apostas de campeão do Brasileirão Série A fechadas no WhatsApp: boletagem a partir da mensagem, book filtrável, marcação a mercado, payoff por campeão e batimento mensal por contraparte. Visual do design system **Mesa**.

```
npm install
npm run dev      # http://127.0.0.1:5180
npm run check    # trava parser, payoff, MTM e o link do WhatsApp
```

## Convenções
- Lado é sempre a **nossa** ponta. Compra [C]: campeão paga `V × (odd − 1)`, senão perde `V`. Venda [V]: o oposto.
- MTM = `V × (odd_entrada / odd_hoje − 1)` na compra, sinal trocado na venda: valor esperado pela probabilidade implícita `1 / odd_hoje`, sem margem.
- "Saldo a liquidar" no batimento é o MTM de hoje da contraparte: nada liquida antes do fim do campeonato.
- Os 20 times de `src/logica.js → TIMES` são a Série A de 2025. Troque a lista quando a temporada mudar.
- Boletas, odds, status e tema ficam no `localStorage` do navegador: não há servidor nem cópia em outro lugar.
