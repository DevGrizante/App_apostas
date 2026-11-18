import { useMemo, useState } from "react";
import { Check, Copy, Send } from "lucide-react";
import { brl, linkWhatsApp, mensagemBatimento, notional } from "../logica.js";
import { I, Pnl, copiar } from "../comum.jsx";

const STATUS = ["Pendente", "Batido", "Descasado"];

export default function Batimento({ boletas, mtmDe, status, setStatus }) {
  const grupos = useMemo(() => {
    const g = {};
    for (const b of boletas) (g[b.contraparte] ??= []).push(b);
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [boletas]);
  const [aberto, setAberto] = useState(null);
  const [copiado, setCopiado] = useState(null);
  const batidas = grupos.filter(([n]) => status[n] === "Batido").length;

  if (!grupos.length) return <section className="tela"><div className="vazio"><p>Nenhuma contraparte ainda. Registre uma boleta.</p></div></section>;

  return (
    <section className="tela">
      <p className="dica">{batidas} de {grupos.length} contrapartes batidas</p>
      <ul className="lista">{grupos.map(([nome, bs]) => {
        const st = status[nome] ?? "Pendente";
        const texto = aberto === nome ? mensagemBatimento(nome, bs, mtmDe) : "";
        return (
          <li key={nome} className="contraparte">
            <div className="contraparte-topo">
              <span className="meio">
                <strong>{nome}</strong>
                <span className="sub">{bs.length} {bs.length === 1 ? "boleta" : "boletas"}, notional de {brl(bs.reduce((s, b) => s + notional(b), 0))}</span>
              </span>
              <span className="fim"><Pnl v={bs.reduce((s, b) => s + (mtmDe(b) ?? 0), 0)} /><span className="sub fraco">saldo hoje</span></span>
            </div>
            <div className="segmento pequeno" role="group" aria-label={`Status de ${nome}`}>
              {STATUS.map((s) => (
                <button key={s} className={`seg st-${s.toLowerCase()}`} aria-pressed={st === s}
                  onClick={() => setStatus({ ...status, [nome]: s })}>{s}</button>
              ))}
            </div>
            <button className="botao" aria-expanded={aberto === nome} onClick={() => setAberto(aberto === nome ? null : nome)}>
              {aberto === nome ? "Fechar mensagem" : "Mensagem de batimento"}
            </button>
            {texto && (
              <div className="mensagem">
                <textarea readOnly rows={Math.min(14, texto.split("\n").length + 1)} value={texto} aria-label={`Mensagem para ${nome}`} />
                <a className="botao primario" href={linkWhatsApp(texto)} target="_blank" rel="noopener noreferrer"><Send {...I} /> Enviar no WhatsApp</a>
                <button className="botao" onClick={() => copiar(texto).then((ok) => { setCopiado(ok ? nome : null); setTimeout(() => setCopiado(null), 1400); })}>
                  {copiado === nome ? <><Check {...I} /> Copiado</> : <><Copy {...I} /> Copiar texto</>}
                </button>
              </div>
            )}
          </li>);
      })}</ul>
    </section>
  );
}
