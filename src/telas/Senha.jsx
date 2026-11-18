import { useState } from "react";
import { Lock } from "lucide-react";
import { SENHA_MIN, conferir, criarRegistro, temCripto } from "../senha.js";

export default function Senha({ registro, salvarRegistro, abrir, apagarTudo }) {
  const criando = !registro;
  const [senha, setSenha] = useState("");
  const [repetida, setRepetida] = useState("");
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    if (!temCripto()) return setErro("Este navegador não aceita senha neste endereço. Abra o app pelo link https.");
    if (criando) {
      if (senha.length < SENHA_MIN) return setErro(`A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`);
      if (senha !== repetida) return setErro("As duas senhas não são iguais.");
    }
    setErro(null); setOcupado(true);
    try {
      if (criando) { salvarRegistro(await criarRegistro(senha)); abrir(); return; }
      if (await conferir(senha, registro)) { abrir(); return; }
      setSenha(""); setErro("Senha incorreta.");
    } finally {
      setOcupado(false);
    }
  }
  function esqueci() {
    if (confirm("Apagar todas as boletas e a senha deste aparelho? Não dá para desfazer.")) apagarTudo();
  }

  return (
    <div className="app sem-abas cadeado">
      <main className="conteudo">
        <form className="bloco senha" onSubmit={enviar}>
          <Lock size={28} strokeWidth={1.75} aria-hidden="true" />
          <h1 className="titulo-tela">{criando ? "Crie uma senha" : "Book"}</h1>
          <p className="dica">{criando ? "Ela vai ser pedida sempre que o app abrir neste aparelho." : "Digite a senha deste aparelho."}</p>
          <label className="campo">Senha
            <input type="password" autoComplete={criando ? "new-password" : "current-password"} autoFocus
              value={senha} onChange={(e) => setSenha(e.target.value)} />
          </label>
          {criando && (
            <label className="campo">Repita a senha
              <input type="password" autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} />
            </label>
          )}
          {erro && <p className="aviso erro" role="alert">{erro}</p>}
          <button className="botao primario" disabled={ocupado || !senha}>{criando ? "Criar senha" : "Entrar"}</button>
          {!criando && <button type="button" className="link esqueci" onClick={esqueci}>Esqueci a senha</button>}
        </form>
      </main>
    </div>
  );
}
