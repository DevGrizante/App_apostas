// Regras do book: parser de mensagem, payoff de liquidação e marcação a mercado.
// Convenção (lado da NOSSA ponta):
//   Compra (C) — apostamos no time. Campeão: +V × (odd − 1). Não campeão: −V.
//   Venda  (V) — bancamos o time.   Campeão: −V × (odd − 1). Não campeão: +V.

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

/** Extrai os campos de uma mensagem informal. Campo não achado volta null, nunca chutado. */
export function interpretar(msg) {
  const txt = ` ${msg} `;
  const base = sem(txt);
  const out = { contraparte: null, lado: null, time: null, odd: null, volume: null };

  if (/\b(compr\w*|back)\b/.test(base)) out.lado = "C";
  else if (/\b(vend\w*|lay|banc\w*)\b/.test(base)) out.lado = "V";

  const cp = txt.match(/(?:\bcom|\bc\/|\bcontra)\s+([A-ZÀ-Ýa-zà-ý][\wÀ-ÿ]*)/i);
  if (cp && !/^(o|a|os|as)$/i.test(cp[1])) out.contraparte = cp[1][0].toUpperCase() + cp[1].slice(1);

  for (const k of CHAVES) {
    const re = new RegExp(`(^|[^a-z0-9])${k.replace(/[-/]/g, "[- ]?")}([^a-z0-9]|$)`);
    if (re.test(base)) { out.time = APELIDOS[k]; break; }
  }

  let resto = txt;
  const od = txt.match(/(?:@|\bodds?\b|\bcota(?:ç|c)?(?:ão|ao)?\b|\ba\s+odd\b)\s*:?\s*(\d+(?:[.,]\d+)?)/i);
  if (od) {
    out.odd = numero(od[1].replace(",", "."));
    resto = txt.replace(od[0], " ");
  }

  const vol = resto.match(/(?:r\$\s*)?(\d+(?:[.,]\d+)*)\s*(k|mil|mm|m)\b/i) || resto.match(/r\$\s*(\d+(?:[.,]\d+)*)/i)
    || resto.match(/\b(\d+(?:[.,]\d+)*)\b/);
  if (vol) {
    const n = numero(vol[1]);
    const mult = { k: 1e3, mil: 1e3, m: 1e6, mm: 1e6 }[(vol[2] || "").toLowerCase()] || 1;
    out.volume = n == null ? null : Math.round(n * mult * 100) / 100;
  }
  return out;
}

/** Resultado da boleta se `campeao` levar o título. */
export function liquidacao(b, campeao) {
  const ganha = b.time === campeao;
  if (b.lado === "C") return ganha ? b.volume * (b.odd - 1) : -b.volume;
  return ganha ? -b.volume * (b.odd - 1) : b.volume;
}

/** Payoff da carteira inteira para cada possível campeão. */
export function payoffs(boletas, times = TIMES) {
  return times.map((t) => ({ time: t, pnl: boletas.reduce((s, b) => s + liquidacao(b, t), 0) }));
}

/**
 * MTM: valor esperado da boleta com a probabilidade implícita da odd de hoje (1 / odd).
 * Compra: V × (odd_entrada / odd_hoje − 1). Venda: o oposto.
 * É também o valor de zerar a posição (green-up) a odd_hoje, sem margem.
 */
export function mtm(b, oddHoje) {
  if (!(oddHoje > 1)) return null;
  const v = b.volume * (b.odd / oddHoje - 1);
  return b.lado === "C" ? v : -v;
}

export const brl = (n) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const odd = (n) => (n == null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
export const sinal = (n, f = brl) => (n == null ? "—" : (n > 0 ? "+" : n < 0 ? "−" : "") + f(Math.abs(n)));
export const data = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");

/** Texto de batimento para uma contraparte. Lado é o NOSSO. */
export function mensagemBatimento(nome, boletas, mtmDe, ref = new Date()) {
  const mes = ref.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const linhas = boletas.map(
    (b) => `#${b.id} · ${data(b.data)} · ${b.lado === "C" ? "Compro" : "Vendo"} ${b.time} · ${brl(b.volume)} @ ${odd(b.odd)}`,
  );
  const vol = boletas.reduce((s, b) => s + b.volume, 0);
  const marc = boletas.reduce((s, b) => s + (mtmDe(b) ?? 0), 0);
  return [
    `Fala ${nome}, segue o batimento das nossas boletas do Brasileirão (Ref: ${mes}):`,
    "",
    ...linhas,
    "",
    `Total: ${boletas.length} boleta${boletas.length === 1 ? "" : "s"} · ${brl(vol)} de notional`,
    `Marcação a mercado hoje (meu lado): ${sinal(marc)}`,
    "",
    "Confere e me avisa se bateu. Abraço!",
  ].join("\n");
}

export const linkWhatsApp = (texto) => `https://wa.me/?text=${encodeURIComponent(texto)}`;
