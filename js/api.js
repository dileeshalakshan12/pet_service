/* ===========================================================
   api.js — thin fetch wrapper around the Pawstop backend.
   Handles the JWT (stored in localStorage purely as a token
   cache — the actual source of truth is always the server,
   which verifies the signature on every request) and gives
   the rest of the app a simple async call(method, path, body).
   =========================================================== */

(function(){
  const NS = window.PAWSTOP = window.PAWSTOP || {};
  const TOKEN_KEY = 'pw_token';
  const USER_KEY = 'pw_user';

  function getToken(){ return localStorage.getItem(TOKEN_KEY); }
  function getUser(){ try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch(e){ return null; } }
  function setSession(token, user){ localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(user)); }
  function clearSession(){ localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }

  async function call(method, path, body){
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    let res;
    try {
      res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch (networkErr){
      throw { status: 0, error: 'Could not reach the server. Is the Pawstop backend running (npm start in /server)?' };
    }
    let data = {};
    try { data = await res.json(); } catch(e){ /* empty body, e.g. some DELETEs */ }
    if (!res.ok){
      if (res.status === 401) clearSession();
      throw { status: res.status, error: data.error || 'Something went wrong.' };
    }
    return data;
  }

  async function uploadImage(file){
    const token = getToken();
    const form = new FormData();
    form.append('image', file);
    const res = await fetch('/api/uploads', { method:'POST', headers: token ? {'Authorization':'Bearer '+token} : {}, body: form });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, error: data.error || 'Upload failed.' };
    return data.url;
  }

  NS.api = { call, getToken, getUser, setSession, clearSession, uploadImage };
})();
