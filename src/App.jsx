import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Pencil, Send, Trash2, Wand2 } from "lucide-react";
import {
  TIMES, interpretar, numero, liquidacao, payoffs, mtm, mensagemBatimento, linkWhatsApp,
  brl, odd, sinal, data,
} from "./logica.js";

const MOCK = [
  { id: 1, data: "2026-10-02", contraparte: "Rodrigo", time: "Palmeiras", lado: "C", odd: 3.5, volume: 5000 },
  { id: 2, data: "2026-10-05", contraparte: "Marcelo", time: "Flamengo", lado: "V", odd: 2.8, volume: 2000 },
  { id: 3, data: "2026-10-11", contraparte: "Bia", time: "Botafogo", lado: "C", odd: 6.0, volume: 1500 },
  { id: 4, data: "2026-10-18", contraparte: "Rodrigo", time: "Flamengo", lado: "C", odd: 2.6, volume: 3000 },
  { id: 5, data: "2026-10-23", contraparte: "Léo", time: "Atlético-MG", lado: "V", odd: 9.0, volume: 1000 },
  { id: 6, data: "2026-10-30", contraparte: "Marcelo", time: "Palmeiras", lado: "V", odd: 3.2, volume: 2500 },
  { id: 7, data: "2026-11-04", contraparte: "Bia", time: "Cruzeiro", lado: "C", odd: 11.0, volume: 800 },
  { id: 8, data: "2026-11-09", contraparte: "Léo", time: "Botafogo", lado: "V", odd: 5.5, volume: 1200 },
];
const ODDS_MOCK = {
  Palmeiras: 3.0, Flamengo: 2.5, Botafogo: 5.0, "Atlético-MG": 10.0, Cruzeiro: 9.0, Fortaleza: 14.0,
  "São Paulo": 18.0, Internacional: 20.0, Bahia: 25.0, Fluminense: 30.0, Corinthians: 35.0, Grêmio: 40.0,
  Vasco: 60.0, Bragantino: 80.0, Santos: 80.0, Mirassol: 100.0, Ceará: 150.0, Vitória: 200.0,
  Juventude: 250.0, Sport: 300.0,
};
const MODOS = ["Book", "MTM", "Payoff", "Batimento"];
const STATUS = ["Pendente", "Batido", "Descasado"];
const hoje = () => new Date().toISOString().slice(0, 10);
const VAZIO = { contraparte: "", lado: "C", time: "", odd: "", volume: "", data: hoje() };

// Estado que sobrevive ao F5. Storage bloqueado ou corrompido cai no padrão.
function useGuardado(chave, padrao) {
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem(chave); return s ? JSON.parse(s) : padrao; } catch { return padrao; }
  });
  useEffect(() => { try { localStorage.setItem(chave, JSON.stringify(v)); } catch { /* sem storage */ } }, [chave, v]);
  return [v, setV];
}

function copiar(texto) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto).then(() => true, () => false);
  const ta = Object.assign(document.createElement("textarea"), { value: texto });
  document.body.appendChild(ta); ta.select();
  const ok = document.execCommand("copy"); ta.remove();
  return Promise.resolve(ok);
}

const Lado = ({ l }) => <span className={`lado ${l} largo`}>{l === "C" ? "COMPRA [C]" : "VENDA [V]"}</span>;
const Pnl = ({ v }) => <span className={`num ${v > 0 ? "variacao sobe" : v < 0 ? "variacao desce" : ""}`}>{sinal(v)}</span>;
const I = { size: 13, strokeWidth: 1.5 };

