import { describe, it, expect, beforeEach } from "vitest";
import { saveToken, getToken, getUser, clearToken } from "../src/shared/authStore";

function makeStore(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() {
      return m.size;
    },
  } as Storage;
}

describe("authStore (rester connecté)", () => {
  beforeEach(() => {
    (globalThis as { localStorage: Storage }).localStorage = makeStore();
    (globalThis as { sessionStorage: Storage }).sessionStorage = makeStore();
  });

  it("rester connecté coché → localStorage (persiste)", () => {
    saveToken("tok", "alice", true);
    expect(localStorage.getItem("sp-auth-token")).toBe("tok");
    expect(sessionStorage.getItem("sp-auth-token")).toBe(null);
    expect(getToken()).toBe("tok");
    expect(getUser()).toBe("alice");
  });

  it("décoché → sessionStorage (le temps de la session)", () => {
    saveToken("t2", "bob", false);
    expect(sessionStorage.getItem("sp-auth-token")).toBe("t2");
    expect(localStorage.getItem("sp-auth-token")).toBe(null);
    expect(getToken()).toBe("t2");
  });

  it("clearToken vide les deux stockages", () => {
    saveToken("t", "u", true);
    clearToken();
    expect(getToken()).toBe(null);
    expect(getUser()).toBe(null);
  });
});
