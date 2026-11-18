// Dados de exemplo e lista de competições.

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

// Preço de hoje, 0–100: vale também como chance implícita do time.
const PRECO_MOCK = {
  Palmeiras: 30, Flamengo: 28, Botafogo: 12, "Atlético-MG": 7, Cruzeiro: 5, Fortaleza: 3,
  "São Paulo": 3, Internacional: 2, Bahia: 2, Fluminense: 2, Corinthians: 2, Grêmio: 1,
  Vasco: 1, Bragantino: 1, Santos: 1, Mirassol: 1, Ceará: 0.5, Vitória: 0.5, Juventude: 0.5, Sport: 0.5,
};

// `chave` é o prefixo do localStorage. O Brasileirão 2026 segue em book:v2, onde as boletas já estão.
// Competição nova ganha chave própria.
export const COMPETICOES = [
  { id: "brasileirao-2026", nome: "Brasileirão 2026", detalhe: "Série A, 20 times", chave: "book:v2", mock: MOCK, precosMock: PRECO_MOCK },
];
