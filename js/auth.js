/* ===========================================================
   auth.js — login / register form validation & session handling.
   Now backed by the real Pawstop API (bcrypt-hashed passwords,
   JWT sessions, server-side validation) instead of a plaintext
   localStorage check. See js/api.js for the transport layer.
   =========================================================== */

(function(){
  const NS = window.PAWSTOP;
  const api = NS.api;

  function setFieldError(group, message){
    group.classList.add('invalid');
    const err = group.querySelector('.form-error');
    if (err && message) err.textContent = message;
  }
  function clearFieldError(group){ group.classList.remove('invalid'); }
  function validateEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function initLoginForm(){
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailGroup = form.querySelector('[data-field=email]');
      const passGroup = form.querySelector('[data-field=password]');
      [emailGroup, passGroup].forEach(clearFieldError);
      const email = form.email.value.trim();
      const pass = form.password.value;

      let valid = true;
      if (!validateEmail(email)){ setFieldError(emailGroup, 'Enter a valid email address.'); valid = false; }
      if (pass.length < 4){ setFieldError(passGroup, 'Password looks too short.'); valid = false; }
      if (!valid) return;

      const submitBtn = form.querySelector('button[type=submit]');
      submitBtn.disabled = true; submitBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;"></span> Logging in…';
      try {
        const { token, user } = await api.call('POST', '/api/auth/login', { email, password: pass });
        api.setSession(token, user);
        NS.ui.toast(`Welcome back, ${user.name.split(' ')[0]}!`);
        setTimeout(() => {
          location.href = user.role === 'admin' ? 'admin.html' : (user.role === 'provider' ? 'dashboard/provider.html' : 'dashboard/customer.html');
        }, 500);
      } catch (err){
        setFieldError(passGroup, err.error);
        NS.ui.toast(err.error || 'Login failed.', 'error');
        submitBtn.disabled = false; submitBtn.textContent = 'Log In';
      }
    });

    const demoBtn = document.getElementById('fillDemo');
    if (demoBtn) demoBtn.addEventListener('click', () => { form.email.value = 'amara@demo.com'; form.password.value = 'demo1234'; });
    const demoProvBtn = document.getElementById('fillDemoProvider');
    if (demoProvBtn) demoProvBtn.addEventListener('click', () => { form.email.value = 'provider@demo.com'; form.password.value = 'demo1234'; });
    const demoAdminBtn = document.getElementById('fillDemoAdmin');
    if (demoAdminBtn) demoAdminBtn.addEventListener('click', () => { form.email.value = 'admin@demo.com'; form.password.value = 'demo1234'; });
  }

  function initRegisterForm(){
    const form = document.getElementById('registerForm');
    if (!form) return;

    const roleInputs = form.querySelectorAll('input[name=role]');
    roleInputs.forEach(r => r.addEventListener('change', () => {
      form.querySelectorAll('.role-card').forEach(c => c.classList.remove('active-role'));
      r.closest('.role-card').classList.add('active-role');
    }));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameGroup = form.querySelector('[data-field=name]');
      const emailGroup = form.querySelector('[data-field=email]');
      const passGroup = form.querySelector('[data-field=password]');
      [nameGroup, emailGroup, passGroup].forEach(clearFieldError);

      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const pass = form.password.value;
      const role = form.role.value;

      let valid = true;
      if (name.length < 2){ setFieldError(nameGroup, 'Please enter your full name.'); valid = false; }
      if (!validateEmail(email)){ setFieldError(emailGroup, 'Enter a valid email address.'); valid = false; }
      if (pass.length < 6){ setFieldError(passGroup, 'Use at least 6 characters.'); valid = false; }
      if (!valid) return;

      const submitBtn = form.querySelector('button[type=submit]');
      submitBtn.disabled = true; submitBtn.textContent = 'Creating account…';
      try {
        const payload = { name, email, password: pass, role };
        if (role === 'provider'){ payload.category = form.category.value; payload.city = form.city.value; }
        const { token, user } = await api.call('POST', '/api/auth/register', payload);
        api.setSession(token, user);
        NS.ui.toast('Account created — welcome to Pawstop!');
        setTimeout(() => { location.href = role === 'provider' ? 'dashboard/provider.html' : 'dashboard/customer.html'; }, 600);
      } catch (err){
        if (/email/i.test(err.error||'')) setFieldError(emailGroup, err.error);
        NS.ui.toast(err.error || 'Registration failed.', 'error');
        submitBtn.disabled = false; submitBtn.textContent = 'Create Account';
      }
    });
  }

  function requireAuth(role){
    const user = api.getUser();
    if (!user || (role && user.role !== role)){
      const isNested = location.pathname.includes('/dashboard/');
      location.href = (isNested ? '../' : '') + 'login.html';
      return null;
    }
    return user;
  }

  function logout(base){
    api.clearSession();
    location.href = (base||'') + 'index.html';
  }

  NS.auth = { initLoginForm, initRegisterForm, requireAuth, logout, validateEmail };

  document.addEventListener('DOMContentLoaded', () => {
    NS.auth.initLoginForm();
    NS.auth.initRegisterForm();
  });
})();
