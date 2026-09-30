/* ==========================================================
   auth.js — halaman masuk / daftar, pakai FIREBASE AUTHENTICATION.
   Butuh js/config.js diisi firebaseConfig sebelum ini berfungsi.
   Firebase SDK (compat) dimuat lewat <script> di login.html.
   ========================================================== */
(() => {
  "use strict";

  const C = Object.assign({
    brandName: "Nama Brand", brandMark: "", statement: "", story: "",
    heroImage: "", heroImageAlt: "", heroPlaceholderText: "",
    redirectAfterLogin: "", firebaseConfig: null
  }, window.SITE_CONFIG || {});

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const FIREBASE_READY = !!(C.firebaseConfig && C.firebaseConfig.apiKey && !String(C.firebaseConfig.apiKey).includes("ISI_"));

  let auth = null;
  if (window.firebase && FIREBASE_READY) {
    try {
      if (!firebase.apps.length) firebase.initializeApp(C.firebaseConfig);
      auth = firebase.auth();
    } catch (err) { console.error("Firebase init gagal:", err); }
  }

  /* ---------------- Brand & visual ---------------- */
  function applyBrand() {
    $$("[data-brand-name]").forEach((el) => (el.textContent = C.brandName));
    const mark = (C.brandMark || C.brandName.trim().charAt(0) || "B").toUpperCase();
    $$("[data-brand-mark]").forEach((el) => (el.textContent = mark));
    $$("[data-statement]").forEach((el) => (el.textContent = C.statement));
    $$("[data-story]").forEach((el) => (el.textContent = C.story));

    const inner = $("#archInner");
    if (C.heroImage) {
      const probe = new Image();
      probe.onload = () => { inner.style.backgroundImage = `url("${C.heroImage}")`; inner.classList.add("has-image"); };
      probe.src = C.heroImage;
      inner.setAttribute("aria-label", C.heroImageAlt || "Gambar brand");
    } else {
      inner.setAttribute("aria-label", "Area foto produk (belum diisi)");
      const hint = $("[data-hero-hint]");
      if (hint && C.heroPlaceholderText) hint.textContent = C.heroPlaceholderText;
    }
    const note = $("#demoNote");
    if (!FIREBASE_READY) {
      note.hidden = false;
      note.textContent = "Firebase belum dikonfigurasi: isi firebaseConfig di js/config.js agar login benar-benar aktif.";
    } else {
      note.hidden = true;
    }
  }

  function drawContours() {
    const svg = $("#contours");
    const cx = 560, cy = 780, rings = 15; let out = "";
    for (let i = 0; i < rings; i++) {
      const base = 70 + i * 48, pts = [];
      for (let a = 0; a <= 120; a++) {
        const t = (a / 120) * Math.PI * 2;
        const wob = Math.sin(t * 3 + i * 0.7) * 14 + Math.sin(t * 5 - i * 0.4) * 7 + Math.cos(t * 2 + i) * 10;
        const r = base + wob;
        pts.push(`${(cx + Math.cos(t) * r * 1.15).toFixed(1)},${(cy + Math.sin(t) * r * 0.9).toFixed(1)}`);
      }
      out += `<path d="M${pts.join("L")}Z"/>`;
    }
    svg.innerHTML = out;
  }

  /* ---------------- AuthService (Firebase) ---------------- */
  const FRIENDLY = {
    "auth/email-already-in-use": "Email ini sudah terdaftar. Masuk dengan email tersebut, atau gunakan email lain.",
    "auth/invalid-email": "Format email belum benar.",
    "auth/weak-password": "Kata sandi terlalu lemah, gunakan minimal 8 karakter.",
    "auth/user-not-found": "Email atau kata sandi tidak cocok. Periksa lagi, atau atur ulang kata sandi.",
    "auth/wrong-password": "Email atau kata sandi tidak cocok. Periksa lagi, atau atur ulang kata sandi.",
    "auth/invalid-credential": "Email atau kata sandi tidak cocok. Periksa lagi, atau atur ulang kata sandi.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi beberapa saat.",
    "auth/network-request-failed": "Gangguan koneksi. Periksa internetmu dan coba lagi.",
    "auth/configuration-not-found": "Login Email/Password belum diaktifkan di Firebase Console (Authentication > Sign-in method).",
    "not-configured": "Firebase belum dikonfigurasi. Isi firebaseConfig di js/config.js terlebih dulu.",
    "default": "Terjadi kendala saat memproses. Coba lagi beberapa saat."
  };

  const AuthService = {
    async register({ name, email, phone, password }) {
      if (!auth) throw { code: "not-configured" };
      const cred = await auth.createUserWithEmailAndPassword(email.trim(), password);
      await cred.user.updateProfile({ displayName: name.trim() });
      if (phone) { try { localStorage.setItem("profile_phone_" + cred.user.uid, phone); } catch (_) {} }
      return { name: name.trim(), email: cred.user.email };
    },
    async login({ email, password, remember }) {
      if (!auth) throw { code: "not-configured" };
      await auth.setPersistence(remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);
      const cred = await auth.signInWithEmailAndPassword(email.trim(), password);
      return { name: cred.user.displayName || cred.user.email.split("@")[0], email: cred.user.email };
    },
    async requestReset({ email }) {
      if (!auth) throw { code: "not-configured" };
      await auth.sendPasswordResetEmail(email.trim());
      return { ok: true };
    },
    logout() { if (auth) auth.signOut(); },
    current() {
      const u = auth && auth.currentUser;
      return u ? { name: u.displayName || u.email.split("@")[0], email: u.email } : null;
    }
  };

  /* ---------------- Validasi ---------------- */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_RE = /^(\+62|62|0)8\d{7,12}$/;
  const RULES = {
    "name": (v) => (v.trim().length < 2 ? "Nama lengkap minimal 2 karakter." : ""),
    "email": (v) => !v.trim() ? "Email wajib diisi." : !EMAIL_RE.test(v.trim()) ? "Format email belum benar. Contoh: nama@email.com." : "",
    "phone": (v) => (v && !PHONE_RE.test(v.replace(/[\s-]/g, "")) ? "Nomor belum benar. Contoh: 08123456789." : ""),
    "required-password": (v) => (!v ? "Kata sandi wajib diisi." : ""),
    "new-password": (v) => !v ? "Kata sandi wajib diisi." : v.length < 8 ? "Kata sandi minimal 8 karakter." : "",
    "confirm": (v, form) => !v ? "Ulangi kata sandi untuk memastikan tidak salah ketik." : v !== form.elements.password.value ? "Kata sandi tidak sama. Periksa lagi." : "",
    "terms": (v, form, el) => (!el.checked ? "Centang persetujuan untuk melanjutkan." : "")
  };
  function errorEl(input) { return document.getElementById(`${input.id}-error`); }
  function setError(input, message) {
    const el = errorEl(input); if (!el) return;
    if (message) {
      el.textContent = message; el.hidden = false; input.setAttribute("aria-invalid", "true");
      const ids = new Set((input.getAttribute("aria-describedby") || "").split(" ").filter(Boolean));
      ids.add(el.id); input.setAttribute("aria-describedby", Array.from(ids).join(" "));
    } else { el.hidden = true; el.textContent = ""; input.removeAttribute("aria-invalid"); }
  }
  function validateField(input) { const rule = RULES[input.dataset.rule]; if (!rule) return true; const msg = rule(input.value, input.form, input); setError(input, msg); return !msg; }
  function validateForm(form) {
    let firstBad = null;
    $$("[data-rule]", form).forEach((input) => { if (!validateField(input) && !firstBad) firstBad = input; });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }
  function wireLiveValidation(form) {
    $$("[data-rule]", form).forEach((input) => {
      const evt = input.type === "checkbox" ? "change" : "blur";
      input.addEventListener(evt, () => { if (input.value || input.checked || input.dataset.touched) validateField(input); input.dataset.touched = "1"; });
      input.addEventListener(input.type === "checkbox" ? "change" : "input", () => {
        if (input.hasAttribute("aria-invalid")) validateField(input);
        if (input.name === "password" && form.elements.confirm && form.elements.confirm.value) validateField(form.elements.confirm);
      });
    });
  }

  function formAlert(form, message, type = "error") {
    const el = $(".form-alert", form);
    el.textContent = message; el.hidden = false; el.classList.toggle("ok", type === "ok"); el.classList.remove("shake");
    if (type === "error") { void el.offsetWidth; el.classList.add("shake"); }
  }
  function clearAlert(form) { const el = $(".form-alert", form); el.hidden = true; el.textContent = ""; }
  function setLoading(form, on) {
    const btn = $('button[type="submit"]', form); const text = $(".btn-text", btn);
    btn.disabled = on; btn.setAttribute("aria-busy", on ? "true" : "false");
    text.textContent = on ? "Memproses…" : btn.dataset.label;
    $$("input", form).forEach((i) => (i.readOnly = on));
  }
  let toastTimer;
  function toast(message) {
    const el = $("#toast"); el.textContent = message; el.hidden = false;
    el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.hidden = true), 3800);
  }

  const HASH = { login: "masuk", register: "daftar", forgot: "lupa-sandi", success: "akun" };
  const TITLE = { login: "Masuk", register: "Daftar", forgot: "Atur ulang kata sandi", success: "Akun" };
  const views = $$(".view");
  let current = "login";
  function show(name, { focus = true } = {}) {
    current = name;
    views.forEach((v) => {
      const on = v.dataset.view === name; v.hidden = !on;
      if (on) { v.classList.remove("enter"); void v.offsetWidth; v.classList.add("enter"); }
    });
    document.title = `${TITLE[name]} · ${C.brandName}`;
    try { history.replaceState(null, "", `#${HASH[name]}`); } catch (_) {}
    if (focus) {
      const view = $(`.view[data-view="${name}"]`);
      const target = $("[data-autofocus]", view) || $("h1", view);
      if (target) target.focus({ preventScroll: false });
    }
  }
  function viewFromHash() { const h = location.hash.replace("#", ""); return Object.keys(HASH).find((k) => HASH[k] === h) || "login"; }
  function showSuccess(session, { fresh = false } = {}) {
    $("#successName").textContent = session.name.split(" ")[0];
    $("#successText").textContent = fresh ? "Kamu berhasil masuk." : "Kamu sudah masuk di perangkat ini.";
    const go = $("#successGo"), note = $("#successNote");
    if (C.redirectAfterLogin) { go.href = C.redirectAfterLogin; go.hidden = false; note.hidden = true; }
    else { go.hidden = true; note.hidden = false; }
    show("success");
    if (fresh && C.redirectAfterLogin) setTimeout(() => (location.href = C.redirectAfterLogin), 1000);
  }

  const STRENGTH_LABEL = ["Gunakan kombinasi huruf besar, kecil, angka, dan simbol.", "Lemah. Tambah panjang dan variasi karakter.", "Cukup. Tambahkan angka atau simbol.", "Baik. Sedikit lagi untuk sangat kuat.", "Kuat."];
  function strengthLevel(p) {
    if (!p) return 0; let s = 0;
    if (p.length >= 8) s++; if (p.length >= 12) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
    if (p.length < 8) return 1; return Math.max(1, Math.min(4, s));
  }
  function updateStrength(value) { const lvl = strengthLevel(value); $("#strength").dataset.level = lvl; $("#strength-text").textContent = STRENGTH_LABEL[lvl]; }

  function init() {
    applyBrand(); drawContours();
    $$("[data-goto]").forEach((b) => b.addEventListener("click", () => show(b.dataset.goto)));
    $("[data-home]").addEventListener("click", (e) => e.preventDefault());
    window.addEventListener("hashchange", () => { const v = viewFromHash(); if (v !== current) show(v, { focus: false }); });

    $$(".pw-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const input = $("input", btn.parentElement); const reveal = input.type === "password";
        input.type = reveal ? "text" : "password"; btn.setAttribute("aria-pressed", String(reveal));
        btn.setAttribute("aria-label", reveal ? "Sembunyikan kata sandi" : "Tampilkan kata sandi");
      });
    });

    const formLogin = $("#form-login"), formReg = $("#form-register"), formForgot = $("#form-forgot");
    [formLogin, formReg, formForgot].forEach(wireLiveValidation);
    formReg.elements.password.addEventListener("input", (e) => updateStrength(e.target.value));

    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault(); clearAlert(formLogin);
      if (!validateForm(formLogin)) return;
      setLoading(formLogin, true);
      try {
        const session = await AuthService.login({ email: formLogin.elements.email.value, password: formLogin.elements.password.value, remember: formLogin.elements.remember.checked });
        formLogin.elements.password.value = ""; setLoading(formLogin, false); showSuccess(session, { fresh: true });
      } catch (err) {
        setLoading(formLogin, false);
        formAlert(formLogin, FRIENDLY[err.code] || FRIENDLY.default);
        formLogin.elements.password.focus();
      }
    });

    formReg.addEventListener("submit", async (e) => {
      e.preventDefault(); clearAlert(formReg);
      if (!validateForm(formReg)) return;
      setLoading(formReg, true);
      try {
        const session = await AuthService.register({ name: formReg.elements.name.value, email: formReg.elements.email.value, phone: formReg.elements.phone.value.trim(), password: formReg.elements.password.value });
        formReg.reset(); updateStrength(""); setLoading(formReg, false);
        toast("Akun berhasil dibuat."); showSuccess(session, { fresh: true });
      } catch (err) {
        setLoading(formReg, false);
        formAlert(formReg, FRIENDLY[err.code] || FRIENDLY.default);
        if (err.code === "auth/email-already-in-use") { setError(formReg.elements.email, "Email ini sudah dipakai."); formReg.elements.email.focus(); }
      }
    });

    formForgot.addEventListener("submit", async (e) => {
      e.preventDefault(); clearAlert(formForgot);
      if (!validateForm(formForgot)) return;
      setLoading(formForgot, true);
      try {
        await AuthService.requestReset({ email: formForgot.elements.email.value });
        setLoading(formForgot, false);
        formAlert(formForgot, "Jika email terdaftar, tautan pengaturan ulang sudah dikirim. Cek kotak masuk dan folder spam.", "ok");
      } catch (err) {
        setLoading(formForgot, false);
        formAlert(formForgot, FRIENDLY[err.code] || FRIENDLY.default);
      }
    });

    $("#btn-logout").addEventListener("click", () => { AuthService.logout(); toast("Kamu sudah keluar."); show("login"); });

    const start = viewFromHash();
    if (!auth) { show(start === "success" ? "login" : start, { focus: false }); return; }
    auth.onAuthStateChanged((user) => {
      if (user && (start === "login" || start === "success")) showSuccess({ name: user.displayName || user.email.split("@")[0], email: user.email });
      else if (!document.hidden) show(start === "success" ? "login" : start, { focus: false });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();