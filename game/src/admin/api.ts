import { login as sharedLogin, AuthResult } from "../shared/authApi";

export type Session = AuthResult;
export const login = sharedLogin; // mutualisé avec le jeu (un seul login)

export interface Sanction {
  type: "ban" | "unban" | "warn" | "kick";
  by: string;
  reason: string;
  at: number;
}
export interface AccountInfo {
  username: string;
  role: string;
  banned: boolean;
  online: boolean;
  sanctions: Sanction[];
}
export interface Metrics {
  uptime: number;
  rssMB: number;
  heapMB: number;
  online: number;
  accounts: number;
  node: string;
}
export interface SaveSummary {
  user: string;
  size: number;
  mtime: number;
  gold: number;
  level: number;
}

async function req<T = unknown>(token: string, path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { ...opts, headers: { ...(opts.headers ?? {}), Authorization: `Bearer ${token}` } });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Erreur ${res.status}`);
  return body;
}
const jsonBody = (data: unknown): RequestInit => ({ headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
const enc = encodeURIComponent;

export const listAccounts = (t: string) => req<AccountInfo[]>(t, "/api/accounts");
export const createAccount = (t: string, username: string, password: string, role: string) => req(t, "/api/accounts", { method: "POST", ...jsonBody({ username, password, role }) });
export const deleteAccount = (t: string, user: string) => req(t, `/api/accounts/${enc(user)}`, { method: "DELETE" });
export const setRole = (t: string, user: string, role: string) => req(t, `/api/players/${enc(user)}/role`, { method: "PUT", ...jsonBody({ role }) });
export const banUser = (t: string, user: string, reason: string) => req(t, `/api/players/${enc(user)}/ban`, { method: "POST", ...jsonBody({ reason }) });
export const unbanUser = (t: string, user: string) => req(t, `/api/players/${enc(user)}/unban`, { method: "POST" });
export const kickUser = (t: string, user: string, reason: string) => req(t, `/api/players/${enc(user)}/kick`, { method: "POST", ...jsonBody({ reason }) });
export const warnUser = (t: string, user: string, message: string) => req(t, `/api/players/${enc(user)}/warn`, { method: "POST", ...jsonBody({ message }) });
export const getMetrics = (t: string) => req<Metrics>(t, "/api/metrics");
export const listSaves = (t: string) => req<SaveSummary[]>(t, "/api/saves");
export const getPlayerSave = (t: string, user: string) => req<{ save: unknown }>(t, `/api/players/${enc(user)}/save`);
export const putPlayerSave = (t: string, user: string, save: unknown) => req(t, `/api/players/${enc(user)}/save`, { method: "PUT", ...jsonBody({ save }) });