export default function App() {
  const [boletas, setBoletas] = useGuardado("book:boletas", MOCK);
  const [oddsHoje, setOddsHoje] = useGuardado("book:odds", ODDS_MOCK);
  const [status, setStatus] = useGuardado("book:status", {});
  const [tema, setTema] = useGuardado("book:tema", "dark");
  const [modo, setModo] = useGuardado("book:modo", "Book");
  useEffect(() => { document.documentElement.dataset.theme = tema; }, [tema]);

  const mtmDe = (b) => mtm(b, oddsHoje[b.time]);
  const m = useMemo(() => {
    const comprada = boletas.filter((b) => b.lado === "C").reduce((s, b) => s + b.volume, 0);
    const vendida = boletas.filter((b) => b.lado === "V").reduce((s, b) => s + b.volume, 0);
    const pnl = boletas.reduce((s, b) => s + (mtm(b, oddsHoje[b.time]) ?? 0), 0);
    return { comprada, vendida, total: comprada + vendida, pnl };
  }, [boletas, oddsHoje]);

  // ---------- boletagem ----------
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState(VAZIO);
  const [faltou, setFaltou] = useState([]);
  const [editando, setEditando] = useState(null);

  function interpretarMsg() {
    const p = interpretar(msg);
    setFaltou(Object.entries({ contraparte: "contraparte", lado: "lado", time: "time", odd: "odd", volume: "volume" })
      .filter(([k]) => p[k] == null).map(([, n]) => n));
    setForm((f) => ({
      ...f,
      contraparte: p.contraparte ?? f.contraparte,
      lado: p.lado ?? f.lado,
      time: p.time ?? f.time,
      odd: p.odd != null ? String(p.odd).replace(".", ",") : f.odd,
      volume: p.volume != null ? String(p.volume).replace(".", ",") : f.volume,
    }));
  }
  const valOdd = numero(form.odd), valVol = numero(form.volume);
  const valido = form.contraparte.trim() && TIMES.includes(form.time) && valOdd > 1 && valVol > 0 && form.data;

  function registrar() {
    if (!valido) return;
    const b = { data: form.data, contraparte: form.contraparte.trim(), time: form.time, lado: form.lado, odd: valOdd, volume: valVol };
    if (editando != null) setBoletas((bs) => bs.map((x) => (x.id === editando ? { ...x, ...b } : x)));
    else setBoletas((bs) => [...bs, { id: Math.max(0, ...bs.map((x) => x.id)) + 1, ...b }]);
    setForm({ ...VAZIO, data: form.data }); setMsg(""); setFaltou([]); setEditando(null);
  }
  function editar(b) {
    setEditando(b.id); setFaltou([]);
    setForm({ ...b, odd: String(b.odd).replace(".", ","), volume: String(b.volume).replace(".", ",") });
  }
  function excluir(b) {
    if (confirm(`Excluir a boleta #${b.id} (${b.contraparte} · ${b.time})? Não dá para desfazer.`))
      setBoletas((bs) => bs.filter((x) => x.id !== b.id));
  }
  const contrapartes = [...new Set(boletas.map((b) => b.contraparte))].sort();

  return (
    <div className="app">
      <div className="faixa">
        <div className="identidade"><span className="ticker">Book Brasileirão</span></div>
        <dl className="chips">
          <div className="chip"><dt>Notional total</dt><dd>{brl(m.total)}</dd></div>
          <div className="chip"><dt>Exposição comprada</dt><dd className="variacao sobe">{brl(m.comprada)}</dd></div>
          <div className="chip"><dt>Exposição vendida</dt><dd className="variacao desce">{brl(m.vendida)}</dd></div>
          <div className="chip"><dt>Líquida</dt><dd>{sinal(m.comprada - m.vendida)}</dd></div>
          <div className="chip"><dt>Boletas abertas</dt><dd>{boletas.length}</dd></div>
          <div className="chip destaque"><dt>P&amp;L MTM</dt>
            <dd><Pnl v={m.pnl} /> <small className="pct">{m.total ? sinal((m.pnl / m.total) * 100, (n) => `${odd(n)}%`) : "—"}</small></dd></div>
        </dl>
        <div className="cortes modo">
          {MODOS.map((x) => <button key={x} aria-pressed={modo === x} onClick={() => setModo(x)}>{x}</button>)}
        </div>
        <button className="alternador" onClick={() => setTema(tema === "dark" ? "light" : "dark")}>{tema === "dark" ? "escuro" : "claro"}</button>
      </div>

      <div className="corpo">
        <section className="painel">
          <header><h2>Boletagem</h2>{editando != null && <span className="selo">editando #{editando}</span>}</header>
          <div className="rolagem boletagem">
            <label className="campo">Mensagem do WhatsApp
              <textarea rows={4} value={msg} onChange={(e) => setMsg(e.target.value)}
                placeholder="Fechado com Rodrigo: Compra 5k de Palmeiras @ 3.50" />
            </label>
            <button className="botao" onClick={interpretarMsg} disabled={!msg.trim()}><Wand2 {...I} /> interpretar</button>
            {faltou.length > 0 && <p className="aviso-parcial">não achei: {faltou.join(", ")} — preencha abaixo</p>}

            <div className="conferencia">
              <label className="campo">Contraparte
                <input list="contrapartes" value={form.contraparte} onChange={(e) => setForm({ ...form, contraparte: e.target.value })} />
                <datalist id="contrapartes">{contrapartes.map((c) => <option key={c} value={c} />)}</datalist>
              </label>
              <div className="campo">Lado
                <div className="cortes">
                  {["C", "V"].map((l) => (
                    <button key={l} aria-pressed={form.lado === l} className={`lado-${l}`} onClick={() => setForm({ ...form, lado: l })}>
                      {l === "C" ? "Compra [C]" : "Venda [V]"}
                    </button>
                  ))}
                </div>
              </div>
              <label className="campo">Time
                <select value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}>
                  <option value="">—</option>{TIMES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="campo">Odd
                <input className="num" inputMode="decimal" value={form.odd} onChange={(e) => setForm({ ...form, odd: e.target.value })} />
              </label>
              <label className="campo">Volume (R$)
                <input className="num" inputMode="decimal" value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} />
              </label>
              <label className="campo">Data
                <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              </label>
            </div>
            {valido && (
              <p className="previa">
                Campeão: <Pnl v={liquidacao({ lado: form.lado, odd: valOdd, volume: valVol, time: "x" }, "x")} />
                {" · "}não campeão: <Pnl v={liquidacao({ lado: form.lado, odd: valOdd, volume: valVol, time: "x" }, "y")} />
              </p>
            )}
            <div className="acoes">
              <button className="botao primario" onClick={registrar} disabled={!valido}><Check {...I} /> {editando != null ? "salvar alterações" : "registrar boleta"}</button>
              {editando != null && <button className="botao" onClick={() => { setEditando(null); setForm(VAZIO); }}>cancelar</button>}
            </div>
          </div>
        </section>

        {modo === "Book" && <Book boletas={boletas} contrapartes={contrapartes} mtmDe={mtmDe} oddsHoje={oddsHoje} editar={editar} excluir={excluir} />}
        {modo === "MTM" && <Mtm boletas={boletas} oddsHoje={oddsHoje} setOddsHoje={setOddsHoje} total={m} />}
        {modo === "Payoff" && <Payoff boletas={boletas} />}
        {modo === "Batimento" && <Batimento boletas={boletas} mtmDe={mtmDe} status={status} setStatus={setStatus} />}
      </div>
    </div>
  );
}

