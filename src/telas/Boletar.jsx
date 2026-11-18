import { useState } from "react";
import { Check, ClipboardPaste, Trash2, Wand2 } from "lucide-react";
import { PAGA, TIMES, brl, fmtPreco, fmtQtd, interpretar, liquidacao, notional, numero } from "../logica.js";
import { I, Pnl, emLista } from "../comum.jsx";

const hoje = () => new Date().toISOString().slice(0, 10);
export const formVazio = (data = hoje()) => ({ contraparte: "", lado: "C", time: "", lotes: "", preco: "", data });
const precoValido = (n) => n != null && n >= 0 && n <= PAGA;
const NOMES = { contraparte: "a contraparte", lado: "o lado", time: "o time", lotes: "os lotes", preco: "o preço" };
// Ler a área de transferência só existe em contexto seguro (o GitHub Pages é https).
const podeColar = typeof navigator !== "undefined" && !!navigator.clipboard?.readText;

export default function Boletar({ form, setForm, editando, contrapartes, salvar, excluir, cancelar, irParaBook }) {
  const [msg, setMsg] = useState("");
  const [faltou, setFaltou] = useState([]);
  const [aviso, setAviso] = useState(null);

  function aplicar(texto) {
    const p = interpretar(texto);
    setFaltou(Object.keys(NOMES).filter((k) => p[k] == null).map((k) => NOMES[k]));
    setForm((f) => ({
      ...f,
      contraparte: p.contraparte ?? f.contraparte,
      lado: p.lado ?? f.lado,
      time: p.time ?? f.time,
      lotes: p.lotes != null ? String(p.lotes).replace(".", ",") : f.lotes,
      preco: p.preco != null ? String(p.preco).replace(".", ",") : f.preco,
    }));
    setAviso(null);
  }
  async function colar() {
    try {
      const t = await navigator.clipboard.readText();
      if (!t.trim()) return setAviso({ tipo: "erro", texto: "Nada copiado. Copie a mensagem no WhatsApp e toque em Colar." });
      setMsg(t); aplicar(t);
    } catch {
      setAviso({ tipo: "erro", texto: "Não deu para ler o que foi copiado. Cole a mensagem no campo." });
    }
  }

  const valLotes = numero(form.lotes), valPreco = numero(form.preco);
  const valido = form.contraparte.trim() && TIMES.includes(form.time)
    && valLotes != null && valLotes > 0 && precoValido(valPreco) && form.data;
  const sim = valido ? { lado: form.lado, time: form.time, lotes: valLotes, preco: valPreco } : null;
  const campo = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function registrar() {
    if (!valido) return;
    const b = { data: form.data, contraparte: form.contraparte.trim(), time: form.time, lado: form.lado, lotes: valLotes, preco: valPreco };
    setAviso({ tipo: "ok", texto: `${editando != null ? "Boleta alterada" : "Boleta registrada"}: ${b.lado === "C" ? "compra" : "venda"} de ${fmtQtd(b.lotes)} lotes de ${b.time} a ${fmtPreco(b.preco)} com ${b.contraparte}.` });
    salvar(b);
    setMsg(""); setFaltou([]);
  }
  function apagar() {
    if (confirm(`Excluir a boleta #${editando}? Não dá para desfazer.`)) excluir(editando);
  }

  return (
    <section className="tela">
      <h2 className="titulo-tela">{editando != null ? `Editar boleta #${editando}` : "Nova boleta"}</h2>
      {aviso && (
        <p className={`aviso ${aviso.tipo}`} role="status">
          {aviso.tipo === "ok" && <Check size={18} strokeWidth={2.25} />}{aviso.texto}
          {aviso.tipo === "ok" && <> <button className="link" onClick={irParaBook}>Ver no book</button></>}
        </p>
      )}

      {editando == null && (
        <div className="bloco">
          <label className="campo">Mensagem do WhatsApp
            <textarea rows={3} value={msg} onChange={(e) => { setMsg(e.target.value); setAviso(null); }} placeholder="Tomei 200 lotes de Flamengo a 85 com Rodrigo" />
          </label>
          <div className="linha-botoes">
            {podeColar && <button className="botao" onClick={colar}><ClipboardPaste {...I} /> Colar</button>}
            <button className="botao" onClick={() => aplicar(msg)} disabled={!msg.trim()}><Wand2 {...I} /> Ler mensagem</button>
          </div>
          {faltou.length > 0 && <p className="aviso alerta">Não achei {emLista(faltou)}. Preencha abaixo.</p>}
        </div>
      )}

      <div className="bloco">
        <div className="segmento" role="group" aria-label="Lado">
          {[["C", "Compra"], ["V", "Venda"]].map(([l, nome]) => (
            <button key={l} className={`seg ${l === "C" ? "c" : "v"}`} aria-pressed={form.lado === l}
              onClick={() => setForm({ ...form, lado: l })}>{nome}</button>
          ))}
        </div>
        <label className="campo">Time
          <select value={form.time} onChange={campo("time")}>
            <option value="">Escolha o time</option>{TIMES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <div className="par">
          <label className="campo">Lotes
            <input className="numero" inputMode="decimal" placeholder="200" value={form.lotes} onChange={campo("lotes")} />
          </label>
          <label className="campo">Preço, de 0 a 100
            <input className="numero" inputMode="decimal" placeholder="85" value={form.preco} onChange={campo("preco")} />
          </label>
        </div>
        <label className="campo">Contraparte
          <input list="contrapartes" autoCapitalize="words" value={form.contraparte} onChange={campo("contraparte")} />
          <datalist id="contrapartes">{contrapartes.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <label className="campo">Data
          <input type="date" value={form.data} onChange={campo("data")} />
        </label>
      </div>

      {sim && (
        <div className="cenarios">
          <div className="cenario"><span>Se o {form.time} for campeão</span><Pnl v={liquidacao(sim, form.time)} className="medio" /></div>
          <div className="cenario"><span>Se não for</span><Pnl v={liquidacao(sim, null)} className="medio" /></div>
          <p className="notional">Notional de {brl(notional(sim))}</p>
        </div>
      )}

      <button className="botao primario" onClick={registrar} disabled={!valido}>
        {editando != null ? "Salvar alterações" : "Registrar boleta"}
      </button>
      {editando != null && (
        <div className="linha-botoes">
          <button className="botao" onClick={cancelar}>Cancelar</button>
          <button className="botao perigo" onClick={apagar}><Trash2 {...I} /> Excluir</button>
        </div>
      )}
    </section>
  );
}
