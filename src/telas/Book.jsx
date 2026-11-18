import { Plus } from "lucide-react";
import { brl, data, fmtPreco, fmtQtd, notional } from "../logica.js";
import { Lado, Pnl, pct, useGuardado } from "../comum.jsx";

const SEM_FILTRO = { time: "", contraparte: "", lado: "" };

export default function Book({ boletas, totais, precos, mtmDe, contrapartes, editar, novaBoleta, chave }) {
  const [f, setF] = useGuardado(`${chave}:filtros`, SEM_FILTRO);
  const linhas = boletas
    .filter((b) => (!f.time || b.time === f.time) && (!f.contraparte || b.contraparte === f.contraparte) && (!f.lado || b.lado === f.lado))
    .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);
  const filtrando = f.time || f.contraparte || f.lado;
  const sel = (k, opcoes, rotulo) => (
    <select className={`filtro ${f[k] ? "ativo" : ""}`} value={f[k]} aria-label={rotulo}
      onChange={(e) => setF({ ...f, [k]: e.target.value })}>
      <option value="">{rotulo}</option>{opcoes.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  );

  return (
    <section className="tela">
      <div className="placar">
        <span className="placar-rotulo">Resultado se zerar tudo hoje</span>
        <Pnl v={totais.pnl} className="enorme" />
        <span className="placar-pct">{pct(totais.pnl, totais.nocional)} do notional</span>
        <dl className="placar-numeros">
          <div><dt>Notional</dt><dd>{brl(totais.nocional)}</dd></div>
          <div><dt>Comprado</dt><dd>{fmtQtd(totais.comprado)} lotes</dd></div>
          <div><dt>Vendido</dt><dd>{fmtQtd(totais.vendido)} lotes</dd></div>
        </dl>
      </div>

      {boletas.length > 0 && (
        <div className="filtros">
          {sel("time", [...new Set(boletas.map((b) => b.time))].sort().map((t) => [t, t]), "Todos os times")}
          {sel("contraparte", contrapartes.map((c) => [c, c]), "Todas as contrapartes")}
          {sel("lado", [["C", "Compras"], ["V", "Vendas"]], "Compras e vendas")}
        </div>
      )}

      {boletas.length === 0 ? (
        <div className="vazio">
          <p>Nenhuma boleta ainda.</p>
          <button className="botao primario" onClick={novaBoleta}><Plus size={20} strokeWidth={2.25} /> Registrar a primeira</button>
        </div>
      ) : linhas.length === 0 ? (
        <div className="vazio">
          <p>Nenhuma boleta com esses filtros.</p>
          <button className="botao" onClick={() => setF(SEM_FILTRO)}>Limpar filtros</button>
        </div>
      ) : (
        <ul className="lista">{linhas.map((b) => (
          <li key={b.id}>
            <button className="linha-boleta" onClick={() => editar(b)} aria-label={`Abrir boleta ${b.id}: ${b.time}, ${b.contraparte}`}>
              <Lado l={b.lado} />
              <span className="meio">
                <strong>{b.time}</strong>
                <span className="sub">{fmtQtd(b.lotes)} lotes a {fmtPreco(b.preco)}, hoje {fmtPreco(precos[b.time])}</span>
                <span className="sub fraco">{b.contraparte}, {data(b.data)}</span>
              </span>
              <span className="fim">
                <Pnl v={mtmDe(b)} />
                <span className="sub fraco">{brl(notional(b))}</span>
              </span>
            </button>
          </li>))}
        </ul>
      )}
      {filtrando && linhas.length > 0 && <p className="rodape">{linhas.length} de {boletas.length} boletas</p>}
    </section>
  );
}
