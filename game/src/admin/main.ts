import { AdminCommand, GameState } from "../core/adminProtocol";
import {
  login,
  listAccounts,
  createAccount,
  deleteAccount,
  setRole,
  banUser,
  unbanUser,
  kickUser,
  warnUser,
  getMetrics,
  listSaves,
  Session,
  AccountInfo,
} from "./api";
import { REF_GROUPS, COMMANDS_DOC } from "./refdata";

const root = document.getElementById("admin")!;
const SKEY = "sp-admin-session";

let session: Session | null = JSON.parse(localStorage.getItem(SKEY) ?? sessionStorage.getItem(SKEY) ?? "null");
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let gamePresent = false;
let onlineSet = new Set<string>();
let lastState: GameState | null = null;
const eventLog: { user?: string; type: string; msg: string; at: number }[] = [];
let eventFeedEl: HTMLElement | null = null;
let presenceEl: HTMLElement | null = null;
let stateEl: HTMLElement | null = null;
let logEl: HTMLElement | null = null;
let currentPage = "players";

// ————— styles —————
const style = document.createElement("style");
style.textContent = `
  :root{color-scheme:dark}
  body{margin:0;background:#0b0b14;color:#e6e2f0;font:14px/1.5 system-ui,sans-serif}
  .app{display:flex;min-height:100vh}
  .side{width:210px;flex:0 0 210px;background:#100a1c;border-right:1px solid #2a2a40;padding:10px;box-sizing:border-box}
  .side h2{font-size:14px;color:#cf9aff;margin:6px 8px 10px}
  .nav{display:flex;flex-direction:column;gap:2px}
  .nav button{text-align:left;background:none;border:none;color:#cbd;border-radius:6px;padding:8px 10px;cursor:pointer;font:13px system-ui}
  .nav button:hover{background:#1c1430} .nav button.active{background:#5a2a8a;color:#fff}
  .main{flex:1;min-width:0;padding:16px 20px}
  .hd{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
  h1{font-size:18px;margin:0} h3{font-size:14px;color:#cf9aff;margin:14px 0 6px}
  .card{background:#14141f;border:1px solid #2a2a40;border-radius:10px;padding:14px;margin:10px 0}
  .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0}
  label{color:#9aa} input,select{background:#0d0d18;color:#e6e2f0;border:1px solid #3a3a55;border-radius:6px;padding:6px 8px;font:13px monospace}
  input[type=number]{width:110px}
  button.b{background:#2a1a3a;color:#e6d8f0;border:1px solid #5a3a6a;border-radius:6px;padding:5px 10px;cursor:pointer;font:13px system-ui}
  button.b:hover{background:#3a2550} button.b.primary{background:#5a2a8a;border-color:#7a4aaa} button.b.danger{background:#5a1a1a;border-color:#8a3a3a}
  table{width:100%;border-collapse:collapse;font-size:13px} td,th{text-align:left;padding:5px 8px;border-bottom:1px solid #232336;vertical-align:middle}
  th{color:#9aa;font-weight:600}
  .pill{display:inline-block;padding:1px 7px;border-radius:9px;font-size:11px} .on{background:#1a4a2a;color:#9fe} .off{background:#3a2030;color:#caa} .ban{background:#5a1a1a;color:#fbb}
  .muted{color:#7a7a92;font-size:12px} .log{color:#b59ad0;min-height:16px;font:12px monospace;margin-top:8px}
  .feed{font:12px monospace;max-height:60vh;overflow:auto;background:#0d0d18;border:1px solid #232336;border-radius:6px;padding:8px}
  .feed div{padding:1px 0;border-bottom:1px solid #181826}
  .na{color:#caa;background:#2a2030;border:1px dashed #5a4a3a;border-radius:6px;padding:8px;font-size:12px;margin:6px 0}
`;
document.head.appendChild(style);
document.title = "Console d'administration — Roguelite";

