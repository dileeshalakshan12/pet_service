// db/seed.js — seeds demo data on first run only (checked via a marker row).
// Passwords are bcrypt-hashed before ever touching the database — the
// plaintext demo passwords below exist only in this seed script and in the
// README for demo purposes; real registrations go through the same hashing
// path in routes/auth.js.
const bcrypt = require('bcryptjs');
const db = require('./schema');

function uid(prefix){ return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

const CATEGORIES = [
  { id:'groom',  name:'Grooming',        from:25 },
  { id:'vet',    name:'Veterinary',      from:40 },
  { id:'sit',    name:'Pet Sitting',     from:20 },
  { id:'walk',   name:'Dog Walking',     from:15 },
  { id:'board',  name:'Pet Boarding',    from:35 },
  { id:'train',  name:'Training',        from:30 },
  { id:'taxi',   name:'Pet Taxi',        from:18 },
  { id:'photo',  name:'Pet Photography', from:50 },
  { id:'daycare',name:'Day Care',        from:22 },
  { id:'visit',  name:'Home Visits',     from:16 }
];

function alreadySeeded(){
  const row = db.prepare(`SELECT value FROM meta WHERE key = 'seeded'`).get();
  return !!row;
}

db.exec(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`);

if (!alreadySeeded()){
  console.log('Seeding demo data into SQLite database...');

  const insertProvider = db.prepare(`INSERT INTO providers (id,name,category,city,rating,reviews,experience,price_range,available_today,cover,about,hours,followers,profile_views,email) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const providerRows = [
    ['Wag & Wash Studio','groom','Colombo'], ['CityPaws Veterinary','vet','Negombo'],
    ['Happy Trails Walking Co.','walk','Colombo'], ['Cozy Nest Pet Sitting','sit','Kandy'],
    ['The Boarding House','board','Galle'], ['Good Dog Academy','train','Colombo'],
    ['PetGo Taxi Service','taxi','Negombo'], ['Furever Photography','photo','Colombo'],
    ['Sunny Paws Day Care','daycare','Kandy'], ['HomeCare Pet Visits','visit','Galle'],
    ['Bubbles Grooming Lounge','groom','Galle'], ['Companion Vet Clinic','vet','Kandy']
  ];
  const providerIds = [];
  providerRows.forEach(([name,cat,city], i) => {
    const id = i === 0 ? 'prov_demo' : uid('prov'); // fixed id for the seeded demo provider account so it lines up with the demo login
    providerIds.push({ id, cat, city, name });
    insertProvider.run(
      id, name, cat, city, (3.9+Math.random()*1.1).toFixed(1), 12+Math.floor(Math.random()*180),
      1+Math.floor(Math.random()*9), ['$','$$','$$$'][Math.floor(Math.random()*3)], Math.random()>0.4?1:0,
      `https://picsum.photos/seed/${cat}${i}/600/240`,
      `${name} has been proudly serving pet families in ${city} with attentive, professional care.`,
      'Mon–Sat, 8:00 AM – 6:00 PM', Math.floor(Math.random()*400), Math.floor(Math.random()*3000),
      name.toLowerCase().replace(/[^a-z]/g,'') + '@pawstop.demo'
    );
  });

  const insertService = db.prepare(`INSERT INTO services (id,provider_id,category,title,desc,price,duration,image) VALUES (?,?,?,?,?,?,?,?)`);
  const serviceIds = [];
  providerIds.forEach(p => {
    const cat = CATEGORIES.find(c=>c.id===p.cat);
    const count = 1 + Math.floor(Math.random()*3);
    for (let i=0;i<count;i++){
      const id = uid('svc');
      serviceIds.push({ id, providerId: p.id, price: cat.from + i*15 });
      insertService.run(id, p.id, p.cat, `${cat.name} — ${['Basic','Standard','Premium'][i%3]} Package`, cat.name+' service', cat.from+i*15+Math.floor(Math.random()*10), [30,45,60,90][Math.floor(Math.random()*4)], `https://picsum.photos/seed/svc${p.id}${i}/500/320`);
    }
  });

  const insertReview = db.prepare(`INSERT INTO reviews (id,provider_id,author,rating,text,date,likes) VALUES (?,?,?,?,?,?,?)`);
  providerIds.forEach(p => {
    const n = 2+Math.floor(Math.random()*3);
    for (let i=0;i<n;i++){
      insertReview.run(uid('rev'), p.id, ['Amara S.','Kasun P.','Nethmi F.','Dilan R.','Ishara W.'][Math.floor(Math.random()*5)], 3+Math.floor(Math.random()*3), 'Wonderful, attentive service — will definitely book again.', Date.now()-Math.floor(Math.random()*30)*86400000, Math.floor(Math.random()*20));
    }
  });

  const insertPost = db.prepare(`INSERT INTO posts (id,provider_id,title,desc,image,category,price,promo,tags,likes,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  providerIds.slice(0,8).forEach((p,i) => {
    insertPost.run(uid('post'), p.id, ['Spring grooming special!','New puppy training cohort','Weekend boarding slots open','Meet our newest team member'][i%4], `We're excited to offer this to the ${p.city} community.`, `https://picsum.photos/seed/post${i}/600/380`, p.cat, 20+i*5, i%2===0?1:0, JSON.stringify(['#petcare','#'+p.cat]), Math.floor(Math.random()*140), 'published', Date.now()-i*86400000);
  });

  // demo users
  const insertUser = db.prepare(`INSERT INTO users (id,name,email,password_hash,role,provider_id,avatar_text,created_at) VALUES (?,?,?,?,?,?,?,?)`);
  const demoPass = bcrypt.hashSync('demo1234', 10);
  insertUser.run('user_demo', 'Amara Silva', 'amara@demo.com', demoPass, 'customer', null, 'AS', Date.now()-90*86400000);
  insertUser.run('prov_demo_user', providerRows[0][0], 'provider@demo.com', demoPass, 'provider', providerIds[0].id, 'WW', Date.now()-200*86400000);
  insertUser.run('admin_demo', 'Site Admin', 'admin@demo.com', demoPass, 'admin', null, 'SA', Date.now()-300*86400000);

  const insertPet = db.prepare(`INSERT INTO pets (id,owner_id,name,species,breed,age,gender,weight,vaccinated,allergies,notes,photo_emoji) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const pet1 = uid('pet'), pet2 = uid('pet');
  insertPet.run(pet1,'user_demo','Biscuit','Dog','Golden Retriever',3,'Male','28 kg','Up to date','None known','Loves belly rubs.','🐕');
  insertPet.run(pet2,'user_demo','Luna','Cat','British Shorthair',2,'Female','4.2 kg','Up to date','Sensitive to chicken','Very independent.','🐈');

  const insertBooking = db.prepare(`INSERT INTO bookings (id,customer_id,provider_id,service_id,pet_id,date,time,notes,status,price,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  function nextDate(offset){ const d=new Date(); d.setDate(d.getDate()+offset); return d.toISOString().slice(0,10); }
  insertBooking.run(uid('bk'),'user_demo',providerIds[0].id, serviceIds.find(s=>s.providerId===providerIds[0].id).id, pet1, nextDate(3), '10:00 AM', 'Please trim nails too.', 'confirmed', serviceIds.find(s=>s.providerId===providerIds[0].id).price, Date.now()-2*86400000);
  insertBooking.run(uid('bk'),'user_demo',providerIds[3].id, (serviceIds.find(s=>s.providerId===providerIds[3].id)||{}).id||null, pet2, nextDate(7), '2:00 PM', '', 'pending', 35, Date.now()-86400000);

  const insertArticle = db.prepare(`INSERT INTO articles (id,title,slug,excerpt,body_html,cover_image,category,tags,status,author_id,author_name,created_at,updated_at,published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const now = Date.now();
  insertArticle.run(
    uid('art'), 'Welcome to the Pawstop Blog', 'welcome-to-the-pawstop-blog',
    'A quick look at what you\'ll find here — care tips, provider spotlights, and product news.',
    '<p>This is the first article on the Pawstop blog, written through the new no-code admin editor. Admins can create posts like this one with headings, <strong>bold</strong> and <em>italic</em> text, lists, links, and images — no HTML required.</p><h3>What to expect</h3><ul><li>Seasonal pet care tips</li><li>Provider spotlights from our marketplace</li><li>Product updates and new features</li></ul>',
    'https://picsum.photos/seed/blogwelcome/900/500', 'Announcements', JSON.stringify(['welcome','announcements']),
    'published', 'admin_demo', 'Site Admin', now, now, now
  );

  db.prepare(`INSERT INTO meta (key, value) VALUES ('seeded','true')`).run();
  console.log('Seed complete.');
} else {
  console.log('Database already seeded — skipping.');
}

module.exports = db;
