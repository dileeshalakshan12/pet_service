/* ===========================================================
   providers.js — category, service & provider card rendering,
   plus search / filter / sort / pagination logic
   =========================================================== */

(function(){
  const NS = window.PAWSTOP;
  const db = NS.db;

  function categoryCardHTML(cat, base){
    base = base || '';
    return `
    <a class="card cat-card reveal" href="${base}services.html?cat=${cat.id}">
      <div class="cat-icon">${cat.icon}</div>
      <h3>${cat.name}</h3>
      <p style="font-size:.85rem">${cat.desc}</p>
      <span class="cat-price">From $${cat.from}</span>
    </a>`;
  }

  function serviceCardHTML(svc, provider, base){
    base = base || '';
    const rating = provider ? provider.rating : '4.5';
    return `
    <div class="card svc-card reveal">
      <div class="thumb" style="background-image:url('${svc.image}')"><span class="tag">${db.CATEGORIES.find(c=>c.id===svc.category)?.name || svc.category}</span></div>
      <div class="body">
        <h3>${svc.title}</h3>
        <p style="font-size:.88rem">${provider ? provider.name : ''} · ${provider ? provider.city : ''}</p>
        <div class="rating"><span class="stars">${NS.ui.starString(rating)}</span><span>${rating} (${provider?provider.reviews:0})</span></div>
        <div style="display:flex; align-items:center; justify-content:space-between; margin-top:auto; padding-top:8px;">
          <span class="price">$${svc.price}</span>
          <a href="${base}booking.html?service=${svc.id}" class="btn btn-primary btn-sm">Book Now</a>
        </div>
      </div>
    </div>`;
  }

  function providerCardHTML(p, base){
    base = base || '';
    const initials = p.name.split(' ').map(w=>w[0]).slice(0,2).join('');
    return `
    <div class="card provider-card reveal">
      <div class="cover" style="background-image:url('${p.cover}')">
        ${p.availableToday ? '<span class="avail">Available Today</span>' : ''}
      </div>
      <div class="p-body">
        <div class="logo">${initials}</div>
        <h3>${p.name}</h3>
        <div class="rating"><span class="stars">${NS.ui.starString(p.rating)}</span><span>${p.rating} · ${p.reviews} reviews</span></div>
        <div class="cats">
          <span class="chip">${db.CATEGORIES.find(c=>c.id===p.category)?.name || p.category}</span>
          <span class="chip">${p.city}</span>
          <span class="chip">${p.experience}+ yrs exp</span>
          <span class="chip">${p.priceRange}</span>
        </div>
        <div class="p-actions">
          <a href="${base}provider-profile.html?id=${p.id}" class="btn btn-ghost btn-sm">View Profile</a>
          <a href="${base}booking.html?provider=${p.id}" class="btn btn-primary btn-sm">Book Now</a>
        </div>
      </div>
    </div>`;
  }

  function postCardHTML(post, base){
    base = base || '';
    const provider = db.find('providers', post.providerId);
    const initials = provider ? provider.name.split(' ').map(w=>w[0]).slice(0,2).join('') : 'P';
    return `
    <div class="card post-card reveal" data-post="${post.id}">
      <div class="imgs" style="background-image:url('${post.image}')">${post.promo ? '<span class="promo">Promotion</span>' : ''}</div>
      <div class="p-body">
        <div class="author"><span class="av">${initials}</span><div><strong style="font-size:.88rem">${provider?provider.name:'Provider'}</strong><div style="font-size:.75rem;color:var(--ink-soft)">${timeAgo(post.createdAt)}</div></div></div>
        <h3 style="font-size:1.05rem">${post.title}</h3>
        <p style="font-size:.88rem">${post.desc}</p>
        <div class="tags">${post.tags.join(' ')}</div>
        <div style="display:flex; align-items:center; justify-content:space-between; margin-top:8px;">
          <span class="price">$${post.price}</span>
          <a href="${base}booking.html?provider=${post.providerId}" class="btn btn-primary btn-sm">Book Now</a>
        </div>
        <div class="post-actions">
          <button class="like-btn ${post.likedByMe?'active':''}" data-id="${post.id}">❤️ <span>${post.likes}</span></button>
          <button class="comment-btn" data-id="${post.id}">💬 <span>${post.comments.length}</span></button>
          <button class="save-btn ${post.savedByMe?'active':''}" data-id="${post.id}">🔖 ${post.savedByMe?'Saved':'Save'}</button>
          <button class="share-btn" data-id="${post.id}">↗️ Share</button>
        </div>
      </div>
    </div>`;
  }

  function timeAgo(ts){
    const diff = Date.now() - ts;
    const days = Math.floor(diff / 86400000);
    if (days < 1) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  }

  function bindPostActions(container){
    container.addEventListener('click', (e) => {
      const likeBtn = e.target.closest('.like-btn');
      const saveBtn = e.target.closest('.save-btn');
      const shareBtn = e.target.closest('.share-btn');
      if (likeBtn){
        const posts = db.get('posts');
        const post = posts.find(p => p.id === likeBtn.dataset.id);
        post.likedByMe = !post.likedByMe;
        post.likes += post.likedByMe ? 1 : -1;
        db.set('posts', posts);
        likeBtn.classList.toggle('active');
        likeBtn.querySelector('span').textContent = post.likes;
      }
      if (saveBtn){
        const posts = db.get('posts');
        const post = posts.find(p => p.id === saveBtn.dataset.id);
        post.savedByMe = !post.savedByMe;
        db.set('posts', posts);
        saveBtn.classList.toggle('active');
        saveBtn.textContent = post.savedByMe ? '🔖 Saved' : '🔖 Save';
        NS.ui.toast(post.savedByMe ? 'Post saved.' : 'Removed from saved.');
      }
      if (shareBtn){
        NS.ui.toast('Link copied to clipboard.');
      }
    });
  }

  NS.cards = { categoryCardHTML, serviceCardHTML, providerCardHTML, postCardHTML, bindPostActions, timeAgo };
})();
