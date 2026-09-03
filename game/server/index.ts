import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Account,
  Role,
  bcryptHasher,
  seedAccounts,
  verifyLogin,
  createAccount,
  deleteAccount,
  setRole,
  setBanned,
  addSanction,
  isValidRole,
  loadAccountsFile,
  saveAccountsFile,
} from "./accounts.js";
import { signToken, verifyToken, TokenPayload } from "./token.js";
import { loadSave, writeSave, deleteSaveFile, listSaves } from "./saves.js";
import { validateCommand, validateState, validateEvent } from "../src/core/adminProtocol.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.ADMIN_PORT ?? 8787);
const SECRET = process.env.ADMIN_JWT_SECRET ?? "dev-secret-change-me";
if (!process.env.ADMIN_JWT_SECRET) console.warn("[admin] ⚠ ADMIN_JWT_SECRET non défini → secret de dev public utilisé. Local uniquement ; définis ADMIN_JWT_SECRET pour toute exposition.");
const DATA = path.join(__dirname, "data", "accounts.json");
const SAVES = path.join(__dirname, "data", "saves");
const nowSec = () => Math.floor(Date.now() / 1000);
const startedAt = Date.now();

let accounts: Account[] = seedAccounts(loadAccountsFile(DATA), bcryptHasher);
saveAccountsFile(DATA, accounts); // persiste le seed au 1er lancement

// — Connexions de jeu en direct (username → ws) —
const gameUser = new Map<WebSocket, string>();
const admins = new Set<WebSocket>();
const onlineUsers = () => [...new Set([...gameUser.values()])];
const gamesOf = (user: string) => [...gameUser.keys()].filter((ws) => gameUser.get(ws) === user);

const app = express();
app.use(express.json({ limit: "2mb" })); // les sauvegardes peuvent dépasser la limite par défaut (100kb)

app.post("/api/login", (req, res) => {
  const { username, password } = req.body ?? {};
  const a = verifyLogin(accounts, String(username ?? ""), String(password ?? ""), bcryptHasher);
  if (!a) return res.status(401).json({ error: "identifiants invalides" });
  if (a.banned) return res.status(403).json({ error: "compte banni" });
  res.json({ token: signToken({ user: a.username, role: a.role }, SECRET, nowSec()), role: a.role, username: a.username });
});

