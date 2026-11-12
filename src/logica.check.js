// node src/logica.check.js — trava parser, liquidação, MTM e o link do WhatsApp.
import assert from "node:assert/strict";
import { PAGA, interpretar, numero, liquidacao, notional, payoffs, mtm, linkWhatsApp, mensagemBatimento } from "./logica.js";

// Parser: lote e preço em vez de volume e odd.
assert.deepEqual(interpretar("Tomei 200 lotes de flamengo a 85"),
  { contraparte: null, lado: "C", time: "Flamengo", lotes: 200, preco: 85 });
assert.deepEqual(interpretar("Venda 2k Flamengo a 30 c/ Marcelo"),
  { contraparte: "Marcelo", lado: "V", time: "Flamengo", lotes: 2000, preco: 30 });
assert.deepEqual(interpretar("vendi 50 lotes Galo por 6,5 com Bia"),
  { contraparte: "Bia", lado: "V", time: "Atlético-MG", lotes: 50, preco: 6.5 });
assert.equal(interpretar("comprei 3 mil São Paulo @ 12,0 c/ Léo").lotes, 3000);
assert.equal(interpretar("comprei 3 mil São Paulo @ 12,0 c/ Léo").time, "São Paulo");
assert.equal(interpretar("comprei 3 mil São Paulo @ 12,0 c/ Léo").contraparte, "Léo");
assert.equal(interpretar("Tomei 200 lotes de flamengo a 110").preco, null, "preço fora de 0–100 não entra");
assert.equal(interpretar("oi tudo bem").lado, null);

assert.equal(numero("3,50"), 3.5);
assert.equal(numero("3.50"), 3.5);
assert.equal(numero("5.000"), 5000);
assert.equal(numero("5.000,25"), 5000.25);
assert.equal(numero(""), null);

// Liquidação: campeão paga 100, demais 0.
const c = { lado: "C", time: "Flamengo", lotes: 200, preco: 85 };
const v = { lado: "V", time: "Flamengo", lotes: 200, preco: 85 };
assert.equal(PAGA, 100);
assert.equal(notional(c), 17000);
assert.equal(liquidacao(c, "Flamengo"), 3000, "200 × (100 − 85)");
assert.equal(liquidacao(c, "Palmeiras"), -17000, "perde o que pagou");
assert.equal(liquidacao(v, "Flamengo"), -3000);
assert.equal(liquidacao(v, "Palmeiras"), 17000);
assert.ok(payoffs([c, v]).every((p) => p.pnl === 0), "C e V iguais se anulam em todo cenário");

// MTM: a 100 (campeão confirmado) tem que bater com a liquidação.
assert.equal(mtm(c, 90), 1000);
assert.equal(mtm(v, 90), -1000);
assert.equal(mtm(c, 0), -17000, "preço zerou: compra perde tudo");
assert.equal(mtm(c, PAGA), liquidacao(c, "Flamengo"));
assert.equal(mtm(c, null), null);

const msg = mensagemBatimento("Rodrigo", [{ id: 1, data: "2026-11-01", ...c }], () => 0);
const url = linkWhatsApp(msg);
assert.ok(url.startsWith("https://wa.me/?text="));
assert.equal(decodeURIComponent(url.slice(20)), msg, "quebras de linha e R$ sobrevivem ao encode");
assert.ok(!/[\n $]/.test(url.slice(20)));

console.log("logica ok");
