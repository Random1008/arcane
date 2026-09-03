import { login, register } from "../../shared/authApi";
import { saveToken } from "../../shared/authStore";

let injected = false;
function injectStyle(): void {
  if (injected) return;
  injected = true;
  const s = document.createElement("style");
  s.textContent = `
    #sp-gate{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;
      background:radial-gradient(circle at 50% 30%,#1a1430,#06060c);font:14px system-ui,sans-serif;color:#e6e2f0}
    #sp-gate .box{background:#14141f;border:1px solid #3a2a55;border-radius:12px;padding:26px;width:320px;box-shadow:0 10px 40px #0008}
    #sp-gate h1{font-size:20px;margin:0 0 4px} #sp-gate .sub{color:#9a8ab8;margin-bottom:16px;font-size:13px}
    #sp-gate input{width:100%;box-sizing:border-box;margin:6px 0;background:#0d0d18;color:#e6e2f0;border:1px solid #3a3a55;border-radius:6px;padding:9px 10px;font:14px monospace}
    #sp-gate .rmb{display:flex;align-items:center;gap:6px;color:#aab;margin:8px 0;font-size:13px}
    #sp-gate .rmb input{width:auto;margin:0}
    #sp-gate button{width:100%;margin:5px 0;padding:9px;border-radius:6px;cursor:pointer;border:1px solid #5a3a6a;font:14px sans-serif}
    #sp-gate .primary{background:#5a2a8a;color:#fff;border-color:#7a4aaa}
    #sp-gate .link{background:none;border:none;color:#b48aff;text-decoration:underline;cursor:pointer;font:13px sans-serif;width:auto;padding:4px 0;margin:6px 0 0}
    #sp-gate .err{color:#ff8a8a;min-height:18px;margin-top:8px;font-size:13px}
  `;
  document.head.appendChild(s);
}

/** Porte de connexion obligatoire. Deux vues (connexion / inscription). Résout une fois authentifié. */
export function showLoginGate(initialMessage = ""): Promise<void> {
  injectStyle();
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.id = "sp-gate";
    document.body.appendChild(overlay);

    const finish = (token: string, user: string, remember: boolean) => {
      saveToken(token, user, remember);
      overlay.remove();
      resolve();
    };

    const renderLogin = (msg = "") => {
      overlay.innerHTML = `
        <div class="box">
          <h1>⚔️ Roguelite</h1>
          <div class="sub">Connecte-toi pour jouer.</div>
          <input id="g-user" placeholder="identifiant" autocomplete="username" />
          <input id="g-pass" type="password" placeholder="mot de passe" autocomplete="current-password" />
          <label class="rmb"><input id="g-remember" type="checkbox" /> Rester connecté</label>
          <button class="primary" id="g-login">Se connecter</button>
          <button class="link" id="g-to-register">Pas encore de compte ? Créer un compte →</button>
          <div class="err" id="g-err"></div>
        </div>`;
      const user = overlay.querySelector<HTMLInputElement>("#g-user")!;
      const pass = overlay.querySelector<HTMLInputElement>("#g-pass")!;
      const remember = overlay.querySelector<HTMLInputElement>("#g-remember")!;
      const err = overlay.querySelector<HTMLDivElement>("#g-err")!;
      err.textContent = msg;
      const submit = async () => {
        if (!user.value.trim() || !pass.value) {
          err.textContent = "✗ Identifiant et mot de passe requis.";
          return;
        }
        err.textContent = "…";
        try {
          const r = await login(user.value.trim(), pass.value);
          finish(r.token, r.username, remember.checked);
        } catch (e) {
          err.textContent = "✗ " + (e as Error).message;
        }
      };
      overlay.querySelector<HTMLButtonElement>("#g-login")!.onclick = submit;
      overlay.querySelector<HTMLButtonElement>("#g-to-register")!.onclick = () => renderRegister();
      pass.onkeydown = (e) => {
        if (e.key === "Enter") submit();
      };
      user.focus();
    };

    const renderRegister = (msg = "") => {
      overlay.innerHTML = `
        <div class="box">
          <h1>⚔️ Créer un compte</h1>
          <div class="sub">Choisis un identifiant et un mot de passe.</div>
          <input id="r-user" placeholder="identifiant" autocomplete="username" />
          <input id="r-pass" type="password" placeholder="mot de passe" autocomplete="new-password" />
          <input id="r-pass2" type="password" placeholder="confirme le mot de passe" autocomplete="new-password" />
          <label class="rmb"><input id="r-remember" type="checkbox" /> Rester connecté</label>
          <button class="primary" id="r-create">Créer le compte</button>
          <button class="link" id="r-to-login">← J'ai déjà un compte</button>
          <div class="err" id="r-err"></div>
        </div>`;
      const user = overlay.querySelector<HTMLInputElement>("#r-user")!;
      const pass = overlay.querySelector<HTMLInputElement>("#r-pass")!;
      const pass2 = overlay.querySelector<HTMLInputElement>("#r-pass2")!;
      const remember = overlay.querySelector<HTMLInputElement>("#r-remember")!;
      const err = overlay.querySelector<HTMLDivElement>("#r-err")!;
      err.textContent = msg;
      const submit = async () => {
        if (!user.value.trim() || !pass.value) {
          err.textContent = "✗ Identifiant et mot de passe requis.";
          return;
        }
        if (pass.value !== pass2.value) {
          err.textContent = "✗ Les mots de passe ne correspondent pas.";
          return;
        }
        err.textContent = "…";
        try {
          const r = await register(user.value.trim(), pass.value);
          finish(r.token, r.username, remember.checked);
        } catch (e) {
          err.textContent = "✗ " + (e as Error).message;
        }
      };
      overlay.querySelector<HTMLButtonElement>("#r-create")!.onclick = submit;
      overlay.querySelector<HTMLButtonElement>("#r-to-login")!.onclick = () => renderLogin();
      pass2.onkeydown = (e) => {
        if (e.key === "Enter") submit();
      };
      user.focus();
    };

    renderLogin(initialMessage);
  });
}
