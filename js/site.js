/* site.js — komponen bersama: Navbar, Footer, Cart, Wishlist, Search Overlay, Toast, ProductCard */
(() => {
  "use strict";
  const C = window.SITE_CONFIG || {};
  const BRAND = C.brandName || "Nama Brand";
  const MARK = (C.brandMark || BRAND.trim().charAt(0) || "B").toUpperCase();
  const $ = (s, r = document) => r.querySelector(s);   const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const rupiah = (n) => "Rp " + Number(n).toLocaleString("id-ID");
  const byId = (id) => (window.PRODUCTS || []).find((p) => p.id === id);

  const ls = {
    get(k, d) { try { return JSON.parse(localStorage.getItem("site_" + k)) ?? d; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem("site_" + k, JSON.stringify(v)); } catch (_) {} }
  };

  /* ---------- Cart & Wishlist (localStorage) ---------- */
  const Cart = {
    items: () => ls.get("cart", []),
    add(id, variant, qty = 1) {
      const items = Cart.items();
      const found = items.find((i) => i.id === id && i.variant === variant);
      if (found) found.qty += qty; else items.push({ id, variant, qty });
      ls.set("cart", items); syncCount(true);
    },
    count: () => Cart.items().reduce((a, i) => a + i.qty, 0)
  };

  const Wish = {
    ids: () => ls.get("wish", []),
    has: (id) => Wish.ids().includes(id),
    toggle(id) {
      const ids = Wish.ids(), i = ids.indexOf(id);
      i > -1 ? ids.splice(i, 1) : ids.push(id);
      ls.set("wish", ids);
      syncWishlistHeader();
      return i === -1;
    }
  };

function syncCount(animate) {
    const n = Cart.count();
    $$(".cart-count").forEach((el) => {
      el.textContent = n || ""; 
      el.dataset.n = n;
      if (animate) { 
        const b = el.closest(".icon-btn"); 
        if (b) { b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
      }
    });
  }

function syncWishlistHeader(animate = true) {
    const n = Wish.ids().length;
    $$(".wish-count").forEach((el) => {
      el.textContent = n || ""; 
      el.dataset.n = n;
      if (animate) {
        const b = el.closest(".icon-btn");
        if (b) {
          b.classList.remove("bump");
          void b.offsetWidth; // trigger reflow
          b.classList.add("bump");
        }
      }
    });
  }

  let toastTimer;
  function toast(msg) {
    $(".toast")?.remove();
    const t = document.createElement("div");
    t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
    document.body.appendChild(t);
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 2800);
  }

  /* ---------- Ikon SVG ---------- */
  const I = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
    bag: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>'
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;

  const FIREBASE_READY = !!(C.firebaseConfig && C.firebaseConfig.apiKey && !String(C.firebaseConfig.apiKey).includes("ISI_"));
  let fbAuth = null;
  if (window.firebase && FIREBASE_READY) {
    try { if (!firebase.apps.length) firebase.initializeApp(C.firebaseConfig); fbAuth = firebase.auth(); } catch (_) {}
  }
  function onAuthChange(cb) { if (fbAuth) fbAuth.onAuthStateChanged(cb); else cb(null); }

  /* ---------- Navbar ---------- */
const LINKS = [
  ["Beranda", "index.html", "beranda"], 
  ["Produk", "index.html#produk", "produk"],
  ["Cerita Kami", "index.html#cerita", "cerita"], 
  ["Packaging", "index.html#packaging", "packaging"],
  ["Lacak Pesanan", "lacak.html", "lacak"]
];

  function renderHeader() {
    const host = $("#site-header"); if (!host) return;
    const page = document.body.dataset.page;
    const links = LINKS.map(([t, h, k]) => `<li><a href="${h}"${k === page ? ' aria-current="page"' : ""}>${t}</a></li>`).join("");
    
    host.innerHTML = `
      <header class="nav" id="nav"><div class="wrap nav-in">
        <a class="logo" href="index.html"><span class="logo-mark" aria-hidden="true">${MARK}</span>${BRAND}</a>
        <nav aria-label="Menu utama"><ul class="nav-links">${links}</ul></nav>
        <div class="nav-actions">
          <button class="icon-btn hide-m" id="btnOpenSearch" aria-label="Cari produk">${svg("search")}</button>
          <a class="icon-btn hide-m" href="#" id="btnHeaderWish" aria-label="Wishlist">${svg("heart")}<span class="wish-count" data-n="0"></span></a>
          <a class="icon-btn" href="keranjang.html" aria-label="Keranjang belanja">${svg("bag")}<span class="cart-count" data-n="0"></span></a>
          <a class="icon-btn hide-m" href="login.html" id="userLink" aria-label="Masuk atau profil">${svg("user")}</a>
          <button class="icon-btn menu-btn" id="menuBtn" aria-label="Buka menu" aria-expanded="false" aria-controls="drawer">${svg("menu")}</button>
        </div>
      </div></header>
      <div class="drawer" id="drawer">
        <div class="drawer-bg" data-close></div>
        <div class="drawer-panel" role="dialog" aria-label="Menu">
          <button class="icon-btn drawer-close" data-close aria-label="Tutup menu">${svg("close")}</button>
          ${LINKS.map(([t, h]) => `<a href="${h}" data-close>${t}</a>`).join("")}
          <a href="login.html">Masuk / Daftar</a>
        </div>
      </div>`;

    const nav = $("#nav"), drawer = $("#drawer"), btn = $("#menuBtn");
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    
    const setDrawer = (open) => { drawer.classList.toggle("open", open); btn.setAttribute("aria-expanded", open); if (open) $(".drawer-close")?.focus(); else btn.focus({ preventScroll: true }); };     btn.addEventListener("click", () => setDrawer(true));     $$("[data-close]", drawer).forEach((el) => el.addEventListener("click", () => drawer.classList.contains("open") && setDrawer(false)));
    window.addEventListener("keydown", (e) => e.key === "Escape" && drawer.classList.contains("open") && setDrawer(false));

    // Event listener Search & Wishlist di Header
    $("#btnOpenSearch")?.addEventListener("click", openSearchModal);
    $("#btnHeaderWish")?.addEventListener("click", (e) => {
      e.preventDefault();
      openWishlistModal();
    });
  }

  /* ---------- POP-UP MODAL SEARCH ---------- */
  function openSearchModal() {
    let overlay = $("#searchOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "searchOverlay";
      overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(3px);display:flex;align-items:flex-start;justify-content:center;padding-top:70px;z-index:9999;animation:fadeIn .2s ease;";
      overlay.innerHTML = `
        <div style="background:#fff;padding:24px;border-radius:12px;width:90%;max-width:520px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);position:relative;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="font-size:1.1rem;margin:0;font-weight:600;">Cari Produk Stand</h3>
            <button id="closeSearch" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:#666;">✕</button>
          </div>
          <input type="text" id="searchInput" placeholder="Ketik nama produk..." style="width:100%;padding:12px;border:1px solid #ccc;border-radius:8px;font-size:1rem;outline:none;">
          <div id="searchResults" style="margin-top:16px;max-height:300px;overflow-y:auto;"></div>
        </div>
      `;
      document.body.appendChild(overlay);

      $("#closeSearch").onclick = () => overlay.style.display = "none";
      overlay.onclick = (e) => { if (e.target === overlay) overlay.style.display = "none"; };

      const input = $("#searchInput"), results = $("#searchResults");
      input.addEventListener("input", () => {
        const q = input.value.toLowerCase().trim();
        if (!q) { results.innerHTML = ""; return; }
        
        const products = window.PRODUCTS || [];
        const filtered = products.filter(p => p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q)));

        if (!filtered.length) {
          results.innerHTML = `<p style="font-size:0.9rem;color:#777;text-align:center;padding:12px 0;">Produk tidak ditemukan.</p>`;
          return;
        }

        results.innerHTML = filtered.map(p => `
          <a href="produk.html?produk=${p.slug || p.id}" style="display:flex;align-items:center;justify-content:space-between;padding:10px;border-bottom:1px solid #f0f0f0;text-decoration:none;color:inherit;border-radius:6px;transition:background .2s;">
            <div>
              <div style="font-weight:600;font-size:0.95rem;">${p.name}</div>
              <div style="font-size:0.8rem;color:#888;">${p.category || ''}</div>
            </div>
            <div style="font-weight:600;color:var(--primary, #000);">${rupiah(p.price)}</div>
          </a>
        `).join("");
      });
    }

    overlay.style.display = "flex";
    $("#searchInput")?.focus();
  }

  /* ---------- POP-UP MODAL WISHLIST (LOVE) ---------- */
  function openWishlistModal() {
    const wishList = Wish.ids();
    const products = window.PRODUCTS || [];
    const favProducts = products.filter(p => wishList.includes(p.id));

    let overlay = $("#wishlistOverlay");
    if (overlay) overlay.remove();

    overlay = document.createElement("div");
    overlay.id = "wishlistOverlay";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(3px);display:flex;align-items:flex-start;justify-content:center;padding-top:70px;z-index:9999;";
    
    let contentHtml = "";
    if (!favProducts.length) {
      contentHtml = `<p style="font-size:0.9rem;color:#777;text-align:center;padding:20px 0;">Belum ada produk favorit tersimpan.<br>Klik ikon Love (♥️) pada produk untuk menyimpannya.</p>`;
    } else {
      contentHtml = favProducts.map(p => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee;">
          <div>
            <a href="produk.html?produk=${p.slug || p.id}" style="font-weight:600;text-decoration:none;color:inherit;">${p.name}</a>
            <div style="font-size:0.85rem;color:var(--primary, #000);">${rupiah(p.price)}</div>
          </div>
          <button class="btn btn-outline" data-wish-remove="${p.id}" style="padding:4px 8px;font-size:0.75rem;">Hapus</button>
        </div>
      `).join("");
    }

    overlay.innerHTML = `
      <div style="background:#fff;padding:24px;border-radius:12px;width:90%;max-width:480px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="font-size:1.1rem;margin:0;font-weight:600;">Wishlist Favorit Kamu ❤️</h3>
          <button id="closeWishlist" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:#666;">✕</button>
        </div>
        <div style="max-height:300px;overflow-y:auto;">${contentHtml}</div>
      </div>
    `;
    document.body.appendChild(overlay);

    $("#closeWishlist").onclick = () => overlay.remove();     overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };      $$("[data-wish-remove]", overlay).forEach(btn => {
      btn.addEventListener("click", () => {
        Wish.toggle(btn.dataset.wishRemove);
        openWishlistModal(); // Render ulang isi modal
      });
    });
  }

 /* ---------- Footer ---------- */
  function renderFooter() {
    const host = $("#site-footer"); if (!host) return;
    const contact = C.contact || {};
    host.innerHTML = `
      <footer class="footer" id="tentang"><div class="wrap">
        <div class="footer-grid">
          <div>
            <a class="logo" href="index.html" style="color:inherit"><span class="logo-mark" aria-hidden="true">${MARK}</span>${BRAND}</a>
            <p style="margin-top:14px;max-width:22rem;color:var(--on-dark-muted)">${C.footerText || "Baso Aci Rawit khas Bandung dengan racikan rempah autentik."}</p>
          </div>
          <div><h3>Belanja</h3><ul><li><a href="produk.html">Semua produk</a></li><li><a href="keranjang.html">Keranjang</a></li></ul></div>
          <div><h3>Brand</h3><ul><li><a href="index.html#cerita">Cerita kami</a></li><li><a href="index.html#packaging">Packaging</a></li></ul></div>
          <div>
            <h3>Kontak & Lokasi</h3>
            <ul>
              <li>${contact.address || "ULBI, Bandung"}</li>
              <li>WA: ${contact.whatsapp || "085122110471"}</li>
              <li>Email: ${contact.email || "abinggg0409@gmail.com"}</li>
            </ul>
          </div>
        </div>
        <p class="footer-note">© ${new Date().getFullYear()} ${BRAND}. All rights reserved.</p>
      </div></footer>`;
  }

  /* ---------- Kartu Produk ---------- */
  function productCard(p) {
    const img = p.image ? `<img src="${p.image}" alt="${p.name}" loading="lazy">` : `<div class="ph" role="img" aria-label="Foto ${p.name} belum tersedia"><span>Foto produk</span></div>`;
    const badge = p.badges && p.badges[0] ? `<span class="badge">${p.badges[0]}</span>` : "";
    const sample = p.sample ? `<span class="badge sample">Contoh</span>` : "";
    const old = p.originalPrice ? ` <s class="muted" style="font-weight:400;font-size:.875rem">${rupiah(p.originalPrice)}</s>` : "";
    const rating = p.rating ? `${p.rating.toFixed(1)}` : "Belum ada ulasan";
    return `<article class="pcard">
      <div class="pcard-img">${img}${badge}${sample}
        <button class="wish" data-wish="${p.id}" aria-pressed="${Wish.has(p.id)}" aria-label="Simpan ${p.name} ke wishlist">${svg("heart")}</button></div>
      <div class="pcard-body">
        <span class="pcard-cat">${p.category}</span>
        <h3 class="pcard-name"><a href="produk.html?produk=${p.slug || p.id}" style="text-decoration:none">${p.name}</a></h3>
        <p class="pcard-desc">${p.shortDescription}</p>
        <span class="pcard-cat">${rating}</span>
        <div class="pcard-foot"><span class="price">${rupiah(p.price)}${old}</span>
          <button class="btn btn-primary" data-add="${p.id}">Tambah</button></div>
      </div></article>`;
  }

  /* ---------- Aksi Global (Delegasi Event) ---------- */
  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      const p = byId(add.dataset.add); if (!p) return;
      const sel = add.closest("[data-product]")?.querySelector("[data-variant].on");
      Cart.add(p.id, sel ? sel.dataset.variant : (p.variants ? p.variants[0] : "Reguler"), 1);
      toast(`${p.name} masuk keranjang`);
      const old = add.textContent; add.textContent = "Ditambahkan"; add.classList.add("added");
      setTimeout(() => { add.textContent = old; add.classList.remove("added"); }, 1400);
    }
    const w = e.target.closest("[data-wish]");
    if (w) {
      const on = Wish.toggle(w.dataset.wish);
      $$(`[data-wish="${w.dataset.wish}"]`).forEach((b) => b.setAttribute("aria-pressed", on));
      toast(on ? "Disimpan ke wishlist" : "Dihapus dari wishlist");
    }
    const v = e.target.closest("[data-variant]");
    if (v) { $$("[data-variant]", v.parentElement).forEach((b) => { b.classList.toggle("on", b === v); b.setAttribute("aria-pressed", b === v); }); }
  });

/* ---------- Helper Cek Status Login (Firebase / LocalStorage) ---------- */
function isUserLoggedIn() {
  // Cek jika ada session firebase
  if (fbAuth && fbAuth.currentUser) return true;
  // Cek alternatif jika menggunakan localStorage (misal site_user atau user)
  const localUser = ls.get("user", null) || localStorage.getItem("user");
  return !!localUser;
}

function syncUserLink() {
  const link = $("#userLink");
  if (!link) return;
  
  if (isUserLoggedIn()) {
    link.href = "akun.html";
  } else {
    link.href = "login.html";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderHeader(); 
  renderFooter(); 
  syncCount(false); 
  syncWishlistHeader(false);

  // Sync link user saat pertama load
  syncUserLink();

  // Sync ulang jika state Firebase Auth berubah
  onAuthChange((user) => {
    syncUserLink();
  });

  document.dispatchEvent(new Event("site:ready"));
});

  window.Site = { Cart, Wish, toast, productCard, rupiah, byId, BRAND, onAuthChange };
})();