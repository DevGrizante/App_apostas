// Senha do aparelho, criada no primeiro acesso (decisão de 18/11/2026).
// Só o hash PBKDF2 fica guardado, nunca a senha. Ela tranca a tela; as boletas não são cifradas,
// então quem abrir as ferramentas do navegador no aparelho ainda lê o localStorage.

const ITER = 210000;
export const SENHA_MIN = 4;

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** crypto.subtle só existe em contexto seguro (https ou localhost). */
export const temCripto = () => !!globalThis.crypto?.subtle;

async function derivar(senha, sal, iter) {
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: iter }, chave, 256);
  return b64(bits);
}

export async function criarRegistro(senha) {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  return { v: 1, iter: ITER, sal: b64(sal), hash: await derivar(senha, sal, ITER) };
}

export async function conferir(senha, registro) {
  if (!registro?.sal || !registro?.hash) return false;
  return (await derivar(senha, deB64(registro.sal), registro.iter ?? ITER)) === registro.hash;
}
