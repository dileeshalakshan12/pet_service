/* ===========================================================
   storage.js — localStorage data layer
   Seeds demo data on first load and exposes CRUD helpers
   used by every other module (PAWSTOP.db.*)
   =========================================================== */

(function(){
  const KEYS = {
    users: 'pw_users', pets: 'pw_pets', providers: 'pw_providers',
    services: 'pw_services', bookings: 'pw_bookings', posts: 'pw_posts',
    reviews: 'pw_reviews', messages: 'pw_messages', notifications: 'pw_notifications',
    session: 'pw_session', seeded: 'pw_seeded_v1'
  };

  const CATEGORIES = [
    { id:'groom',  name:'Grooming',        icon:'✂️', desc:'Baths, cuts & spa days for a fresh coat.', from:25 },
    { id:'vet',    name:'Veterinary',      icon:'🩺', desc:'Checkups, vaccines & health care.',         from:40 },
    { id:'sit',    name:'Pet Sitting',     icon:'🏠', desc:'Trusted care while you\'re away.',           from:20 },
    { id:'walk',   name:'Dog Walking',     icon:'🐕', desc:'Daily walks & exercise on schedule.',        from:15 },
    { id:'board',  name:'Pet Boarding',    icon:'🛏️', desc:'Overnight stays in a caring home.',          from:35 },
    { id:'train',  name:'Training',        icon:'🎓', desc:'Obedience & behavior coaching.',             from:30 },
    { id:'taxi',   name:'Pet Taxi',        icon:'🚗', desc:'Safe rides to vet visits & groomers.',       from:18 },
    { id:'photo',  name:'Pet Photography', icon:'📸', desc:'Portrait sessions worth framing.',           from:50 },
    { id:'daycare',name:'Day Care',        icon:'☀️', desc:'Supervised play while you work.',            from:22 },
    { id:'visit',  name:'Home Visits',     icon:'🚪', desc:'Feeding & check-ins at your place.',         from:16 }
  ];

  function uid(prefix){ return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function read(key){ try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch(e){ return null; } }
  function write(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); return true; } catch(e){ console.error('storage write failed', e); return false; } }

  function seed(){
    if (read(KEYS.seeded)) return;

    const providerNames = [
      ['Wag & Wash Studio','groom','Colombo'], ['CityPaws Veterinary','vet','Negombo'],
      ['Happy Trails Walking Co.','walk','Colombo'], ['Cozy Nest Pet Sitting','sit','Kandy'],
      ['The Boarding House','board','Galle'], ['Good Dog Academy','train','Colombo'],
      ['PetGo Taxi Service','taxi','Negombo'], ['Furever Photography','photo','Colombo'],
      ['Sunny Paws Day Care','daycare','Kandy'], ['HomeCare Pet Visits','visit','Galle'],
      ['Bubbles Grooming Lounge','groom','Galle'], ['Companion Vet Clinic','vet','Kandy']
    ];

    const providers = providerNames.map(([name, cat, city], i) => ({
      id: i === 0 ? 'prov_demo' : uid('prov'), // fixed id for the demo provider so dashboard data lines up with the real backend login
      name, category: cat, city,
      rating: (3.9 + Math.random()*1.1).toFixed(1),
      reviews: 12 + Math.floor(Math.random()*180),
      experience: 1 + Math.floor(Math.random()*9),
      priceRange: ['$','$$','$$$'][Math.floor(Math.random()*3)],
      availableToday: Math.random() > 0.4,
      cover: `https://picsum.photos/seed/${cat}${i}/600/240`,
      about: `${name} has been proudly serving pet families in ${city} with attentive, professional care tailored to every animal's needs.`,
      hours: 'Mon–Sat, 8:00 AM – 6:00 PM',
      followers: Math.floor(Math.random()*400),
      profileViews: Math.floor(Math.random()*3000),
      email: name.toLowerCase().replace(/[^a-z]/g,'') + '@pawstop.demo'
    }));
    write(KEYS.providers, providers);

    const services = [];
    providers.forEach(p => {
      const cat = CATEGORIES.find(c => c.id === p.category);
      const count = 1 + Math.floor(Math.random()*3);
      for (let i=0;i<count;i++){
        services.push({
          id: uid('svc'), providerId: p.id, category: p.category,
          title: `${cat.name} — ${['Basic','Standard','Premium'][i % 3]} Package`,
          desc: cat.desc,
          price: cat.from + i*15 + Math.floor(Math.random()*10),
          duration: [30,45,60,90][Math.floor(Math.random()*4)],
          image: `https://picsum.photos/seed/svc${p.id}${i}/500/320`
        });
      }
    });
    write(KEYS.services, services);

    const posts = [];
    providers.slice(0,8).forEach((p,i) => {
      posts.push({
        id: uid('post'), providerId: p.id,
        title: [`Spring grooming special!`, `New puppy training cohort`, `Weekend boarding slots open`, `Meet our newest team member`][i%4],
        desc: `We're excited to offer this to the ${p.city} community — book early, spots fill fast.`,
        image: `https://picsum.photos/seed/post${i}/600/380`,
        category: p.category,
        price: 20 + i*5,
        promo: i % 2 === 0,
        tags: ['#petcare', '#'+p.category, '#'+p.city.toLowerCase()],
        likes: Math.floor(Math.random()*140),
        likedByMe: false,
        savedByMe: false,
        comments: [],
        createdAt: Date.now() - i*86400000
      });
    });
    write(KEYS.posts, posts);

    const reviews = [];
    providers.forEach(p => {
      const n = 2 + Math.floor(Math.random()*3);
      for (let i=0;i<n;i++){
        reviews.push({
          id: uid('rev'), providerId: p.id,
          author: ['Amara S.','Kasun P.','Nethmi F.','Dilan R.','Ishara W.'][Math.floor(Math.random()*5)],
          rating: 3 + Math.floor(Math.random()*3),
          text: 'Wonderful, attentive service — my pet was clearly comfortable the whole time. Will definitely book again.',
          date: Date.now() - Math.floor(Math.random()*30)*86400000,
          likes: Math.floor(Math.random()*20)
        });
      }
    });
    write(KEYS.reviews, reviews);

    write(KEYS.users, [
      { id:'user_demo', role:'customer', name:'Amara Silva', email:'amara@demo.com', password:'demo1234', avatarText:'AS', joined: Date.now()-90*86400000 },
      { id:'prov_demo_user', role:'provider', name:'Wag & Wash Studio', email:'provider@demo.com', password:'demo1234', providerId: providers[0].id, avatarText:'WW', joined: Date.now()-200*86400000 }
    ]);

    write(KEYS.pets, [
      { id: uid('pet'), ownerId:'user_demo', name:'Biscuit', species:'Dog', breed:'Golden Retriever', age:3, gender:'Male', weight:'28 kg', vaccinated:'Up to date', allergies:'None known', notes:'Loves belly rubs, a little shy around other dogs at first.', photoEmoji:'🐕' },
      { id: uid('pet'), ownerId:'user_demo', name:'Luna', species:'Cat', breed:'British Shorthair', age:2, gender:'Female', weight:'4.2 kg', vaccinated:'Up to date', allergies:'Sensitive to chicken-based food', notes:'Very independent, prefers quiet handlers.', photoEmoji:'🐈' }
    ]);

    const pets = read(KEYS.pets);
    write(KEYS.bookings, [
      { id: uid('bk'), customerId:'user_demo', providerId: providers[0].id, serviceId: services[0].id, petId: pets[0].id, date: nextDate(3), time:'10:00 AM', notes:'Please trim nails too.', status:'confirmed', createdAt: Date.now()-2*86400000, price: services[0].price },
      { id: uid('bk'), customerId:'user_demo', providerId: providers[3].id, serviceId: services.find(s=>s.providerId===providers[3].id)?.id, petId: pets[1].id, date: nextDate(7), time:'2:00 PM', notes:'', status:'pending', createdAt: Date.now()-86400000, price: 35 },
      { id: uid('bk'), customerId:'user_demo', providerId: providers[2].id, serviceId: services.find(s=>s.providerId===providers[2].id)?.id, petId: pets[0].id, date: nextDate(-5), time:'9:00 AM', notes:'', status:'completed', createdAt: Date.now()-10*86400000, price: 22 }
    ]);

    write(KEYS.messages, [
      { id: uid('msg'), threadId:'thread_1', from:'user_demo', to: providers[0].id, text:'Hi! Do you have any slots open this Saturday?', at: Date.now()-3600000 },
      { id: uid('msg'), threadId:'thread_1', from: providers[0].id, to:'user_demo', text:'Yes! We have 10am and 2pm open. Which works better?', at: Date.now()-3500000 }
    ]);

    write(KEYS.notifications, [
      { id: uid('note'), userId:'user_demo', type:'booking', text:'Your booking with Wag & Wash Studio is confirmed.', read:false, at: Date.now()-3600000 },
      { id: uid('note'), userId:'user_demo', type:'message', text:'New message from Wag & Wash Studio.', read:false, at: Date.now()-3500000 },
      { id: uid('note'), userId:'user_demo', type:'review', text:'Reminder: leave a review for your completed booking.', read:true, at: Date.now()-86400000 }
    ]);

    write(KEYS.seeded, true);
  }

  function nextDate(offsetDays){
    const d = new Date(); d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0,10);
  }

  const db = {
    KEYS, CATEGORIES, uid,
    get(key){ return read(KEYS[key]) || []; },
    set(key, val){ return write(KEYS[key], val); },
    add(key, item){ const list = this.get(key); list.unshift(item); write(KEYS[key], list); return item; },
    update(key, id, patch){ const list = this.get(key); const i = list.findIndex(x=>x.id===id); if(i>-1){ list[i] = {...list[i], ...patch}; write(KEYS[key], list); } return list[i]; },
    remove(key, id){ const list = this.get(key).filter(x=>x.id!==id); write(KEYS[key], list); },
    find(key, id){ return this.get(key).find(x=>x.id===id); },
    session(){ return read(KEYS.session); },
    setSession(user){ write(KEYS.session, user); },
    clearSession(){ localStorage.removeItem(KEYS.session); }
  };

  window.PAWSTOP = window.PAWSTOP || {};
  window.PAWSTOP.db = db;
  seed();
})();
