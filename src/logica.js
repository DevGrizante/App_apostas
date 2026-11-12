// Regras do book: parser, liquidação e marcação a mercado.
// Contrato por lote, preço de 0 a 100. No fim do campeonato o campeão paga 100; os demais pagam 0.
//   Compra [C] de Q lotes a P: campeão +Q × (100 − P); demais −Q × P.
//   Venda  [V] de Q lotes a P: o oposto.
// Notional = Q × P, em R$ (é o que sai de caixa na compra).

export const PAGA = 100;

export const TIMES = [
  "Atlético-MG", "Bahia", "Botafogo", "Bragantino", "Ceará", "Corinthians",
  "Cruzeiro", "Flamengo", "Fluminense", "Fortaleza", "Grêmio", "Internacional",
  "Juventude", "Mirassol", "Palmeiras", "Santos", "São Paulo", "Sport",
  "Vasco", "Vitória",
];

const sem = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Apelidos que aparecem no WhatsApp. Chave sem acento, minúscula.
const APELIDOS = {
  "atletico-mg": "Atlético-MG", "atletico mg": "Atlético-MG", "atletico mineiro": "Atlético-MG",
  galo: "Atlético-MG", cam: "Atlético-MG", fogao: "Botafogo", fogo: "Botafogo",
  "red bull bragantino": "Bragantino", "rb bragantino": "Bragantino", braga: "Bragantino",
  timao: "Corinthians", corinthians: "Corinthians", mengo: "Flamengo", fla: "Flamengo",
  flu: "Fluminense", inter: "Internacional", spfc: "São Paulo", verdao: "Palmeiras",
  porco: "Palmeiras", "sao paulo": "São Paulo", "vasco da gama": "Vasco",
};
for (const t of TIMES) APELIDOS[sem(t)] = t;
// Mais longo primeiro: "atletico mineiro" antes de "galo", "sao paulo" antes de "sp".
const CHAVES = Object.keys(APELIDOS).sort((a, b) => b.length - a.length);

/** Número com vírgula ou ponto. "5.000" e "5.000,50" são milhar pt-BR; "3.50" e "3,50" são decimais. */
export function numero(txt) {
  if (txt == null) return null;
  let s = String(txt).trim().replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const PRECO_RE = /(?:@|\ba\b|\bpor\b|\bpre[çc]o\b|\bpx\b)\s*(\d+(?:[.,]\d+)?)/i;
const LOTES_RE = /(\d+(?:[.,]\d+)?)\s*(k|mil)?\b/i;

/** Extrai os campos de uma mensagem informal. Campo não achado volta null, nunca chutado. */
export function interpretar(msg) {
  const txt = ` ${msg} `;
  const base = sem(txt);
  const out = { contraparte: null, lado: null, time: null, lotes: null, preco: null };

  if (/\b(compr\w*|tom\w*|back)\b/.test(base)) out.lado = "C";
  else if (/\b(vend\w*|lay|banc\w*)\b/.test(base)) out.lado = "V";

  const cp = txt.match(/(?:\bcom|\bc\/|\bcontra)\s+([A-ZÀ-Ýa-zà-ý][\wÀ-ÿ]*)/i);
  if (cp && !/^(o|a|os|as)$/i.test(cp[1])) out.contraparte = cp[1][0].toUpperCase() + cp[1].slice(1);

  for (const k of CHAVES) {
    const re = new RegExp(`(^|[^a-z0-9])${k.replace(/[-/]/g, "[- ]?")}([^a-z0-9]|$)`);
    if (re.test(base)) { out.time = APELIDOS[k]; break; }
  }

  let resto = txt;
  const pr = txt.match(PRECO_RE);
  if (pr) { out.preco = numero(pr[1]); resto = txt.replace(pr[0], " "); }

  const lt = resto.match(LOTES_RE);
  if (lt) {
    const n = numero(lt[1]);
    out.lotes = n == null ? null : Math.round(n * (lt[2] ? 1000 : 1) * 100) / 100;
  }
  if (out.preco != null && (out.preco < 0 || out.preco > PAGA)) out.preco = null;
  return out;
}

/** Notional em R$: quanto sai de caixa para montar a posição a esse preço. */
export const notional = (b) => b.lotes * b.preco;

/** Resultado da boleta se `campeao` levar o título. */
export function liquidacao(b, campeao) {
  const por = b.time === campeao ? PAGA - b.preco : -b.preco;
  return (b.lado === "C" ? 1 : -1) * b.lotes * por;
}

/** Payoff da carteira inteira para cada possível campeão. */
export function payoffs(boletas, times = TIMES) {
  return times.map((t) => ({ time: t, pnl: boletas.reduce((s, b) => s + liquidacao(b, t), 0) }));
}

/**
 * MTM: ganho ou perda se a posição for zerada ao preço de hoje.
 * Compra: Q × (P_hoje − P_entrada). Venda: o oposto. Preço de hoje 100 = campeão confirmado,
 * então o MTM vira o próprio payoff de liquidação.
 */
export function mtm(b, precoHoje) {
  if (precoHoje == null) return null;
  return (b.lado === "C" ? 1 : -1) * b.lotes * (precoHoje - b.preco);
}

export const brl = (n) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtPreco = (n) => (n == null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: 2 }));
export const fmtQtd = (n) => (n == null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: 2 }));
export const sinal = (n, f = brl) => (n == null ? "—" : (n > 0 ? "+" : n < 0 ? "−" : "") + f(Math.abs(n)));
export const data = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");

/** Texto de batimento para uma contraparte. Lado é o NOSSO. */
export function mensagemBatimento(nome, boletas, mtmDe, ref = new Date()) {
  const mes = ref.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const linhas = boletas.map(
    (b) => `#${b.id} · ${data(b.data)} · ${b.lado === "C" ? "Compro" : "Vendo"} ${fmtQtd(b.lotes)} lotes ${b.time} a ${fmtPreco(b.preco)} · ${brl(notional(b))}`,
  );
  const comprado = boletas.filter((b) => b.lado === "C").reduce((s, b) => s + b.lotes, 0);
  const vendido = boletas.filter((b) => b.lado === "V").reduce((s, b) => s + b.lotes, 0);
  const marc = boletas.reduce((s, b) => s + (mtmDe(b) ?? 0), 0);
  return [
    `Fala ${nome}, segue o batimento das nossas boletas do Brasileirão (Ref: ${mes}):`,
    "",
    ...linhas,
    "",
    `Total: ${boletas.length} boleta${boletas.length === 1 ? "" : "s"} · comprado ${fmtQtd(comprado)} lotes · vendido ${fmtQtd(vendido)} lotes`,
    `Marcação a mercado hoje (meu lado): ${sinal(marc)}`,
    "",
    "Confere e me avisa se bateu. Abraço!",
  ].join("\n");
}

export const linkWhatsApp = (texto) => `https://wa.me/?text=${encodeURIComponent(texto)}`;
