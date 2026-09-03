import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Account,
  bcryptHasher,
  verifyLogin,
  createAccount,
  loadAccountsFile,
  saveAccountsFile,
} from "./accounts.js";
import { signToken, verifyToken, TokenPayload } from "./token.js";
import { loadSave, writeSave } from "./saves.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8787);
const SECRET = process.env.JWT_SECRET ?? "change-me-in-production";
if (!process.env.JWT_SECRET) console.warn("[serveur] ⚠ JWT_SECRET non défini → secret par défaut utilisé. Définis JWT_SECRET en production.");
const DATA = path.join(__dirname, "data", "accounts.json");
const SAVES = path.join(__dirname, "data", "saves");
const nowSec = () => Math.floor(Date.now() / 1000);

let accounts: Account[] = loadAccountsFile(DATA);

const app = express();
app.use(express.json({ limit: "2mb" })); // les sauvegardes peuvent dépasser la limite par défaut (100kb)

app.post("/api/login", (req, res) => {
  const { username, password } = req.body ?? {};
  const a = verifyLogin(accounts, String(username ?? ""), String(password ?? ""), bcryptHasher);
  if (!a) return res.status(401).json({ error: "identifiants invalides" });
  res.json({ token: signToken({ user: a.username, role: "player" }, SECRET, nowSec()), username: a.username });
});

app.post("/api/register", (req, res) => {
  const user = String(req.body?.username ?? "").trim();
  const r = createAccount(accounts, user, String(req.body?.password ?? ""), bcryptHasher);
  if (!r.ok) return res.status(400).json({ error: r.error });
  accounts = r.accounts!;
  saveAccountsFile(DATA, accounts);
  res.json({ token: signToken({ user, role: "player" }, SECRET, nowSec()), username: user });
});

function bearer(req: express.Request): TokenPayload | null {
  const auth = req.headers.authorization ?? "";
  return verifyToken(auth.startsWith("Bearer ") ? auth.slice(7) : "", SECRET, nowSec());
}
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const p = bearer(req);
  if (!p) return res.status(401).json({ error: "non authentifié" });
  res.locals.user = p.user;
  next();
}

// — Sauvegarde du joueur courant —
app.get("/api/save", requireAuth, (_req, res) => res.json({ save: loadSave(SAVES, res.locals.user) }));
app.put("/api/save", requireAuth, (req, res) => {
  writeSave(SAVES, res.locals.user, req.body?.save ?? null);
  res.json({ ok: true });
});

const server = app.listen(PORT, () => console.log(`[serveur] http → http://localhost:${PORT}`));
server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.warn(`[serveur] ⚠ port ${PORT} déjà utilisé — un serveur tourne déjà. On garde l'existant (rien à faire).`);
    process.exit(0);
  }
  throw err;
});
