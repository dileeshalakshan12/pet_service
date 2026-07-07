/* ===========================================================
   dashboard.js — shared dashboard behaviors used by both the
   customer and provider dashboards: tabs, pet CRUD, booking
   status actions, sidebar mobile toggle, notification list
   =========================================================== */

(function(){
  const NS = window.PAWSTOP;
  const db = NS.db;

  function initTabs(){
    document.querySelectorAll('[data-tabgroup]').forEach(group => {
      const name = group.dataset.tabgroup;
      const buttons = group.querySelectorAll('.tabs button');
      buttons.forEach(btn => btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll(`[data-tabpanel="${name}"]`).forEach(p => p.style.display = 'none');
        const target = document.querySelector(`[data-tabpanel="${name}"][data-tab="${btn.dataset.tab}"]`);
        if (target) target.style.display = '';
      }));
    });
  }

  function initSidebarToggle(){
    const btn = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.dash-sidebar');
    if (btn && sidebar) btn.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  /* ---------- pet CRUD ---------- */
  function renderPets(container, ownerId, editable){
    const pets = db.get('pets').filter(p => p.ownerId === ownerId);
    if (!pets.length){
      container.innerHTML = `<div class="empty-state"><div class="icon">🐾</div><p>No pets added yet. Add your first pet to start booking.</p></div>`;
      return;
    }
    container.innerHTML = pets.map(p => `
      <div class="card pet-card">
        <div class="p-photo">${p.photoEmoji || '🐾'}</div>
        <div class="p-info">
          <h3>${p.name}</h3>
          <div class="p-meta">
            <span>${p.species} · ${p.breed}</span><span>Age ${p.age}</span><span>${p.gender}</span><span>${p.weight}</span>
            <span>💉 ${p.vaccinated}</span>
          </div>
          ${p.allergies && p.allergies !== 'None known' ? `<div style="font-size:.8rem;color:var(--danger);margin-top:6px">⚠️ Allergy: ${p.allergies}</div>` : ''}
        </div>
        ${editable ? `<div style="display:flex;flex-direction:column;gap:8px;">
          <button class="btn btn-ghost btn-sm edit-pet" data-id="${p.id}">Edit</button>
          <button class="btn btn-ghost btn-sm delete-pet" data-id="${p.id}" style="color:var(--danger)">Delete</button>
        </div>` : ''}
      </div>`).join('');
  }

  function bindPetForm(formId, listRenderFn, ownerId){
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const editId = form.dataset.editId;
      const data = {
        ownerId, name: form.name.value.trim(), species: form.species.value, breed: form.breed.value.trim(),
        age: Number(form.age.value) || 0, gender: form.gender.value, weight: form.weight.value.trim(),
        vaccinated: form.vaccinated.value, allergies: form.allergies.value.trim() || 'None known',
        notes: form.notes.value.trim(), photoEmoji: form.species.value === 'Cat' ? '🐈' : form.species.value === 'Bird' ? '🐦' : form.species.value === 'Dog' ? '🐕' : '🐾'
      };
      if (editId){
        db.update('pets', editId, data);
        NS.ui.toast('Pet profile updated.');
      } else {
        db.add('pets', { id: db.uid('pet'), ...data });
        NS.ui.toast('Pet added.');
      }
      form.reset(); delete form.dataset.editId;
      NS.ui.closeModal('petModal');
      listRenderFn();
    });
  }

  function bindPetListActions(container, ownerId, listRenderFn){
    container.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.edit-pet');
      const delBtn = e.target.closest('.delete-pet');
      if (editBtn){
        const pet = db.find('pets', editBtn.dataset.id);
        const form = document.getElementById('petForm');
        Object.keys(pet).forEach(k => { if (form[k]) form[k].value = pet[k]; });
        form.dataset.editId = pet.id;
        document.getElementById('petModalTitle').textContent = 'Edit Pet';
        NS.ui.openModal('petModal');
      }
      if (delBtn){
        if (confirm('Remove this pet profile?')){
          db.remove('pets', delBtn.dataset.id);
          NS.ui.toast('Pet removed.');
          listRenderFn();
        }
      }
    });
  }

  /* ---------- bookings table ---------- */
  function bookingsTableHTML(bookings, opts){
    opts = opts || {};
    if (!bookings.length) return `<div class="empty-state"><div class="icon">📅</div><p>No bookings yet.</p></div>`;
    const rows = bookings.map(b => {
      const provider = db.find('providers', b.providerId);
      const service = db.find('services', b.serviceId);
      const pet = db.find('pets', b.petId);
      return `<tr>
        <td>${opts.showProvider !== false ? (provider?provider.name:'—') : (pet?pet.name:'—')}</td>
        <td>${service?service.title:'—'}</td>
        <td>${b.date} · ${b.time}</td>
        <td class="price">$${b.price}</td>
        <td><span class="status-pill ${b.status}">${b.status}</span></td>
        <td>
          ${opts.providerActions && b.status==='pending' ? `<button class="btn btn-sm btn-secondary confirm-bk" data-id="${b.id}">Confirm</button> <button class="btn btn-sm btn-ghost cancel-bk" data-id="${b.id}" style="color:var(--danger)">Decline</button>` : ''}
          ${!opts.providerActions && b.status==='pending' ? `<button class="btn btn-sm btn-ghost cancel-bk" data-id="${b.id}" style="color:var(--danger)">Cancel</button>` : ''}
        </td>
      </tr>`;
    }).join('');
    return `<table class="data-table"><thead><tr><th>${opts.showProvider!==false?'Provider':'Pet'}</th><th>Service</th><th>Date</th><th>Price</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function bindBookingActions(container, rerenderFn){
    container.addEventListener('click', (e) => {
      const confirmBtn = e.target.closest('.confirm-bk');
      const cancelBtn = e.target.closest('.cancel-bk');
      if (confirmBtn){ db.update('bookings', confirmBtn.dataset.id, { status: 'confirmed' }); NS.ui.toast('Booking confirmed.'); rerenderFn(); }
      if (cancelBtn){ db.update('bookings', cancelBtn.dataset.id, { status: 'cancelled' }); NS.ui.toast('Booking cancelled.'); rerenderFn(); }
    });
  }

  /* ---------- notifications ---------- */
  function renderNotifications(container, userId){
    const notes = db.get('notifications').filter(n => n.userId === userId).sort((a,b)=>b.at-a.at);
    if (!notes.length){ container.innerHTML = `<div class="empty-state"><div class="icon">🔔</div><p>You're all caught up.</p></div>`; return; }
    const icons = { booking:'📅', message:'💬', review:'⭐', like:'❤️', follower:'👥' };
    container.innerHTML = notes.map(n => `
      <div class="card" style="display:flex;gap:14px;padding:16px;align-items:flex-start;${n.read?'opacity:.6':''}">
        <div style="font-size:1.3rem">${icons[n.type]||'🔔'}</div>
        <div style="flex:1"><p style="color:var(--ink)">${n.text}</p><span style="font-size:.78rem;color:var(--ink-soft)">${new Date(n.at).toLocaleString()}</span></div>
        ${!n.read ? '<span class="badge-dot" style="position:static"></span>' : ''}
      </div>`).join('');
    const unread = db.get('notifications').map(n => n.userId===userId ? {...n, read:true} : n);
    db.set('notifications', unread);
  }

  NS.dash = { initTabs, initSidebarToggle, renderPets, bindPetForm, bindPetListActions, bookingsTableHTML, bindBookingActions, renderNotifications };
  document.addEventListener('DOMContentLoaded', () => { initTabs(); initSidebarToggle(); });
})();
