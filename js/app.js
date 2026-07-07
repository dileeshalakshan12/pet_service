/* ===========================================================
   app.js — shared chrome: header, footer, theme, mobile nav,
   toasts, modals, scroll reveal. Loaded on every page.
   =========================================================== */

(function(){
  const NS = window.PAWSTOP = window.PAWSTOP || {};

  /* ---------------- theme ---------------- */
  function initTheme(){
    const saved = localStorage.getItem('pw_theme');
    const theme = saved || 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }
  function toggleTheme(){
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('pw_theme', next);
  }
  initTheme();

  /* ---------------- header / footer templates ---------------- */
  function headerHTML(active, base){
    base = base || '';
    const session = NS.api.getUser();
    const dashHref = session ? (session.role === 'admin' ? base+'admin.html' : session.role === 'provider' ? base+'dashboard/provider.html' : base+'dashboard/customer.html') : base+'login.html';
    const links = [
      ['Home', base+'index.html', 'home'],
      ['Services', base+'services.html', 'services'],
      ['Providers', base+'providers.html', 'providers'],
      ['Blog', base+'blog.html#', 'blog'],
      ['Pricing', base+'pricing.html#', 'pricing'],
      ['Contact', base+'contact.html#', 'contact']
    ];
    const navLinks = links.map(([label,href,key]) =>
      `<a href="${href}" class="${key===active?'active':''}">${label}</a>`).join('');

    const rightAuth = session
      ? `<a href="${dashHref}" class="icon-btn" title="Dashboard">🐾</a>
         <button class="icon-btn" id="notifBtn" title="Notifications">🔔<span class="badge-dot" id="notifDot" style="display:none"></span></button>
         <a href="${dashHref}" class="btn btn-primary btn-sm">Dashboard</a>`
      : `<a href="${base}login.html" class="btn btn-ghost btn-sm">Log in</a>
         <a href="${base}register.html" class="btn btn-primary btn-sm">Sign up</a>`;

    return `
    <header class="site-header">
      <div class="container header-inner">
        <a href="${base}index.html" class="brand"><span class="brand-mark">P</span>Pawstop</a>
        <nav class="nav-links">${navLinks}</nav>
        <div class="nav-actions">
          <button class="theme-toggle" id="themeToggle" aria-label="Toggle dark mode"><span class="knob">${document.documentElement.getAttribute('data-theme')==='dark'?'🌙':'☀️'}</span></button>
          ${rightAuth}
          <button class="icon-btn mobile-toggle" id="mobileToggle" aria-label="Menu">☰</button>
        </div>
      </div>
      <div class="mobile-menu" id="mobileMenu">
        ${links.map(([label,href]) => `<a href="${href}">${label}</a>`).join('')}
        ${session ? `<a href="${dashHref}">Dashboard</a><a href="#" id="mobileLogout">Log out</a>` : `<a href="${base}login.html">Log in</a><a href="${base}register.html">Sign up</a>`}
      </div>
    </header>`;
  }

  function footerHTML(base){
    base = base || '';
    return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <a href="${base}index.html" class="brand" style="color:var(--paper)"><span class="brand-mark">P</span>Pawstop</a>
            <p style="color:var(--paper); opacity:.7; margin-top:14px; max-width:260px;">The marketplace for trusted pet care — grooming, vets, sitting, walking and more, all in one place.</p>
          </div>
          <div><h4>Explore</h4>
            <a href="${base}services.html">Services</a>
            <a href="${base}providers.html">Providers</a>
            <a href="${base}blog.html">Blog</a>
            <a href="${base}pricing.html">Pricing</a>
          </div>
          <div><h4>Company</h4>
            <a href="${base}about.html">About</a>
            <a href="${base}contact.html">Contact</a>
            <a href="${base}faq.html">FAQ</a>
          </div>
          <div><h4>For Providers</h4>
            <a href="${base}register.html">Join as a provider</a>
            <a href="${base}dashboard/provider.html">Provider dashboard</a>
          </div>
          <div><h4>Account</h4>
            <a href="${base}login.html">Log in</a>
            <a href="${base}register.html">Sign up</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} Pawstop. All rights reserved.</span>
          <span>Made for pets and the people who love them.</span>
        </div>
      </div>
    </footer>
    <div class="toast-stack" id="toastStack"></div>`;
  }

  function mountChrome(active, base){
    const hMount = document.getElementById('headerMount');
    const fMount = document.getElementById('footerMount');
    if (hMount) hMount.innerHTML = headerHTML(active, base);
    if (fMount) fMount.innerHTML = footerHTML(base);

    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.addEventListener('click', () => {
      toggleTheme();
      themeBtn.querySelector('.knob').textContent = document.documentElement.getAttribute('data-theme')==='dark' ? '🌙' : '☀️';
    });

    const mobileToggle = document.getElementById('mobileToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileToggle) mobileToggle.addEventListener('click', () => mobileMenu.classList.toggle('open'));

    const mobileLogout = document.getElementById('mobileLogout');
    if (mobileLogout) mobileLogout.addEventListener('click', (e) => { e.preventDefault(); NS.api.clearSession(); location.href = (base||'')+'index.html'; });

    const notifBtn = document.getElementById('notifBtn');
    if (notifBtn) notifBtn.addEventListener('click', () => location.href = (base||'')+'dashboard/customer.html?tab=notifications');

    const session = NS.api.getUser();
    if (session && session.role !== 'admin' && NS.db){
      const dot = document.getElementById('notifDot');
      const unread = NS.db.get('notifications').filter(n => n.userId === session.id && !n.read);
      if (dot && unread.length) dot.style.display = 'block';
    }
  }

  /* ---------------- toasts ---------------- */
  function toast(message, type){
    let stack = document.getElementById('toastStack');
    if (!stack){
      stack = document.createElement('div'); stack.id = 'toastStack'; stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const el = document.createElement('div');
    el.className = `toast ${type||'success'}`;
    el.innerHTML = `<span>${type==='error'?'⚠️':'✅'}</span><span>${message}</span>`;
    stack.appendChild(el);
    setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(30px)'; el.style.transition='.3s'; setTimeout(()=>el.remove(), 300); }, 3200);
  }

  /* ---------------- modal helpers ---------------- */
  function openModal(id){ const m = document.getElementById(id); if(m) m.classList.add('open'); }
  function closeModal(id){ const m = document.getElementById(id); if(m) m.classList.remove('open'); }

  /* ---------------- scroll reveal ---------------- */
  function initReveal(){
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach(el => obs.observe(el));
  }

  /* ---------------- rating stars render ---------------- */
  function starString(rating){
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(5-full);
  }

  /* ---------------- page loader ---------------- */
  window.addEventListener('DOMContentLoaded', () => {
    initReveal();
    const loader = document.getElementById('pageLoader');
    if (loader) setTimeout(() => { loader.style.opacity='0'; setTimeout(()=>loader.remove(), 400); }, 350);
  });

  NS.ui = { mountChrome, toast, openModal, closeModal, starString, initReveal };
})();
