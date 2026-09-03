/** Appels d'authentification partagés (jeu + admin). Proxifiés par Vite vers le backend :8787. */

export interface AuthResult {
  token: string;
  role: string;
  username: string;
}

const DOWN = "Serveur injoignable — lance « npm run dev » (le serveur démarre avec).";

async function post(path: string, body: unknown): Promise<AuthResult> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error(DOWN);
  }
  if (res.status >= 500) throw new Error(DOWN);
  const data = (await res.json().catch(() => ({}))) as AuthResult & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
  return data;
}

export const login = (username: string, password: string): Promise<AuthResult> => post("/api/login", { username, password });
export const register = (username: string, password: string): Promise<AuthResult> => post("/api/register", { username, password });
