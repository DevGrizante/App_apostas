import { useEffect, useMemo, useState } from "react";
import { BarChart3, BookOpen, ChevronLeft, ChevronRight, Gauge, Lock, Plus, Users } from "lucide-react";
import { mtm, notional } from "./logica.js";
import { COMPETICOES } from "./dados.js";
import { I, Pnl, TemaBotao, ler, useGuardado } from "./comum.jsx";
import Boletar, { formVazio } from "./telas/Boletar.jsx";
import Book from "./telas/Book.jsx";
import Mtm from "./telas/Mtm.jsx";
import Payoff from "./telas/Payoff.jsx";
import Batimento from "./telas/Batimento.jsx";
import Senha from "./telas/Senha.jsx";

const ABAS = [["Book", BookOpen], ["MTM", Gauge], ["Nova", Plus], ["Payoff", BarChart3], ["Batimento", Users]];
const COR_BARRA = { dark: "#0d1726", light: "#eef1f6" };

// Destrancado vale para a aba aberta: fechar o app e abrir de novo pede a senha.
const ABERTO = "book:aberto";
const lerAberto = () => { try { return sessionStorage.getItem(ABERTO) === "1"; } catch { return false; } };
const gravarAberto = (v) => { try { v ? sessionStorage.setItem(ABERTO, "1") : sessionStorage.removeItem(ABERTO); } catch { /* sem storage */ } };

export default function App() {
  const [tema, setTema] = useGuardado("book:tema", "dark");
  const [registro, setRegistro] = useGuardado("book:senha", null);
  const [aberto, setAberto] = useState(lerAberto);
  const [comp, setComp] = useState(null);
  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COR_BARRA[tema] ?? COR_BARRA.dark);
  }, [tema]);

  function abrir() { gravarAberto(true); setAberto(true); }
  function trancar() { gravarAberto(false); setComp(null); setAberto(false); }
  function apagarTudo() {
    try { Object.keys(localStorage).filter((k) => k.startsWith("book:") && k !== "book:tema").forEach((k) => localStorage.removeItem(k)); } catch { /* sem storage */ }
    setRegistro(null);
  }

  if (!aberto || !registro) return <Senha registro={registro} salvarRegistro={setRegistro} abrir={abrir} apagarTudo={apagarTudo} />;
  if (!comp) return <Inicio tema={tema} setTema={setTema} escolher={setComp} trancar={trancar} />;
  return <Torneio key={comp.id} comp={comp} voltar={() => setComp(null)} tema={tema} setTema={setTema} />;
}

/** Resumo da competição para a tela inicial, lido do que está guardado no aparelho. */
function resumo(c) {
  const boletas = ler(`${c.chave}:boletas`, c.mock);
  const precos = ler(`${c.chave}:precos`, c.precosMock);
  return { n: boletas.length, pnl: boletas.reduce((s, b) => s + (mtm(b, precos[b.time]) ?? 0), 0) };
}

function Inicio({ tema, setTema, escolher, trancar }) {
  return (
    <div className="app sem-abas">
      <header className="topo inicio">
        <h1 className="marca">Book</h1>
        <span className="acoes-topo">
          <button className="icone" aria-label="Trancar o app" onClick={trancar}><Lock {...I} /></button>
          <TemaBotao tema={tema} setTema={setTema} />
        </span>
      </header>
      <main className="conteudo">
        <ul className="competicoes">{COMPETICOES.map((c) => {
          const r = resumo(c);
          return (
            <li key={c.id}>
              <button className="competicao" onClick={() => escolher(c)}>
                <span className="competicao-nome">{c.nome}</span>
                <span className="competicao-detalhe">{c.detalhe}</span>
                <span className="competicao-placar">
                  <Pnl v={r.pnl} className="grande" />
                  <span>{r.n} {r.n === 1 ? "boleta" : "boletas"}</span>
                </span>
                <ChevronRight {...I} className="seta" />
              </button>
            </li>);
        })}</ul>
      </main>
    </div>
  );
}