function Book({ boletas, contrapartes, mtmDe, oddsHoje, editar, excluir }) {
  const [f, setF] = useState({ time: "", contraparte: "", lado: "" });
  const linhas = boletas
    .filter((b) => (!f.time || b.time === f.time) && (!f.contraparte || b.contraparte === f.contraparte) && (!f.lado || b.lado === f.lado))
    .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);
  const sel = (k, opcoes, rotulo) => (
    <select className="filtro-gestora" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} aria-label={rotulo}>
      <option value="">{rotulo}</option>{opcoes.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  );
  const vol = linhas.reduce((s, b) => s + b.volume, 0);
  return (
    <section className="painel">
      <header>
        <h2>Book</h2>
        {sel("time", [...new Set(boletas.map((b) => b.time))].sort().map((t) => [t, t]), "todos os times")}
        {sel("contraparte", contrapartes.map((c) => [c, c]), "todas as contrapartes")}
        {sel("lado", [["C", "Compra [C]"], ["V", "Venda [V]"]], "os dois lados")}
        <span className="resumo">{linhas.length} de {boletas.length} · {brl(vol)}</span>
      </header>
      <div className="rolagem">
        {linhas.length === 0 ? <div className="estado"><strong>Nenhuma boleta no filtro</strong>Limpe um dos filtros acima.</div> : (
          <table className="pontas cab-centro">
            <thead><tr><th>Data</th><th>ID</th><th className="texto">Contraparte</th><th className="texto">Time</th><th>Lado</th>
              <th>Odd entrada</th><th>Notional</th><th>Odd hoje</th><th>MTM</th><th>Ações</th></tr></thead>
            <tbody>{linhas.map((b) => (
              <tr key={b.id}>
                <td className="num">{data(b.data)}</td><td className="num fraco">#{b.id}</td>
                <td className="texto cliente">{b.contraparte}</td><td className="texto">{b.time}</td>
                <td className="centro"><Lado l={b.lado} /></td>
                <td className="num">{odd(b.odd)}</td><td className="num">{brl(b.volume)}</td>
                <td className="num fraco">{odd(oddsHoje[b.time])}</td><td><Pnl v={mtmDe(b)} /></td>
                <td className="centro"><button className="icone" title="Editar" onClick={() => editar(b)}><Pencil {...I} /></button>
                  <button className="icone perigo" title="Excluir" onClick={() => excluir(b)}><Trash2 {...I} /></button></td>
              </tr>))}
            </tbody>
          </table>)}
      </div>
    </section>
  );
}

