/* ===========================================================
   booking.js — booking page logic: provider/service/pet select,
   date/time picking, confirmation, localStorage persistence
   =========================================================== */

(function(){
  const NS = window.PAWSTOP;
  const db = NS.db;

  function initBookingPage(){
    const form = document.getElementById('bookingForm');
    if (!form) return;

    const params = new URLSearchParams(location.search);
    const providers = db.get('providers');
    const services = db.get('services');
    const session = NS.api.getUser();

    const providerSelect = form.provider;
    providers.forEach(p => providerSelect.add(new Option(`${p.name} (${p.city})`, p.id)));

    function refreshServices(providerId){
      form.service.innerHTML = '<option value="">Select a service…</option>';
      services.filter(s => s.providerId === providerId).forEach(s => {
        form.service.add(new Option(`${s.title} — $${s.price}`, s.id));
      });
      updateSummary();
    }

    if (params.get('provider')){ providerSelect.value = params.get('provider'); refreshServices(params.get('provider')); }
    else if (params.get('service')){
      const svc = db.find('services', params.get('service'));
      if (svc){ providerSelect.value = svc.providerId; refreshServices(svc.providerId); form.service.value = svc.id; }
    } else if (providers.length){
      providerSelect.value = providers[0].id; refreshServices(providers[0].id);
    }

    providerSelect.addEventListener('change', () => refreshServices(providerSelect.value));

    if (session){
      const pets = db.get('pets').filter(p => p.ownerId === session.id);
      if (pets.length){
        form.pet.innerHTML = pets.map(p => `<option value="${p.id}">${p.name} (${p.species})</option>`).join('');
      } else {
        form.pet.innerHTML = `<option value="">No pets yet — add one in your dashboard</option>`;
      }
    } else {
      form.pet.innerHTML = `<option value="">Log in to select a saved pet</option>`;
    }

    const minDate = new Date().toISOString().slice(0,10);
    form.date.min = minDate;
    form.date.value = minDate;

    [form.provider, form.service, form.date, form.time].forEach(el => el.addEventListener('change', updateSummary));
    function updateSummary(){
      const provider = db.find('providers', form.provider.value);
      const service = db.find('services', form.service.value);
      const summary = document.getElementById('bookingSummary');
      if (!summary) return;
      summary.innerHTML = `
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line)"><span>Provider</span><strong>${provider?provider.name:'—'}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line)"><span>Service</span><strong>${service?service.title:'—'}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line)"><span>Date</span><strong>${form.date.value||'—'}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line)"><span>Time</span><strong>${form.time.value||'—'}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:14px 0;font-size:1.15rem"><span>Total</span><strong class="price">$${service?service.price:0}</strong></div>
      `;
    }
    updateSummary();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!session){ NS.ui.toast('Please log in to complete your booking.', 'error'); setTimeout(()=>location.href='login.html', 900); return; }
      if (!form.provider.value || !form.service.value || !form.date.value || !form.time.value){
        NS.ui.toast('Please complete all required fields.', 'error'); return;
      }
      const service = db.find('services', form.service.value);
      const booking = {
        id: db.uid('bk'), customerId: session.id, providerId: form.provider.value, serviceId: form.service.value,
        petId: form.pet.value || null, date: form.date.value, time: form.time.value, notes: form.notes.value.trim(),
        status: 'pending', createdAt: Date.now(), price: service ? service.price : 0
      };
      db.add('bookings', booking);

      const notes = db.get('notifications');
      notes.unshift({ id: db.uid('note'), userId: session.id, type:'booking', text:`Booking request sent for ${service?service.title:'your service'}.`, read:false, at: Date.now() });
      db.set('notifications', notes);

      NS.ui.openModal('confirmModal');
    });
  }

  document.addEventListener('DOMContentLoaded', initBookingPage);
  NS.booking = { initBookingPage };
})();
