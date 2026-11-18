// node src/senha.check.js — trava a senha do aparelho.
import assert from "node:assert/strict";
import { conferir, criarRegistro } from "./senha.js";

const r = await criarRegistro("tomei200");
assert.ok(!JSON.stringify(r).includes("tomei200"), "a senha nunca é guardada");
assert.equal(await conferir("tomei200", r), true);
assert.equal(await conferir("tomei201", r), false);
assert.equal(await conferir("", r), false);
assert.equal(await conferir("tomei200", null), false, "sem registro não abre");
const r2 = await criarRegistro("tomei200");
assert.notEqual(r2.hash, r.hash, "sal novo a cada senha");

console.log("senha ok");