function Mtm({ boletas, oddsHoje, setOddsHoje, total }) {
  const linhas = TIMES.map((t) => {
    const bs = boletas.filter((b) => b.time === t);
    return {
      time: t, n: bs.length,
      c: bs.filter((b) => b.lado === "C").reduce((s, b) => s + b.volume, 0),
      v: bs.filter((b) => b.lado === "V").reduce((s, b) => s + b.volume, 0),
      pnl: bs.length ? bs.reduce((s, b) => s + (mtm(b, oddsHoje[t]) ?? 0), 0) : null,
    };
  }).sort((a, b) => b.n - a.n || a.time.localeCompare(b.time));
  return (
    <section className="painel">
      <header><h2>Marcação a mercado</h2>
        <span className="resumo">P&amp;L <Pnl v={total.pnl} /> · {total.total ? sinal((total.pnl / total.total) * 100, (n) => `${odd(n)}%`) : "—"} do notional</span></header>
      <div className="rolagem">
        <table className="pontas cab-centro">
          <thead><tr><th className="texto">Time</th><th>Odd de mercado hoje</th><th>Prob. implícita</th><th>Comprado</th><th>Vendido</th><th>MTM</th></tr></thead>
          <tbody>{linhas.map((l) => {
            const o = oddsHoje[l.time];
            return (
              <tr key={l.time} className={l.n ? "" : "sem-posicao"}>
                <td className="texto cliente">{l.time}{l.n > 0 && <span className="contagem">×{l.n}</span>}</td>
                <td className="centro"><input className="num odd-hoje" inputMode="decimal" defaultValue={o == null ? "" : odd(o)}
                  onBlur={(e) => { const n = numero(e.target.value); setOddsHoje({ ...oddsHoje, [l.time]: n > 1 ? n : undefined }); }}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} aria-label={`Odd de ${l.time}`} /></td>
                <td className="num fraco">{o > 1 ? `${odd(100 / o)}%` : "—"}</td>
                <td className="num">{l.c ? brl(l.c) : "—"}</td><td className="num">{l.v ? brl(l.v) : "—"}</td>
                <td><Pnl v={l.pnl} /></td>
              </tr>);
          })}</tbody>
        </table>
      </div>
    </section>
  );
}

