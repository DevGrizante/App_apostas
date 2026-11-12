import { useEffect, useMemo, useState } from "react";
import { BarChart3, BookOpen, Check, Copy, Gauge, MessageSquarePlus, Moon, Pencil, Send, Sun, Trash2, Users, Wand2 } from "lucide-react";
import {
  PAGA, TIMES, brl, data, fmtPreco, fmtQtd, interpretar, liquidacao, linkWhatsApp, mensagemBatimento,
  mtm, notional, numero, payoffs, sinal,
} from "./logica.js";

const MOCK = [
  { id: 1, data: "2026-10-02", contraparte: "Rodrigo", time: "Palmeiras", lado: "C", lotes: 100, preco: 25 },
  { id: 2, data: "2026-10-05", contraparte: "Marcelo", time: "Flamengo", lado: "V", lotes: 50, preco: 20 },
  { id: 3, data: "2026-10-11", contraparte: "Bia", time: "Botafogo", lado: "C", lotes: 40, preco: 10 },
  { id: 4, data: "2026-10-18", contraparte: "Rodrigo", time: "Flamengo", lado: "C", lotes: 80, preco: 22 },
  { id: 5, data: "2026-10-23", contraparte: "Léo", time: "Atlético-MG", lado: "V", lotes: 60, preco: 6 },
  { id: 6, data: "2026-10-30", contraparte: "Marcelo", time: "Palmeiras", lado: "V", lotes: 70, preco: 27 },
  { id: 7, data: "2026-11-04", contraparte: "Bia", time: "Cruzeiro", lado: "C", lotes: 30, preco: 4 },
  { id: 8, data: "2026-11-09", contraparte: "Léo", time: "Botafogo", lado: "V", lotes: 50, preco: 9 },
];
// Preço de hoje, 0–100: vale também como probabilidade implícita do time.
const PRECO_MOCK = {
  Palmeiras: 30, Flamengo: 28, Botafogo: 12, "Atlético-MG": 7, Cruzeiro: 5, Fortaleza: 3,
  "São Paulo": 3, Internacional: 2, Bahia: 2, Fluminense: 2, Corinthians: 2, Grêmio: 1,
  Vasco: 1, Bragantino: 1, Santos: 1, Mirassol: 1, Ceará: 0.5, Vitória: 0.5, Juventude: 0.5, Sport: 0.5,
};
const ABAS = [
  ["Boletar", MessageSquarePlus], ["Book", BookOpen], ["MTM", Gauge], ["Payoff", BarChart3], ["Batimento", Users],
];
const STATUS = ["Pendente", "Batido", "Descasado"];
const hoje = () => new Date().toISOString().slice(0, 10);
const VAZIO = { contraparte: "", lado: "C", time: "", lotes: "", preco: "", data: hoje() };
const pct = (pnl, base) => (base ? sinal((pnl / base) * 100, (n) => `${fmtPreco(n)}%`) : "—");
const precoValido = (n) => n != null && n >= 0 && n <= PAGA;

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
  // Chaves v2: o modelo antigo (volume e odd) não é lido de propósito.
  const [boletas, setBoletas] = useGuardado("book:v2:boletas", MOCK);
  const [precos, setPrecos] = useGuardado("book:v2:precos", PRECO_MOCK);
  const [status, setStatus] = useGuardado("book:status", {});
  const [tema, setTema] = useGuardado("book:tema", "dark");
  const [aba, setAba] = useGuardado("book:aba", "Boletar");
  useEffect(() => { document.documentElement.dataset.theme = tema; }, [tema]);
  useEffect(() => { window.scrollTo(0, 0); }, [aba]);

  const mtmDe = (b) => mtm(b, precos[b.time]);
  const m = useMemo(() => {
    const comprado = boletas.filter((b) => b.lado === "C").reduce((s, b) => s + b.lotes, 0);
    const vendido = boletas.filter((b) => b.lado === "V").reduce((s, b) => s + b.lotes, 0);
    const nocional = boletas.reduce((s, b) => s + notional(b), 0);
    const pnl = boletas.reduce((s, b) => s + (mtmDe(b) ?? 0), 0);
    return { comprado, vendido, liquido: comprado - vendido, nocional, pnl };
  }, [boletas, precos]);

  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VAZIO);
  function editar(b) {
    setEditando(b.id);
    setForm({ ...b, lotes: String(b.lotes).replace(".", ","), preco: String(b.preco).replace(".", ",") });
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
        <div className="pnl-topo"><span className="rotulo-chip">P&amp;L MTM</span><Pnl v={m.pnl} /><small>{pct(m.pnl, m.nocional)}</small></div>
        <dl className="chips">
          <div className="chip"><dt>Notional</dt><dd>{brl(m.nocional)}</dd></div>
          <div className="chip"><dt>Comprado</dt><dd className="variacao sobe">{fmtQtd(m.comprado)} lotes</dd></div>
          <div className="chip"><dt>Vendido</dt><dd className="variacao desce">{fmtQtd(m.vendido)} lotes</dd></div>
          <div className="chip"><dt>Líquido</dt><dd>{sinal(m.liquido, fmtQtd)} lotes</dd></div>
          <div className="chip"><dt>Boletas</dt><dd>{boletas.length}</dd></div>
        </dl>
      </header>

      <main className="conteudo">
        {aba === "Boletar" && <Boletar {...{ setBoletas, form, setForm, editando, setEditando, contrapartes }} irParaBook={() => setAba("Book")} />}
        {aba === "Book" && <Book {...{ boletas, contrapartes, mtmDe, precos, editar, excluir }} />}
        {aba === "MTM" && <Mtm {...{ boletas, precos, setPrecos }} total={m} />}
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
    setFaltou(["contraparte", "lado", "time", "lotes", "preco"].filter((k) => p[k] == null));
    setForm((f) => ({
      ...f,
      contraparte: p.contraparte ?? f.contraparte,
      lado: p.lado ?? f.lado,
      time: p.time ?? f.time,
      lotes: p.lotes != null ? String(p.lotes).replace(".", ",") : f.lotes,
      preco: p.preco != null ? String(p.preco).replace(".", ",") : f.preco,
    }));
  }
  const valLotes = numero(form.lotes), valPreco = numero(form.preco);
  const valido = form.contraparte.trim() && TIMES.includes(form.time)
    && valLotes != null && valLotes > 0 && precoValido(valPreco) && form.data;
  const sim = valido ? { lado: form.lado, time: form.time, lotes: valLotes, preco: valPreco } : null;

  function registrar() {
    if (!valido) return;
    const b = { data: form.data, contraparte: form.contraparte.trim(), time: form.time, lado: form.lado, lotes: valLotes, preco: valPreco };
    if (editando != null) setBoletas((bs) => bs.map((x) => (x.id === editando ? { ...x, ...b } : x)));
    else setBoletas((bs) => [...bs, { id: Math.max(0, ...bs.map((x) => x.id)) + 1, ...b }]);
    setOk(`${editando != null ? "Boleta alterada" : "Boleta registrada"}: ${b.lado === "C" ? "Compra" : "Venda"} ${fmtQtd(b.lotes)} lotes ${b.time} a ${fmtPreco(b.preco)} com ${b.contraparte}`);
    setForm({ ...VAZIO, data: form.data }); setMsg(""); setFaltou([]); setEditando(null);
  }

  return (
    <section className="cartao boletagem">
      <h2>{editando != null ? `Editando boleta #${editando}` : "Nova boleta"}</h2>
      {ok && <p className="confirmacao"><Check size={14} strokeWidth={2} /> {ok} <button className="link" onClick={irParaBook}>ver no book</button></p>}
      <label className="campo">Mensagem do WhatsApp
        <textarea rows={3} value={msg} onChange={(e) => { setMsg(e.target.value); setOk(null); }}
          placeholder="Tomei 200 lotes de Flamengo a 85 com Rodrigo" />
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
        <label className="campo">Lotes
          <input className="num" inputMode="decimal" value={form.lotes} onChange={(e) => setForm({ ...form, lotes: e.target.value })} />
        </label>
        <label className="campo">Preço (0–100)
          <input className="num" inputMode="decimal" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} />
        </label>
        <label className="campo inteiro">Data
          <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
        </label>
      </div>
      {sim && (
        <p className="previa">
          Notional <strong className="num">{brl(notional(sim))}</strong><br />
          Se {form.time} for campeão: <Pnl v={liquidacao(sim, form.time)} /><br />
          Se não for: <Pnl v={liquidacao(sim, null)} />
        </p>
      )}
      <button className="botao primario grande" onClick={registrar} disabled={!valido}>
        <Check {...I} /> {editando != null ? "Salvar alterações" : "Registrar boleta"}</button>
      {editando != null && <button className="botao grande" onClick={() => { setEditando(null); setForm(VAZIO); }}>Cancelar edição</button>}
    </section>
  );
}

