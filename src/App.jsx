import { useEffect, useMemo, useState } from "react";
import { BarChart3, BookOpen, Check, Copy, Gauge, MessageSquarePlus, Moon, Pencil, Send, Sun, Trash2, Users, Wand2 } from "lucide-react";
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
const ABAS = [
  ["Boletar", MessageSquarePlus], ["Book", BookOpen], ["MTM", Gauge], ["Payoff", BarChart3], ["Batimento", Users],
];
const STATUS = ["Pendente", "Batido", "Descasado"];
const hoje = () => new Date().toISOString().slice(0, 10);
const VAZIO = { contraparte: "", lado: "C", time: "", odd: "", volume: "", data: hoje() };
const pct = (pnl, base) => (base ? sinal((pnl / base) * 100, (n) => `${odd(n)}%`) : "—");

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
const I = { size: 16, strokeWidth: 1.5 };

export default function App() {
  const [boletas, setBoletas] = useGuardado("book:boletas", MOCK);
  const [oddsHoje, setOddsHoje] = useGuardado("book:odds", ODDS_MOCK);
  const [status, setStatus] = useGuardado("book:status", {});
  const [tema, setTema] = useGuardado("book:tema", "dark");
  const [aba, setAba] = useGuardado("book:aba", "Boletar");
  useEffect(() => { document.documentElement.dataset.theme = tema; }, [tema]);
  useEffect(() => { window.scrollTo(0, 0); }, [aba]);

  const mtmDe = (b) => mtm(b, oddsHoje[b.time]);
  const m = useMemo(() => {
    const comprada = boletas.filter((b) => b.lado === "C").reduce((s, b) => s + b.volume, 0);
    const vendida = boletas.filter((b) => b.lado === "V").reduce((s, b) => s + b.volume, 0);
    const pnl = boletas.reduce((s, b) => s + (mtm(b, oddsHoje[b.time]) ?? 0), 0);
    return { comprada, vendida, total: comprada + vendida, pnl };
  }, [boletas, oddsHoje]);

  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VAZIO);
  function editar(b) {
    setEditando(b.id);
    setForm({ ...b, odd: String(b.odd).replace(".", ","), volume: String(b.volume).replace(".", ",") });
    setAba("Boletar");
  }
  function excluir(b) {
    if (confirm(`Excluir a boleta #${b.id} (${b.contraparte} · ${b.time})? Não dá para desfazer.`))
      setBoletas((bs) => bs.filter((x) => x.id !== b.id));
  }
  const contrapartes = [...new Set(boletas.map((b) => b.contraparte))].sort();

  return (
    <div className="app">
      <header className="topo">
        <div className="linha-topo">
          <h1>Book Brasileirão</h1>
          <button className="icone" aria-label={tema === "dark" ? "Tema claro" : "Tema escuro"}
            onClick={() => setTema(tema === "dark" ? "light" : "dark")}>{tema === "dark" ? <Sun {...I} /> : <Moon {...I} />}</button>
        </div>
        <div className="pnl-topo"><span className="rotulo-chip">P&amp;L MTM</span><Pnl v={m.pnl} /><small>{pct(m.pnl, m.total)}</small></div>
        <dl className="chips">
          <div className="chip"><dt>Notional</dt><dd>{brl(m.total)}</dd></div>
          <div className="chip"><dt>Comprada</dt><dd className="variacao sobe">{brl(m.comprada)}</dd></div>
          <div className="chip"><dt>Vendida</dt><dd className="variacao desce">{brl(m.vendida)}</dd></div>
          <div className="chip"><dt>Líquida</dt><dd>{sinal(m.comprada - m.vendida)}</dd></div>
          <div className="chip"><dt>Boletas</dt><dd>{boletas.length}</dd></div>
        </dl>
      </header>

      <main className="conteudo">
        {aba === "Boletar" && <Boletar {...{ boletas, setBoletas, form, setForm, editando, setEditando, contrapartes }} irParaBook={() => setAba("Book")} />}
        {aba === "Book" && <Book {...{ boletas, contrapartes, mtmDe, oddsHoje, editar, excluir }} />}
        {aba === "MTM" && <Mtm {...{ boletas, oddsHoje, setOddsHoje }} total={m} />}
        {aba === "Payoff" && <Payoff boletas={boletas} />}
        {aba === "Batimento" && <Batimento {...{ boletas, mtmDe, status, setStatus }} />}
      </main>

      <nav className="abas">
        {ABAS.map(([nome, Icone]) => (
          <button key={nome} aria-current={aba === nome ? "page" : undefined} onClick={() => setAba(nome)}>
            <Icone size={20} strokeWidth={1.5} /><span>{nome}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Boletar({ setBoletas, form, setForm, editando, setEditando, contrapartes, irParaBook }) {
  const [msg, setMsg] = useState("");
  const [faltou, setFaltou] = useState([]);
  const [ok, setOk] = useState(null);

  function interpretarMsg() {
    const p = interpretar(msg);
    setFaltou(["contraparte", "lado", "time", "odd", "volume"].filter((k) => p[k] == null));
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
    setOk(`${editando != null ? "Boleta alterada" : "Boleta registrada"}: ${b.lado === "C" ? "Compra" : "Venda"} ${b.time} · ${brl(b.volume)} @ ${odd(b.odd)} com ${b.contraparte}`);
    setForm({ ...VAZIO, data: form.data }); setMsg(""); setFaltou([]); setEditando(null);
  }

  return (
    <section className="cartao boletagem">
      <h2>{editando != null ? `Editando boleta #${editando}` : "Nova boleta"}</h2>
      {ok && <p className="confirmacao"><Check size={14} strokeWidth={2} /> {ok} <button className="link" onClick={irParaBook}>ver no book</button></p>}
      <label className="campo">Mensagem do WhatsApp
        <textarea rows={3} value={msg} onChange={(e) => { setMsg(e.target.value); setOk(null); }}
          placeholder="Fechado com Rodrigo: Compra 5k de Palmeiras @ 3.50" />
      </label>
      <button className="botao" onClick={interpretarMsg} disabled={!msg.trim()}><Wand2 {...I} /> Interpretar mensagem</button>
      {faltou.length > 0 && <p className="aviso-parcial">Não achei: {faltou.join(", ")}. Preencha abaixo.</p>}

      <div className="conferencia">
        <label className="campo inteiro">Contraparte
          <input list="contrapartes" autoCapitalize="words" value={form.contraparte} onChange={(e) => setForm({ ...form, contraparte: e.target.value })} />
          <datalist id="contrapartes">{contrapartes.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <div className="campo inteiro">Lado
          <div className="cortes">
            {["C", "V"].map((l) => (
              <button key={l} aria-pressed={form.lado === l} className={`lado-${l}`} onClick={() => setForm({ ...form, lado: l })}>
                {l === "C" ? "Compra [C]" : "Venda [V]"}
              </button>
            ))}
          </div>
        </div>
        <label className="campo inteiro">Time
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
        <label className="campo inteiro">Data
          <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
        </label>
      </div>
      {valido && (
        <p className="previa">
          Se o {form.time} for campeão: <Pnl v={liquidacao({ lado: form.lado, odd: valOdd, volume: valVol, time: "x" }, "x")} />
          <br />Se não for: <Pnl v={liquidacao({ lado: form.lado, odd: valOdd, volume: valVol, time: "x" }, "y")} />
        </p>
      )}
      <button className="botao primario grande" onClick={registrar} disabled={!valido}>
        <Check {...I} /> {editando != null ? "Salvar alterações" : "Registrar boleta"}</button>
      {editando != null && <button className="botao grande" onClick={() => { setEditando(null); setForm(VAZIO); }}>Cancelar edição</button>}
    </section>
  );
}

function Book({ boletas, contrapartes, mtmDe, oddsHoje, editar, excluir }) {
  const [f, setF] = useGuardado("book:filtros", { time: "", contraparte: "", lado: "" });
  const linhas = boletas
    .filter((b) => (!f.time || b.time === f.time) && (!f.contraparte || b.contraparte === f.contraparte) && (!f.lado || b.lado === f.lado))
    .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);
  const sel = (k, opcoes, rotulo) => (
    <select className="filtro" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} aria-label={rotulo}>
      <option value="">{rotulo}</option>{opcoes.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  );
  return (
    <section>
      <div className="filtros">
        {sel("time", [...new Set(boletas.map((b) => b.time))].sort().map((t) => [t, t]), "Time")}
        {sel("contraparte", contrapartes.map((c) => [c, c]), "Contraparte")}
        {sel("lado", [["C", "Compra"], ["V", "Venda"]], "Lado")}
      </div>
      <p className="resumo-lista">{linhas.length} de {boletas.length} boletas · {brl(linhas.reduce((s, b) => s + b.volume, 0))}</p>
      {linhas.length === 0 ? <div className="estado"><strong>Nenhuma boleta no filtro</strong>Limpe um dos filtros acima.</div> : (
        <ul className="lista">{linhas.map((b) => (
          <li key={b.id} className="cartao item">
            <div className="item-linha">
              <strong>{b.time}</strong><Lado l={b.lado} /><span className="dir"><Pnl v={mtmDe(b)} /></span>
            </div>
            <div className="item-linha fraco">
              <span>{b.contraparte} · #{b.id} · {data(b.data)}</span>
            </div>
            <div className="item-linha">
              <span className="num">{brl(b.volume)} @ {odd(b.odd)}</span>
              <span className="num fraco">hoje {odd(oddsHoje[b.time])}</span>
              <span className="dir acoes-item">
                <button className="icone" aria-label={`Editar boleta ${b.id}`} onClick={() => editar(b)}><Pencil {...I} /></button>
                <button className="icone perigo" aria-label={`Excluir boleta ${b.id}`} onClick={() => excluir(b)}><Trash2 {...I} /></button>
              </span>
            </div>
          </li>))}
        </ul>)}
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
    <section>
      <p className="resumo-lista">P&amp;L <Pnl v={total.pnl} /> · {pct(total.pnl, total.total)} do notional. Toque na odd para atualizar.</p>
      <ul className="lista cartao lista-densa">{linhas.map((l) => {
        const o = oddsHoje[l.time];
        return (
          <li key={l.time} className={`mtm-linha ${l.n ? "" : "sem-posicao"}`}>
            <div>
              <strong>{l.time}</strong>
              <small>{l.n ? `C ${l.c ? brl(l.c) : "—"} · V ${l.v ? brl(l.v) : "—"}` : "sem posição"} · {o > 1 ? `${odd(100 / o)}%` : "—"}</small>
            </div>
            <input className="num odd-hoje" inputMode="decimal" defaultValue={o == null ? "" : odd(o)}
              onBlur={(e) => { const n = numero(e.target.value); setOddsHoje({ ...oddsHoje, [l.time]: n > 1 ? n : undefined }); }}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} aria-label={`Odd de hoje do ${l.time}`} />
            <span className="dir"><Pnl v={l.pnl} /></span>
          </li>);
      })}</ul>
    </section>
  );
}

function Payoff({ boletas }) {
  const cenarios = useMemo(() => payoffs(boletas).sort((a, b) => b.pnl - a.pnl), [boletas]);
  const [campeao, setCampeao] = useState(cenarios[0]?.time ?? TIMES[0]);
  const max = Math.max(1, ...cenarios.map((c) => Math.abs(c.pnl)));
  const total = cenarios.find((c) => c.time === campeao)?.pnl ?? 0;
  return (
    <section>
      <label className="campo">Campeão
        <select value={campeao} onChange={(e) => setCampeao(e.target.value)}>
          {TIMES.map((t) => <option key={t}>{t}</option>)}</select>
      </label>
      <p className="destaque-payoff">Se o <strong>{campeao}</strong> for campeão: <Pnl v={total} /></p>
      <ul className="barras cartao">{cenarios.map((c) => (
        <li key={c.time} className={c.time === campeao ? "atual" : ""} onClick={() => setCampeao(c.time)}>
          <span className="nome-barra">{c.time}</span>
          <span className="trilho"><span className="meio" />
            <span className={`barra ${c.pnl >= 0 ? "pos" : "neg"}`}
              style={{ width: `${(Math.abs(c.pnl) / max) * 50}%`, [c.pnl >= 0 ? "left" : "right"]: "50%" }} /></span>
          <Pnl v={c.pnl} />
        </li>))}
      </ul>
      <h3 className="subtitulo">Boleta a boleta</h3>
      <ul className="lista cartao lista-densa">{boletas.map((b) => (
        <li key={b.id} className="item-linha">
          <span><strong>{b.time}</strong> <Lado l={b.lado} /><br /><small className="fraco">{b.contraparte} · {brl(b.volume)} @ {odd(b.odd)}</small></span>
          <span className="dir"><Pnl v={liquidacao(b, campeao)} /></span>
        </li>))}
      </ul>
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
  return (
    <section>
      <p className="resumo-lista">{grupos.filter(([n]) => (status[n] ?? "Pendente") === "Batido").length} de {grupos.length} contrapartes batidas</p>
      <ul className="lista">{grupos.map(([nome, bs]) => {
        const st = status[nome] ?? "Pendente";
        const texto = aberto === nome ? mensagemBatimento(nome, bs, mtmDe) : "";
        return (
          <li key={nome} className="cartao item">
            <div className="item-linha"><strong>{nome}</strong><span className="dir"><Pnl v={bs.reduce((s, b) => s + (mtmDe(b) ?? 0), 0)} /></span></div>
            <div className="item-linha fraco"><span>{bs.length} boleta{bs.length === 1 ? "" : "s"} · {brl(bs.reduce((s, b) => s + b.volume, 0))}</span><span className="dir">saldo (MTM)</span></div>
            <div className="cortes status">{STATUS.map((s) => (
              <button key={s} className={`st-${s}`} aria-pressed={st === s} onClick={() => setStatus({ ...status, [nome]: s })}>{s}</button>))}
            </div>
            <button className="botao" aria-expanded={aberto === nome} onClick={() => setAberto(aberto === nome ? null : nome)}>
              {aberto === nome ? "Fechar mensagem" : "Gerar mensagem de batimento"}</button>
            {texto && (
              <div className="mensagem">
                <textarea readOnly rows={Math.min(14, texto.split("\n").length + 1)} value={texto} />
                <a className="botao primario grande" href={linkWhatsApp(texto)} target="_blank" rel="noopener noreferrer"><Send {...I} /> Enviar via WhatsApp</a>
                <button className={`botao ${copiado === nome ? "copiado" : ""}`}
                  onClick={() => copiar(texto).then((ok) => { setCopiado(ok ? nome : null); setTimeout(() => setCopiado(null), 1400); })}>
                  {copiado === nome ? <><Check {...I} /> Copiado</> : <><Copy {...I} /> Copiar texto</>}</button>
              </div>)}
          </li>);
      })}</ul>
    </section>
  );
}
