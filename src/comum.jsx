// Peças pequenas usadas por várias telas.
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { fmtPreco, sinal } from "./logica.js";

export const I = { size: 20, strokeWidth: 1.75 };

/** P&L como % do notional, com sinal. */
export const pct = (pnl, base) => (base ? sinal((pnl / base) * 100, (n) => `${fmtPreco(n)}%`) : "—");

/** ["a","b","c"] → "a, b e c". */
export const emLista = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} e ${xs[xs.length - 1]}`);

/** Estado que sobrevive ao F5. Storage bloqueado ou corrompido cai no padrão. */
export function useGuardado(chave, padrao) {
  const [v, setV] = useState(() => ler(chave, padrao));
  useEffect(() => { try { localStorage.setItem(chave, JSON.stringify(v)); } catch { /* sem storage */ } }, [chave, v]);
  return [v, setV];
}

export function ler(chave, padrao) {
  try { const s = localStorage.getItem(chave); return s ? JSON.parse(s) : padrao; } catch { return padrao; }
}

/** Copia texto. Fora de contexto seguro cai no execCommand, que não pede permissão. */
export function copiar(texto) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto).then(() => true, () => false);
  const ta = Object.assign(document.createElement("textarea"), { value: texto });
  document.body.appendChild(ta); ta.select();
  const ok = document.execCommand("copy"); ta.remove();
  return Promise.resolve(ok);
}

/** Valor em R$ com sinal e cor: verde ganho, vermelho perda. */
export const Pnl = ({ v, className = "" }) => (
  <span className={`valor ${v > 0 ? "ganho" : v < 0 ? "perda" : ""} ${className}`}>{sinal(v)}</span>
);

/** Ficha do lado: C verde, V vermelho. A letra vai sempre junto da cor. */
export const Lado = ({ l }) => (
  <span className={`ficha ${l === "C" ? "c" : "v"}`} title={l === "C" ? "Compra" : "Venda"}>{l}</span>
);

export const TemaBotao = ({ tema, setTema }) => (
  <button className="icone" aria-label={tema === "dark" ? "Usar tema claro" : "Usar tema escuro"}
    onClick={() => setTema(tema === "dark" ? "light" : "dark")}>
    {tema === "dark" ? <Sun {...I} /> : <Moon {...I} />}
  </button>
);