function Book({ boletas, contrapartes, mtmDe, precos, editar, excluir }) {
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
      <p className="resumo-lista">{linhas.length} de {boletas.length} boletas · notional {brl(linhas.reduce((s, b) => s + notional(b), 0))}</p>
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
              <span className="num">{fmtQtd(b.lotes)} lotes a {fmtPreco(b.preco)} · {brl(notional(b))}</span>
              <span className="dir acoes-item">
                <span className="num fraco">hoje {fmtPreco(precos[b.time])}</span>
                <button className="icone" aria-label={`Editar boleta ${b.id}`} onClick={() => editar(b)}><Pencil {...I} /></button>
                <button className="icone perigo" aria-label={`Excluir boleta ${b.id}`} onClick={() => excluir(b)}><Trash2 {...I} /></button>
              </span>
            </div>
          </li>))}
        </ul>)}
    </section>
  );
}

function Mtm({ boletas, precos, setPrecos, total }) {
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
    <section>
      <p className="resumo-lista">P&amp;L <Pnl v={total.pnl} /> · {pct(total.pnl, total.nocional)} do notional. Toque no preço para atualizar.</p>
      <ul className="lista cartao lista-densa">{linhas.map((l) => {
        const p = precos[l.time];
        return (
          <li key={l.time} className={`mtm-linha ${l.n ? "" : "sem-posicao"}`}>
            <div>
              <strong>{l.time}</strong>
              <small>{l.n ? `C ${l.c ? fmtQtd(l.c) : "—"} · V ${l.v ? fmtQtd(l.v) : "—"} lotes` : "sem posição"} · chance {p != null ? `${fmtPreco(p)}%` : "—"}</small>
            </div>
            <input className="num odd-hoje" inputMode="decimal" defaultValue={p == null ? "" : fmtPreco(p)}
              onBlur={(e) => { const n = numero(e.target.value); setPrecos({ ...precos, [l.time]: precoValido(n) ? n : undefined }); }}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} aria-label={`Preço de hoje do ${l.time}`} />
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
          <span><strong>{b.time}</strong> <Lado l={b.lado} /><br /><small className="fraco">{b.contraparte} · {fmtQtd(b.lotes)} lotes a {fmtPreco(b.preco)}</small></span>
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
            <div className="item-linha fraco"><span>{bs.length} boleta{bs.length === 1 ? "" : "s"} · notional {brl(bs.reduce((s, b) => s + notional(b), 0))}</span><span className="dir">saldo (MTM)</span></div>
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
