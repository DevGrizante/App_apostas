// node src/logica.check.js — trava parser, payoff, MTM e o link do WhatsApp.
import assert from "node:assert/strict";
import { interpretar, numero, liquidacao, payoffs, mtm, linkWhatsApp, mensagemBatimento } from "./logica.js";

assert.deepEqual(interpretar("Fechado com Rodrigo: Compra 5k de Palmeiras @ 3.50"),
  { contraparte: "Rodrigo", lado: "C", time: "Palmeiras", odd: 3.5, volume: 5000 });
assert.deepEqual(interpretar("Venda 2k Flamengo odd 2.80 c/ Marcelo"),
  { contraparte: "Marcelo", lado: "V", time: "Flamengo", odd: 2.8, volume: 2000 });
assert.deepEqual(interpretar("vendi R$ 1.500,00 de Galo a odd 6,5 com Bia"),
  { contraparte: "Bia", lado: "V", time: "Atlético-MG", odd: 6.5, volume: 1500 });
assert.equal(interpretar("comprei 3 mil São Paulo @ 12,0 c/ Léo").time, "São Paulo");
assert.equal(interpretar("comprei 3 mil São Paulo @ 12,0 c/ Léo").contraparte, "Léo");
assert.equal(interpretar("oi tudo bem").lado, null);

assert.equal(numero("3,50"), 3.5);
assert.equal(numero("3.50"), 3.5);
assert.equal(numero("5.000"), 5000);
assert.equal(numero("5.000,25"), 5000.25);

const c = { lado: "C", time: "Palmeiras", odd: 3.5, volume: 1000 };
const v = { lado: "V", time: "Palmeiras", odd: 3.5, volume: 1000 };
assert.equal(liquidacao(c, "Palmeiras"), 2500);
assert.equal(liquidacao(c, "Flamengo"), -1000);
assert.equal(liquidacao(v, "Palmeiras"), -2500);
assert.equal(liquidacao(v, "Flamengo"), 1000);
assert.ok(payoffs([c, v]).every((p) => p.pnl === 0), "C e V iguais se anulam em todo cenário");

assert.equal(mtm(c, 3.5), 0);
assert.equal(mtm(c, 2.8), 250); // odd caiu: time mais provável, compra ganha
assert.equal(mtm(v, 2.8), -250);
assert.equal(mtm(c, 1), null);

const msg = mensagemBatimento("Rodrigo", [{ id: 1, data: "2026-11-01", ...c }], () => 0);
const url = linkWhatsApp(msg);
assert.ok(url.startsWith("https://wa.me/?text="));
assert.equal(decodeURIComponent(url.slice(20)), msg, "quebras de linha e R$ sobrevivem ao encode");
assert.ok(!/[\n $]/.test(url.slice(20)));

console.log("logica ok");
