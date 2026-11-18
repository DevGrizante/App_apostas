import { PAGA, TIMES, fmtPreco, fmtQtd, mtm, numero } from "../logica.js";
import { Pnl, pct } from "../comum.jsx";

const precoValido = (n) => n != null && n >= 0 && n <= PAGA;

function posicao(c, v) {
  const partes = [c && `comprado ${fmtQtd(c)}`, v && `vendido ${fmtQtd(v)}`].filter(Boolean);
  if (!partes.length) return "Sem posição";
  const t = `${partes.join(", ")} lotes`;
  return t[0].toUpperCase() + t.slice(1);
}

export default function Mtm({ boletas, precos, setPrecos, totais }) {
  const linhas = TIMES.map((t) => {
    const bs = boletas.filter((b) => b.time === t);
    return {
      time: t, n: bs.length,
      c: bs.filter((b) => b.lado === "C").reduce((s, b) => s + b.lotes, 0),
      v: bs.filter((b) => b.lado === "V").reduce((s, b) => s + b.lotes, 0),
      pnl: bs.length ? bs.reduce((s, b) => s + (mtm(b, precos[t]) ?? 0), 0) : null,
    };
  }).sort((a, b) => b.n - a.n || a.time.localeCompare(b.time));

  return (
    <section className="tela">
      <div className="resumo-tela">
        <span>Resultado se zerar tudo hoje</span>
        <Pnl v={totais.pnl} className="medio" />
        <span className="sub">{pct(totais.pnl, totais.nocional)} do notional</span>
      </div>
      <p className="dica">Toque no preço de hoje para atualizar. De 0 a 100, ele também é a chance do time.</p>
      <ul className="lista">{linhas.map((l) => {
        const p = precos[l.time];
        return (
          <li key={l.time} className={`linha-mtm ${l.n ? "" : "sem-posicao"}`}>
            <span className="meio"><strong>{l.time}</strong><span className="sub">{posicao(l.c, l.v)}</span></span>
            <label className="preco-hoje">
              <span className="sr">Preço de hoje do {l.time}</span>
              <input inputMode="decimal" defaultValue={p == null ? "" : fmtPreco(p)}
                onBlur={(e) => { const n = numero(e.target.value); setPrecos({ ...precos, [l.time]: precoValido(n) ? n : undefined }); }}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
            </label>
            <span className="fim"><Pnl v={l.pnl} /></span>
          </li>);
      })}</ul>
    </section>
  );
}