function Payoff({ boletas }) {
  const cenarios = useMemo(() => payoffs(boletas).sort((a, b) => b.pnl - a.pnl), [boletas]);
  const [campeao, setCampeao] = useState(cenarios[0]?.time ?? TIMES[0]);
  const max = Math.max(1, ...cenarios.map((c) => Math.abs(c.pnl)));
  const pior = cenarios[cenarios.length - 1], melhor = cenarios[0];
  const total = cenarios.find((c) => c.time === campeao)?.pnl ?? 0;
  return (
    <section className="painel payoff">
      <header><h2>Payoff por campeão</h2>
        <select className="filtro-gestora" value={campeao} onChange={(e) => setCampeao(e.target.value)} aria-label="Campeão">
          {TIMES.map((t) => <option key={t}>{t}</option>)}</select>
        <span className="resumo">melhor {melhor.time} <Pnl v={melhor.pnl} /> · pior {pior.time} <Pnl v={pior.pnl} /></span></header>
      <div className="rolagem payoff-corpo">
        <ul className="barras">{cenarios.map((c) => (
          <li key={c.time} className={c.time === campeao ? "atual" : ""} onClick={() => setCampeao(c.time)}>
            <span className="nome-barra">{c.time}</span>
            <span className="trilho">
              <span className="meio" />
              <span className={`barra ${c.pnl >= 0 ? "pos" : "neg"}`}
                style={{ width: `${(Math.abs(c.pnl) / max) * 50}%`, [c.pnl >= 0 ? "left" : "right"]: "50%" }} />
            </span>
            <Pnl v={c.pnl} />
          </li>))}
        </ul>
        <div>
          <p className="titulo-tabela">Se o <strong>{campeao}</strong> for campeão: <Pnl v={total} /></p>
          <table className="pontas cab-centro">
            <thead><tr><th>ID</th><th className="texto">Contraparte</th><th className="texto">Time</th><th>Lado</th><th>Odd</th><th>Notional</th><th>Resultado</th></tr></thead>
            <tbody>{boletas.map((b) => (
              <tr key={b.id}><td className="num fraco">#{b.id}</td><td className="texto cliente">{b.contraparte}</td><td className="texto">{b.time}</td>
                <td className="centro"><Lado l={b.lado} /></td><td className="num">{odd(b.odd)}</td><td className="num">{brl(b.volume)}</td>
                <td><Pnl v={liquidacao(b, campeao)} /></td></tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Batimento({ boletas, mtmDe, status, setStatus }) {
  const grupos = useMemo(() => {
    const g = {};
    for (const b of boletas) (g[b.contraparte] ??= []).push(b);
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [boletas]);
  const [aberto, setAberto] = useState(null);
  const [copiado, setCopiado] = useState(null);
  const texto = aberto && grupos.find(([n]) => n === aberto)
    ? mensagemBatimento(aberto, grupos.find(([n]) => n === aberto)[1], mtmDe) : "";
  return (
    <section className="painel">
      <header><h2>Batimento mensal</h2>
        <span className="resumo">{grupos.filter(([n]) => (status[n] ?? "Pendente") === "Batido").length} de {grupos.length} batidas</span></header>
      <div className="rolagem">
        <table className="pontas cab-centro">
          <thead><tr><th className="texto">Contraparte</th><th>Boletas</th><th>Volume</th><th>Saldo a liquidar (MTM)</th><th>Status</th><th>Mensagem</th></tr></thead>
          <tbody>{grupos.map(([nome, bs]) => {
            const st = status[nome] ?? "Pendente";
            return (
              <tr key={nome} className={aberto === nome ? "atual" : ""}>
                <td className="texto cliente">{nome}</td><td className="num">{bs.length}</td>
                <td className="num">{brl(bs.reduce((s, b) => s + b.volume, 0))}</td>
                <td><Pnl v={bs.reduce((s, b) => s + (mtmDe(b) ?? 0), 0)} /></td>
                <td className="centro"><div className="cortes status">{STATUS.map((s) => (
                  <button key={s} className={`st-${s}`} aria-pressed={st === s} onClick={() => setStatus({ ...status, [nome]: s })}>{s}</button>))}
                </div></td>
                <td className="centro"><button className="alternador" aria-pressed={aberto === nome}
                  onClick={() => setAberto(aberto === nome ? null : nome)}>gerar mensagem</button></td>
              </tr>);
          })}</tbody>
        </table>
        {texto && (
          <div className="mensagem">
            <textarea readOnly rows={Math.min(16, texto.split("\n").length + 1)} value={texto} />
            <div className="acoes">
              <button className={`copiar ${copiado === aberto ? "copiado" : ""}`}
                onClick={() => copiar(texto).then((ok) => { setCopiado(ok ? aberto : null); setTimeout(() => setCopiado(null), 1400); })}>
                <Copy size={11} strokeWidth={1.5} /> {copiado === aberto ? "copiado" : "copiar texto"}</button>
              <a className="botao primario" href={linkWhatsApp(texto)} target="_blank" rel="noopener noreferrer"><Send {...I} /> enviar via WhatsApp</a>
            </div>
          </div>)}
      </div>
    </section>
  );
}
