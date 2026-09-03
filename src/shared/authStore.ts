/**
 * Stockage du jeton d'authentification du joueur.
 * « rester connecté » coché → localStorage (persiste) ; sinon sessionStorage (le temps de la session).
 */
const TKEY = "sp-auth-token";
const UKEY = "sp-auth-user";

export function saveToken(token: string, user: string, remember: boolean): void {
  clearToken();
  const store = remember ? localStorage : sessionStorage;
  store.setItem(TKEY, token);
  store.setItem(UKEY, user);
}

export function getToken(): string | null {
  return localStorage.getItem(TKEY) ?? sessionStorage.getItem(TKEY);
}

export function getUser(): string | null {
  return localStorage.getItem(UKEY) ?? sessionStorage.getItem(UKEY);
}

export function clearToken(): void {
  localStorage.removeItem(TKEY);
  sessionStorage.removeItem(TKEY);
  localStorage.removeItem(UKEY);
  sessionStorage.removeItem(UKEY);
}