// ————— DOM helpers —————
function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, kids: (Node | string)[] = []): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  for (const c of kids) e.append(c);
  return e;
}
function button(label: string, onClick: () => void, cls = ""): HTMLButtonElement {
  const b = el("button", { class: ("b " + cls).trim() }, [label]);
  b.onclick = onClick;
  return b;
}
function num(value: number, w = "110px"): HTMLInputElement {
  const i = el("input", { type: "number", value: String(value) });
  i.style.width = w;
  return i;
}
const tok = () => session!.token;

// ————— WebSocket (présence + état + événements) —————
function sendCmd(cmd: AdminCommand): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) return setLog("⚠ pas connecté");
  if (!gamePresent) setLog("⚠ aucun jeu connecté — commande ignorée");
  else setLog(`→ ${cmd.cat}.${"action" in cmd ? cmd.action : (cmd as { key: string }).key}`);
  socket.send(JSON.stringify({ kind: "cmd", cmd }));
}
function setLog(m: string): void {
  if (logEl) logEl.textContent = m;
}
function connectWs(token: string): void {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  socket = new WebSocket(`${proto}://${location.host}/ws`);
  socket.onopen = () => {
    socket!.send(JSON.stringify({ role: "admin", token }));
    updatePresence();
  };
  socket.onmessage = (ev) => {
    let m: { kind?: string; game?: boolean; users?: string[]; state?: GameState; user?: string; event?: { type: string; msg: string }; at?: number };
    try {
      m = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (m.kind === "authfail") return logout();
    if (m.kind === "presence") {
      gamePresent = !!m.game;
      onlineSet = new Set(m.users ?? []);
      updatePresence();
    } else if (m.kind === "state" && m.state) {
      lastState = m.state;
      renderState();
    } else if (m.kind === "event" && m.event) {
      const e = { user: m.user, type: m.event.type, msg: m.event.msg, at: m.at ?? 0 };
      eventLog.unshift(e);
      if (eventLog.length > 200) eventLog.pop();
      if (eventFeedEl) eventFeedEl.prepend(feedLine(e));
    }
  };
  socket.onclose = () => {
    gamePresent = false;
    updatePresence();
    if (session) reconnectTimer = setTimeout(() => connectWs(token), 2000);
  };
}
function updatePresence(): void {
  if (!presenceEl) return;
  const srv = socket?.readyState === WebSocket.OPEN;
  presenceEl.innerHTML = "";
  presenceEl.append(
    el("span", { class: `pill ${srv ? "on" : "off"}` }, [srv ? "serveur ✓" : "serveur ✗"]),
    el("span", { class: `pill ${gamePresent ? "on" : "off"}` }, [gamePresent ? `${onlineSet.size} en ligne` : "aucun jeu"]),
  );
}
function renderState(): void {
  if (!stateEl) return;
  const s = lastState;
  stateEl.textContent = s
    ? `Or ${s.gold} · Niv ${s.level} · ${s.className ?? "sans classe"} · PV ${Math.round(s.hp)}/${s.maxHp} · pts ${s.statPoints}/${s.skillPoints} · Ω ${s.omganium} · ${s.biome}${s.godMode ? " · godmode" : ""}`
    : "en attente d'un jeu connecté…";
}
function feedLine(e: { user?: string; type: string; msg: string }): HTMLElement {
  return el("div", {}, [`[${e.type}] ${e.user ?? "?"} — ${e.msg}`]);
}

// ————— Login —————
function renderLogin(): void {
  root.innerHTML = "";
  const user = el("input", { placeholder: "identifiant", value: "admin" });
  const pass = el("input", { type: "password", placeholder: "mot de passe" });
  const remember = el("input", { type: "checkbox" }) as HTMLInputElement;
  const err = el("div", { class: "log" });
  const submit = async () => {
    err.textContent = "";
    try {
      session = await login(user.value.trim(), pass.value);
      (remember.checked ? localStorage : sessionStorage).setItem(SKEY, JSON.stringify(session));
      renderDashboard();
    } catch (e) {
      err.textContent = "✗ " + (e as Error).message;
    }
  };
  pass.onkeydown = (e) => {
    if (e.key === "Enter") submit();
  };
  root.append(
    el("div", { style: "max-width:360px;margin:60px auto" }, [
      el("div", { class: "card" }, [
        el("h1", {}, ["🛠️ Console d'administration"]),
        el("div", { class: "muted" }, ["Compte par défaut : admin / admin1234"]),
        el("div", { class: "row" }, [el("label", {}, ["Identifiant"]), user]),
        el("div", { class: "row" }, [el("label", {}, ["Mot de passe"]), pass]),
        el("div", { class: "row" }, [remember, el("label", {}, ["Rester connecté"])]),
        el("div", { class: "row" }, [button("Se connecter", submit, "primary")]),
        err,
      ]),
    ]),
  );
}
function logout(): void {
  session = null;
  localStorage.removeItem(SKEY);
  sessionStorage.removeItem(SKEY);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  socket?.close();
  socket = null;
  renderLogin();
}

// ————— Pages —————
const TUNING_CTRLS = [
  { key: "move.maxSpeed", label: "Vitesse", def: 220 },
  { key: "move.accel", label: "Accélération", def: 2000 },
  { key: "melee.damage", label: "Dégâts mêlée", def: 20 },
  { key: "ranged.damage", label: "Dégâts tir", def: 14 },
  { key: "dash.distance", label: "Distance dash", def: 160 },
  { key: "blink.range", label: "Portée blink", def: 160 },
];
const FLAG_CTRLS = ["godMode", "showHitboxes", "showVelocity", "showFps"];

interface AccountsTable {
  element: HTMLElement;
  refresh: () => void;
}
function accountsTable(): AccountsTable {
  const box = el("div", {}, [el("div", { class: "muted" }, ["Chargement…"])]);
  const search = el("input", { placeholder: "rechercher un joueur…" }); // persistant entre rafraîchissements
  let all: AccountInfo[] = [];
  const refresh = () => {
    listAccounts(tok())
      .then((l) => {
        all = l;
        draw();
      })
      .catch((e) => {
        box.innerHTML = "";
        box.append(el("div", { class: "log" }, ["✗ " + (e as Error).message]));
      });
  };
  const draw = () => {
    const q = search.value.toLowerCase();
    const list = all.filter((a) => a.username.toLowerCase().includes(q));
    const t = el("table", {}, [el("tr", {}, [el("th", {}, ["Joueur"]), el("th", {}, ["Rôle"]), el("th", {}, ["État"]), el("th", {}, ["Sanctions"]), el("th", {}, ["Actions"])])]);
    for (const a of list) {
      const roleSel = el("select", {}, ["player", "operator", "admin"].map((r) => el("option", r === a.role ? { value: r, selected: "1" } : { value: r }, [r]))) as HTMLSelectElement;
      roleSel.onchange = async () => {
        try {
          await setRole(tok(), a.username, roleSel.value);
        } catch (e) {
          setLog("✗ " + (e as Error).message);
        }
        refresh(); // resynchronise (réussite ou échec → le select reflète l'état réel)
      };
      const act = (label: string, fn: () => Promise<unknown>, cls = "") =>
        button(label, async () => {
          try {
            await fn();
          } catch (e) {
            setLog("✗ " + (e as Error).message);
          }
          refresh();
        }, cls);
      const actions = el("div", { class: "row" }, [
        act("Warn", () => warnUser(tok(), a.username, prompt("Message d'avertissement :") ?? "Avertissement")),
        act("Kick", () => kickUser(tok(), a.username, "")),
        a.banned ? act("Débannir", () => unbanUser(tok(), a.username)) : act("Bannir", () => banUser(tok(), a.username, prompt("Raison du ban :") ?? ""), "danger"),
        act("Suppr.", () => (confirm(`Supprimer ${a.username} ?`) ? deleteAccount(tok(), a.username) : Promise.resolve()), "danger"),
      ]);
      t.append(
        el("tr", {}, [
          el("td", {}, [a.username]),
          el("td", {}, [roleSel]),
          el("td", {}, [a.online ? el("span", { class: "pill on" }, ["en ligne"]) : el("span", { class: "pill off" }, ["hors-ligne"]), a.banned ? el("span", { class: "pill ban" }, ["banni"]) : document.createTextNode("")]),
          el("td", {}, [String(a.sanctions?.length ?? 0)]),
          el("td", {}, [actions]),
        ]),
      );
    }
    box.innerHTML = "";
    box.append(t);
  };
  search.oninput = draw;
  refresh();
  return { element: el("div", {}, [el("div", { class: "row" }, [search, button("Rafraîchir", refresh)]), box]), refresh };
}

function liveEdit(): HTMLElement {
  const give = (action: "giveGold" | "grantLevels" | "giveStatPoints" | "giveSkillPoints", label: string, def: number) => {
    const i = num(def);
    return el("div", { class: "row" }, [el("label", {}, [label]), i, button("Donner", () => sendCmd({ cat: "player", action, value: Number(i.value) || 0 }))]);
  };
  return el("div", { class: "card" }, [
    el("h3", {}, ["Joueur connecté (édition en direct)"]),
    el("div", { class: "muted" }, ["Agit sur le joueur actuellement connecté."]),
    give("giveGold", "Or", 1000),
    give("grantLevels", "Niveaux", 1),
    give("giveStatPoints", "Pts stat", 5),
    give("giveSkillPoints", "Pts comp.", 3),
    el("div", { class: "row" }, [button("Soin", () => sendCmd({ cat: "player", action: "heal" })), button("Godmode ON", () => sendCmd({ cat: "player", action: "godmodeOn" })), button("Godmode OFF", () => sendCmd({ cat: "player", action: "godmodeOff" })), button("Tout l'arbre", () => sendCmd({ cat: "player", action: "unlockAllSkills" }))]),
  ]);
}

function createAccountForm(reload: () => void): HTMLElement {
  const u = el("input", { placeholder: "identifiant (a-z 0-9 _ -)" });
  const p = el("input", { type: "password", placeholder: "mot de passe" });
  const r = el("select", {}, ["player", "operator", "admin"].map((x) => el("option", { value: x }, [x]))) as HTMLSelectElement;
  const create = button("Créer le compte", async () => {
    try {
      await createAccount(tok(), u.value.trim(), p.value, r.value);
      u.value = "";
      p.value = "";
      setLog("✓ compte créé");
      reload();
    } catch (e) {
      setLog("✗ " + (e as Error).message);
    }
  }, "primary");
  return el("div", { class: "card" }, [el("h3", {}, ["Créer un compte"]), el("div", { class: "row" }, [u, p, r, create])]);
}

function pagePlayers(): HTMLElement {
  const t = accountsTable();
  return el("div", {}, [
    el("div", { class: "card" }, [el("h3", {}, ["Comptes"]), t.element]),
    createAccountForm(t.refresh),
    liveEdit(),
    el("div", { class: "na" }, ["Édition d'un joueur hors-ligne : via l'API /api/players/:user/save. « Plusieurs joueurs connectés » : avec le multijoueur (tranche K)."]),
  ]);
}

function pageModeration(): HTMLElement {
  const feed = el("div", { class: "feed" });
  eventFeedEl = feed;
  for (const e of eventLog) feed.append(feedLine(e));
  const warnBox = el("div", { class: "row" }, [
    el("label", {}, ["Avertir"]),
    button("Avertir un joueur en ligne", async () => {
      const targets = [...onlineSet]; // lu au clic (état en direct, pas un instantané)
      if (!targets.length) return setLog("aucun joueur en ligne");
      const u = targets.length === 1 ? targets[0] : prompt(`Quel joueur ? (${targets.join(", ")})`) ?? "";
      if (!u) return;
      try {
        await warnUser(tok(), u, prompt("Message :") ?? "Avertissement");
        setLog("✓ averti");
      } catch (e) {
        setLog("✗ " + (e as Error).message);
      }
    }),
  ]);
  return el("div", {}, [
    el("div", { class: "card" }, [el("h3", {}, ["Actions rapides (joueur connecté)"]), el("div", { class: "row" }, [button("Soin / revive", () => sendCmd({ cat: "player", action: "heal" })), button("Godmode ON", () => sendCmd({ cat: "player", action: "godmodeOn" })), button("Godmode OFF", () => sendCmd({ cat: "player", action: "godmodeOff" })), button("Tuer ennemis", () => sendCmd({ cat: "combat", action: "killAll" }))]), warnBox]),
    el("div", { class: "na" }, ["Spectate / freeze : nécessitent le multijoueur (tranche K). Alertes anti-triche : à construire."]),
    el("div", { class: "card" }, [el("h3", {}, ["Logs en direct"]), feed]),
  ]);
}

function pageServer(): HTMLElement {
  const wrap = el("div", {});
  const metricsCard = el("div", { class: "card" }, [el("div", { class: "muted" }, ["Chargement…"])]);
  const savesCard = el("div", { class: "card" }, [el("div", { class: "muted" }, ["Chargement…"])]);
  const refresh = async () => {
    try {
      const m = await getMetrics(tok());
      metricsCard.innerHTML = "";
      metricsCard.append(el("h3", {}, ["État du serveur"]), el("div", {}, [`Uptime : ${m.uptime}s · RAM : ${m.rssMB} Mo (heap ${m.heapMB}) · En ligne : ${m.online} · Comptes : ${m.accounts} · Node ${m.node}`]), button("Rafraîchir", () => void refresh()));
      const saves = await listSaves(tok());
      const t = el("table", {}, [el("tr", {}, [el("th", {}, ["Compte"]), el("th", {}, ["Niv"]), el("th", {}, ["Or"]), el("th", {}, ["Taille"])])]);
      for (const s of saves) t.append(el("tr", {}, [el("td", {}, [s.user]), el("td", {}, [String(s.level)]), el("td", {}, [String(s.gold)]), el("td", {}, [`${(s.size / 1024).toFixed(1)} ko`])]));
      savesCard.innerHTML = "";
      savesCard.append(el("h3", {}, ["Sauvegardes"]), t);
    } catch (e) {
      metricsCard.innerHTML = "";
      metricsCard.append(el("div", { class: "log" }, ["✗ " + (e as Error).message]));
    }
  };
  void refresh();
  wrap.append(metricsCard, savesCard, el("div", { class: "na" }, ["Redémarrage à distance non disponible en local (relance « npm run server »). Crash logs : voir la console du serveur."]));
  return wrap;
}

function balanceRow(key: string, label: string, def: number, step = 0.5): HTMLElement {
  const i = num(def, "120px");
  i.step = String(step);
  return el("div", { class: "row" }, [el("label", {}, [label]), i, button("Appliquer", () => sendCmd({ cat: "balance", key, value: Number(i.value) }))]);
}

function pageEconomy(): HTMLElement {
  const total = el("div", { class: "muted" }, ["Chargement de l'or en circulation…"]);
  listSaves(tok())
    .then((s) => (total.textContent = `Or total en circulation : ${s.reduce((a, b) => a + b.gold, 0)} (sur ${s.length} compte(s))`))
    .catch(() => (total.textContent = "—"));
  return el("div", {}, [
    el("div", { class: "card" }, [el("h3", {}, ["Or en circulation"]), total]),
    el("div", { class: "card" }, [el("h3", {}, ["Prix & récompenses"]), balanceRow("shopPriceMult", "× Prix boutique", 1), balanceRow("goldMult", "× Or gagné", 1), balanceRow("dropChance", "Proba drop arme", 0.35, 0.05), balanceRow("omganiumMult", "× Omganium", 1)]),
    el("div", { class: "na" }, ["Logs de transactions : à construire."]),
  ]);
}

function pageGameplay(): HTMLElement {
  const tuning = TUNING_CTRLS.map((c) => {
    const i = num(c.def, "120px");
    return el("div", { class: "row" }, [el("label", {}, [c.label]), i, button("Appliquer", () => sendCmd({ cat: "tuning", key: c.key, value: Number(i.value) || 0 }))]);
  });
  const flags = FLAG_CTRLS.map((k) => el("div", { class: "row" }, [el("label", {}, [k]), button("ON", () => sendCmd({ cat: "flag", key: k, value: true })), button("OFF", () => sendCmd({ cat: "flag", key: k, value: false }))]));
  return el("div", {}, [
    el("div", { class: "card" }, [el("h3", {}, ["Réglages de jeu (tuning)"]), ...tuning]),
    el("div", { class: "card" }, [el("h3", {}, ["Difficulté & progression"]), balanceRow("enemyHpMult", "× PV ennemis", 1), balanceRow("enemyDamageMult", "× Dégâts ennemis", 1), balanceRow("xpMult", "× XP gagnée", 1)]),
    el("div", { class: "card" }, [el("h3", {}, ["Drapeaux"]), ...flags]),
    el("div", { class: "na" }, ["Loot tables / classes : voir la page « IDs de référence » (édition fine à venir). Jobs RP : non applicable."]),
  ]);
}

function pagePermissions(): HTMLElement {
  const t = accountsTable();
  return el("div", {}, [
    el("div", { class: "card" }, [el("h3", {}, ["Rôles des comptes"]), el("div", { class: "muted" }, ["admin = tout · operator = pilotage du jeu · player = joueur"]), t.element]),
    el("div", { class: "na" }, ["Groupes de permissions personnalisés : à construire."]),
  ]);
}

function pageLogs(): HTMLElement {
  const feed = el("div", { class: "feed" });
  eventFeedEl = feed;
  for (const e of eventLog) feed.append(feedLine(e));
  return el("div", {}, [
    el("div", { class: "card" }, [el("h3", {}, ["Journal d'événements en direct"]), el("div", { class: "muted" }, ["Zones visitées, morts, etc. (depuis le client de jeu connecté)."]), feed]),
    el("div", { class: "na" }, ["Logs chat/économie/staff persistés : à construire."]),
  ]);
}

function pageContent(): HTMLElement {
  const want = new Set(["Armes", "Armures — pièces (emplacement × type)", "Armures — pièces de set Ω", "Sets Ω", "Biomes", "Boss", "Ennemis nommés (par biome)"]);
  const groups = REF_GROUPS.filter((g) => want.has(g.title));
  return el("div", {}, [
    ...groups.map((g) => el("div", { class: "card" }, [el("h3", {}, [g.title]), el("table", {}, g.rows.map((r) => el("tr", {}, [el("td", { style: "color:#9ad" }, [r.id]), el("td", {}, [r.info])])))])),
    el("div", { class: "na" }, ["Maps / skins / scripts-plugins : non applicables à ce jeu."]),
  ]);
}

function pageStats(): HTMLElement {
  const wrap = el("div", { class: "card" }, [el("div", { class: "muted" }, ["Chargement…"])]);
  Promise.all([listAccounts(tok()), listSaves(tok())])
    .then(([accs, saves]) => {
      const byRole = (r: string) => accs.filter((a) => a.role === r).length;
      const totalGold = saves.reduce((a, b) => a + b.gold, 0);
      wrap.innerHTML = "";
      wrap.append(
        el("h3", {}, ["Statistiques"]),
        el("div", {}, [`Comptes : ${accs.length} (admin ${byRole("admin")} · operator ${byRole("operator")} · player ${byRole("player")})`]),
        el("div", {}, [`En ligne : ${onlineSet.size}`]),
        el("div", {}, [`Sauvegardes : ${saves.length} · Or total : ${totalGold}`]),
      );
    })
    .catch((e) => {
      wrap.innerHTML = "";
      wrap.append(el("div", { class: "log" }, ["✗ " + (e as Error).message]));
    });
  return el("div", {}, [wrap, el("div", { class: "na" }, ["Pics de connexion / temps de session / activité par zone : à tracker (et multijoueur pour l'activité par zone)."])]);
}

function pageIds(): HTMLElement {
  const search = el("input", { placeholder: "filtrer par id ou nom…" });
  const out = el("div", {});
  const draw = () => {
    const q = search.value.toLowerCase();
    out.innerHTML = "";
    for (const g of REF_GROUPS) {
      const rows = g.rows.filter((r) => r.id.toLowerCase().includes(q) || r.info.toLowerCase().includes(q));
      if (!rows.length) continue;
      out.append(el("div", { class: "card" }, [el("h3", {}, [`${g.title} (${rows.length})`]), el("table", {}, rows.map((r) => el("tr", {}, [el("td", { style: "color:#9ad" }, [r.id]), el("td", {}, [r.info])])))]));
    }
  };
  search.oninput = draw;
  draw();
  return el("div", {}, [el("div", { class: "row" }, [search]), out]);
}

function pageCommands(): HTMLElement {
  const t = el("table", {}, [el("tr", {}, [el("th", {}, ["Catégorie"]), el("th", {}, ["Commande"]), el("th", {}, ["Effet"])])]);
  for (const c of COMMANDS_DOC) t.append(el("tr", {}, [el("td", {}, [c.cat]), el("td", { style: "color:#9ad" }, [c.cmd]), el("td", {}, [c.effet])]));
  return el("div", { class: "card" }, [el("h3", {}, ["Commandes admin & effets"]), t]);
}

const PAGES: { id: string; label: string; build: () => HTMLElement }[] = [
  { id: "players", label: "👥 Gestion des joueurs", build: pagePlayers },
  { id: "moderation", label: "🛡️ Modération", build: pageModeration },
  { id: "server", label: "🖥️ Serveur", build: pageServer },
  { id: "economy", label: "💰 Économie", build: pageEconomy },
  { id: "gameplay", label: "🎮 Gameplay", build: pageGameplay },
  { id: "permissions", label: "🔑 Permissions", build: pagePermissions },
  { id: "logs", label: "📜 Logs & historique", build: pageLogs },
  { id: "content", label: "📦 Contenu", build: pageContent },
  { id: "stats", label: "📊 Statistiques", build: pageStats },
  { id: "ids", label: "🆔 IDs de référence", build: pageIds },
  { id: "commands", label: "⌨️ Commandes", build: pageCommands },
];

function renderDashboard(): void {
  root.innerHTML = "";
  logEl = el("div", { class: "log" });
  stateEl = el("div", { class: "muted" }, ["en attente d'un jeu connecté…"]);
  presenceEl = el("div", { class: "row" });
  const content = el("div", {});
  const nav = el("div", { class: "nav" });
  const showPage = (id: string) => {
    currentPage = id;
    eventFeedEl = null;
    [...nav.children].forEach((c) => (c as HTMLElement).classList.toggle("active", (c as HTMLElement).dataset.id === id));
    content.innerHTML = "";
    content.append(PAGES.find((p) => p.id === id)!.build());
    renderState();
  };
  for (const p of PAGES) {
    const b = button(p.label, () => showPage(p.id));
    b.className = "";
    b.dataset.id = p.id;
    nav.append(b);
  }
  root.append(
    el("div", { class: "app" }, [
      el("div", { class: "side" }, [el("h2", {}, [`🛠️ Admin — ${session?.username}`]), nav, button("Déconnexion", logout, "danger")]),
      el("div", { class: "main" }, [
        el("div", { class: "hd" }, [el("h1", {}, ["Console d'administration"]), presenceEl, el("span", { class: "muted" }, ["État : "]), stateEl]),
        logEl,
        content,
      ]),
    ]),
  );
  updatePresence();
  connectWs(session!.token);
  showPage(currentPage);
}

// ————— démarrage —————
if (session) renderDashboard();
else renderLogin();