app.post("/api/register", (req, res) => {
  const user = String(req.body?.username ?? "").trim();
  const r = createAccount(accounts, user, String(req.body?.password ?? ""), "player", bcryptHasher);
  if (!r.ok) return res.status(400).json({ error: r.error });
  accounts = r.accounts!;
  saveAccountsFile(DATA, accounts);
  res.json({ token: signToken({ user, role: "player" }, SECRET, nowSec()), role: "player", username: user });
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
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const p = bearer(req);
  if (!p || p.role !== "admin") return res.status(403).json({ error: "réservé à l'admin" });
  res.locals.user = p.user; // l'admin qui agit (attribution des sanctions)
  next();
}
const persist = () => saveAccountsFile(DATA, accounts);
const accountExists = (user: string) => accounts.some((a) => a.username === user);

// — Sauvegarde du joueur courant —
app.get("/api/save", requireAuth, (_req, res) => res.json({ save: loadSave(SAVES, res.locals.user) }));
app.put("/api/save", requireAuth, (req, res) => {
  writeSave(SAVES, res.locals.user, req.body?.save ?? null);
  res.json({ ok: true });
});

// — Comptes (admin) —
app.get("/api/accounts", requireAdmin, (_req, res) => {
  const online = new Set(onlineUsers());
  res.json(accounts.map((a) => ({ username: a.username, role: a.role, banned: !!a.banned, online: online.has(a.username), sanctions: a.sanctions ?? [] })));
});
app.post("/api/accounts", requireAdmin, (req, res) => {
  const { username, password, role } = req.body ?? {};
  const r = createAccount(accounts, String(username ?? ""), String(password ?? ""), role as Role, bcryptHasher);
  if (!r.ok) return res.status(400).json({ error: r.error });
  accounts = r.accounts!;
  persist();
  res.json({ ok: true });
});
app.delete("/api/accounts/:user", requireAdmin, (req, res) => {
  const r = deleteAccount(accounts, req.params.user);
  if (!r.ok) return res.status(400).json({ error: r.error });
  accounts = r.accounts!;
  persist();
  deleteSaveFile(SAVES, req.params.user);
  res.json({ ok: true });
});
app.put("/api/players/:user/role", requireAdmin, (req, res) => {
  const role = String(req.body?.role ?? "");
  if (!isValidRole(role)) return res.status(400).json({ error: "rôle invalide" });
  const r = setRole(accounts, req.params.user, role);
  if (!r.ok) return res.status(400).json({ error: r.error });
  accounts = r.accounts!;
  persist();
  res.json({ ok: true });
});

// — Modération (admin) —
app.post("/api/players/:user/ban", requireAdmin, (req, res) => {
  const r = setBanned(accounts, req.params.user, true, res.locals.user ?? "admin", String(req.body?.reason ?? ""), Date.now());
  if (!r.ok) return res.status(400).json({ error: r.error });
  accounts = r.accounts!;
  persist();
  for (const ws of gamesOf(req.params.user)) ws.send(JSON.stringify({ kind: "kick", reason: "banni" })), ws.close();
  res.json({ ok: true });
});
app.post("/api/players/:user/unban", requireAdmin, (req, res) => {
  const r = setBanned(accounts, req.params.user, false, res.locals.user, String(req.body?.reason ?? ""), Date.now());
  if (!r.ok) return res.status(400).json({ error: r.error });
  accounts = r.accounts!;
  persist();
  res.json({ ok: true });
});
app.post("/api/players/:user/kick", requireAdmin, (req, res) => {
  if (!accountExists(req.params.user)) return res.status(400).json({ error: "compte introuvable" });
  const targets = gamesOf(req.params.user);
  for (const ws of targets) ws.send(JSON.stringify({ kind: "kick", reason: String(req.body?.reason ?? "") })), ws.close();
  accounts = addSanction(accounts, req.params.user, { type: "kick", by: res.locals.user, reason: String(req.body?.reason ?? ""), at: Date.now() });
  persist();
  res.json({ ok: true, kicked: targets.length });
});
app.post("/api/players/:user/warn", requireAdmin, (req, res) => {
  if (!accountExists(req.params.user)) return res.status(400).json({ error: "compte introuvable" });
  const message = String(req.body?.message ?? "Avertissement");
  for (const ws of gamesOf(req.params.user)) ws.send(JSON.stringify({ kind: "warn", message }));
  accounts = addSanction(accounts, req.params.user, { type: "warn", by: res.locals.user, reason: message, at: Date.now() });
  persist();
  res.json({ ok: true });
});

// — Édition de la sauvegarde d'un joueur (admin), même hors-ligne —
app.get("/api/players/:user/save", requireAdmin, (req, res) => res.json({ save: loadSave(SAVES, req.params.user) }));
app.put("/api/players/:user/save", requireAdmin, (req, res) => {
  writeSave(SAVES, req.params.user, req.body?.save ?? null);
  res.json({ ok: true });
});

// — Serveur / Économie / Stats (admin) —
app.get("/api/metrics", requireAdmin, (_req, res) => {
  const m = process.memoryUsage();
  res.json({ uptime: Math.floor((Date.now() - startedAt) / 1000), rssMB: Math.round(m.rss / 1048576), heapMB: Math.round(m.heapUsed / 1048576), online: onlineUsers().length, accounts: accounts.length, node: process.version });
});
app.get("/api/saves", requireAdmin, (_req, res) => res.json(listSaves(SAVES)));

// — Relais WebSocket —
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

function broadcastAdmins(obj: unknown) {
  const s = JSON.stringify(obj);
  for (const c of admins) if (c.readyState === WebSocket.OPEN) c.send(s);
}
function broadcastGames(obj: unknown) {
  const s = JSON.stringify(obj);
  for (const ws of gameUser.keys()) if (ws.readyState === WebSocket.OPEN) ws.send(s);
}
const announce = () => broadcastAdmins({ kind: "presence", game: gameUser.size > 0, users: onlineUsers() });

wss.on("connection", (ws) => {
  let role: "game" | "admin" | null = null;
  ws.on("message", (raw) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (role === null) {
      const p = verifyToken(String(msg.token ?? ""), SECRET, nowSec());
      const banned = p ? accounts.find((a) => a.username === p.user)?.banned : false;
      if (msg.role === "game" && p && !banned) {
        role = "game";
        gameUser.set(ws, p.user);
        announce();
      } else if (msg.role === "admin" && p && p.role === "admin") {
        role = "admin";
        admins.add(ws);
        ws.send(JSON.stringify({ kind: "presence", game: gameUser.size > 0, users: onlineUsers() }));
      } else {
        ws.send(JSON.stringify({ kind: "authfail" }));
        ws.close();
      }
      return;
    }
    if (role === "admin" && msg.kind === "cmd") {
      const cmd = validateCommand(msg.cmd);
      if (cmd) broadcastGames({ kind: "cmd", cmd });
    } else if (role === "game" && msg.kind === "state") {
      const state = validateState(msg.state);
      if (state) broadcastAdmins({ kind: "state", user: gameUser.get(ws), state });
    } else if (role === "game" && msg.kind === "event") {
      const event = validateEvent(msg.event);
      if (event) broadcastAdmins({ kind: "event", user: gameUser.get(ws), event, at: Date.now() });
    }
  });
  ws.on("close", () => {
    gameUser.delete(ws);
    admins.delete(ws);
    announce();
  });
});

// Port déjà pris (un serveur tourne déjà) → sortie propre, pas de stack trace.
wss.on("error", () => {});
server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.warn(`[admin] ⚠ port ${PORT} déjà utilisé — un serveur admin tourne déjà. On garde l'existant (rien à faire).`);
    process.exit(0);
  }
  throw err;
});

server.listen(PORT, () => console.log(`[admin] serveur http + ws → http://localhost:${PORT}`));