function Torneio({ comp, voltar, tema, setTema }) {
  const [boletas, setBoletas] = useGuardado(`${comp.chave}:boletas`, comp.mock);
  const [precos, setPrecos] = useGuardado(`${comp.chave}:precos`, comp.precosMock);
  const [status, setStatus] = useGuardado(`${comp.chave}:status`, {});
  const [aba, setAba] = useGuardado(`${comp.chave}:aba`, "Book");
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(() => formVazio());
  const atual = ABAS.some(([n]) => n === aba) ? aba : "Book";
  useEffect(() => { window.scrollTo(0, 0); }, [atual]);

  const mtmDe = (b) => mtm(b, precos[b.time]);
  const totais = useMemo(() => {
    const comprado = boletas.filter((b) => b.lado === "C").reduce((s, b) => s + b.lotes, 0);
    const vendido = boletas.filter((b) => b.lado === "V").reduce((s, b) => s + b.lotes, 0);
    const nocional = boletas.reduce((s, b) => s + notional(b), 0);
    const pnl = boletas.reduce((s, b) => s + (mtm(b, precos[b.time]) ?? 0), 0);
    return { comprado, vendido, nocional, pnl };
  }, [boletas, precos]);
  const contrapartes = [...new Set(boletas.map((b) => b.contraparte))].sort();

  function novaBoleta() { setEditando(null); setForm(formVazio()); setAba("Nova"); }
  function editar(b) {
    setEditando(b.id);
    setForm({ ...b, lotes: String(b.lotes).replace(".", ","), preco: String(b.preco).replace(".", ",") });
    setAba("Nova");
  }
  function salvar(b) {
    if (editando != null) setBoletas((bs) => bs.map((x) => (x.id === editando ? { ...x, ...b } : x)));
    else setBoletas((bs) => [...bs, { id: Math.max(0, ...bs.map((x) => x.id)) + 1, ...b }]);
    setEditando(null); setForm(formVazio(b.data));
  }
  function excluir(id) {
    setBoletas((bs) => bs.filter((x) => x.id !== id));
    setEditando(null); setForm(formVazio()); setAba("Book");
  }

  return (
    <div className="app">
      <header className="topo">
        <button className="icone" aria-label="Voltar às competições" onClick={voltar}><ChevronLeft {...I} /></button>
        <h1 className="titulo">{comp.nome}</h1>
        <TemaBotao tema={tema} setTema={setTema} />
      </header>

      <main className="conteudo">
        {atual === "Book" && <Book {...{ boletas, totais, precos, mtmDe, contrapartes, editar, novaBoleta }} chave={comp.chave} />}
        {atual === "MTM" && <Mtm {...{ boletas, precos, setPrecos, totais }} />}
        {atual === "Nova" && <Boletar {...{ form, setForm, editando, contrapartes, salvar, excluir }}
          cancelar={() => { setEditando(null); setForm(formVazio()); setAba("Book"); }} irParaBook={() => setAba("Book")} />}
        {atual === "Payoff" && <Payoff boletas={boletas} />}
        {atual === "Batimento" && <Batimento {...{ boletas, mtmDe, status, setStatus }} />}
      </main>

      <nav className="abas" aria-label="Seções">
        {ABAS.map(([nome, Icone]) => (nome === "Nova" ? (
          <button key={nome} className="aba-nova" aria-label="Nova boleta" aria-current={atual === "Nova" ? "page" : undefined}
            onClick={() => { if (editando != null || atual !== "Nova") novaBoleta(); }}>
            <Plus size={28} strokeWidth={2.25} /><span className="rotulo-nova">Nova boleta</span>
          </button>
        ) : (
          <button key={nome} className="aba" aria-current={atual === nome ? "page" : undefined} onClick={() => setAba(nome)}>
            <Icone {...I} /><span>{nome}</span>
          </button>
        )))}
      </nav>
    </div>
  );
}
