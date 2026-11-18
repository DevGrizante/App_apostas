import { useMemo, useState } from "react";
import { TIMES, fmtPreco, fmtQtd, liquidacao, payoffs } from "../logica.js";
import { Lado, Pnl } from "../comum.jsx";

export default function Payoff({ boletas }) {
  const cenarios = useMemo(() => payoffs(boletas).sort((a, b) => b.pnl - a.pnl), [boletas]);
  const [campeao, setCampeao] = useState(cenarios[0]?.time ?? TIMES[0]);
  const max = Math.max(1, ...cenarios.map((c) => Math.abs(c.pnl)));
  const total = cenarios.find((c) => c.time === campeao)?.pnl ?? 0;

  return (
    <section className="tela">
      <label className="campo">Campeão
        <select value={campeao} onChange={(e) => setCampeao(e.target.value)}>
          {TIMES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </label>
      <div className="resumo-tela">
        <span>Se o {campeao} for campeão, o book fecha em</span>
        <Pnl v={total} className="medio" />
      </div>

      <h3 className="subtitulo">Resultado para cada campeão</h3>
      <ul className="barras">{cenarios.map((c) => (
        <li key={c.time}>
          <button className={`barra-linha ${c.time === campeao ? "atual" : ""}`} onClick={() => setCampeao(c.time)}>
            <span className="nome">{c.time}</span>
            <span className="trilho" aria-hidden="true">
              <span className="meio-trilho" />
              <span className={`barra ${c.pnl >= 0 ? "pos" : "neg"}`}
                style={{ width: `${(Math.abs(c.pnl) / max) * 50}%`, [c.pnl >= 0 ? "left" : "right"]: "50%" }} />
            </span>
            <Pnl v={c.pnl} />
          </button>
        </li>))}
      </ul>

      {boletas.length > 0 && <>
        <h3 className="subtitulo">Boleta a boleta</h3>
        <ul className="lista">{boletas.map((b) => (
          <li key={b.id} className="linha-simples">
            <Lado l={b.lado} />
            <span className="meio"><strong>{b.time}</strong><span className="sub">{fmtQtd(b.lotes)} lotes a {fmtPreco(b.preco)}, {b.contraparte}</span></span>
            <span className="fim"><Pnl v={liquidacao(b, campeao)} /></span>
          </li>))}
        </ul>
      </>}
    </section>
  );
}
