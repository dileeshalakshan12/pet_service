/* ===========================================================
   posts.js — provider "create post" form: image preview,
   validation, publish/draft to localStorage
   =========================================================== */

(function(){
  const NS = window.PAWSTOP;
  const db = NS.db;

  function initCreatePostForm(){
    const form = document.getElementById('createPostForm');
    if (!form) return;
    const session = NS.api.getUser();
    const fileInput = form.images;
    const strip = document.getElementById('imgPreviewStrip');
    let previewImages = [];

    const dropZone = document.getElementById('uploadDrop');
    if (dropZone) dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      previewImages = [];
      const files = Array.from(fileInput.files).slice(0,5);
      let loaded = 0;
      if (!files.length) { renderStrip(); return; }
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImages.push(e.target.result);
          loaded++;
          if (loaded === files.length) renderStrip();
        };
        reader.readAsDataURL(file);
      });
    });

    function renderStrip(){
      if (previewImages.length){
        strip.innerHTML = previewImages.map((src,i) => `<div class="thumb" style="background-image:url('${src}')"><button type="button" data-i="${i}">✕</button></div>`).join('');
      } else {
        strip.innerHTML = `<div class="thumb" style="background-image:url('https://picsum.photos/seed/newpost${Date.now()}/300/300')"></div>`;
      }
    }
    renderStrip();

    strip.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      previewImages.splice(Number(btn.dataset.i), 1);
      renderStrip();
    });

    function collect(status){
      const titleGroup = form.querySelector('[data-field=title]');
      const title = form.title.value.trim();
      titleGroup.classList.toggle('invalid', title.length < 3);
      if (title.length < 3) return null;

      return {
        id: db.uid('post'),
        providerId: session.providerId,
        title,
        desc: form.desc.value.trim() || 'No description provided.',
        image: previewImages[0] || `https://picsum.photos/seed/${db.uid('p')}/600/380`,
        category: form.category.value,
        price: Number(form.price.value) || 0,
        promo: form.promo.checked,
        tags: (form.tags.value || '').split(',').map(t => t.trim()).filter(Boolean).map(t => t.startsWith('#')?t:'#'+t),
        likes: 0, likedByMe: false, savedByMe: false, comments: [],
        status,
        createdAt: Date.now()
      };
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const post = collect('published');
      if (!post) { NS.ui.toast('Please add a title for your post.', 'error'); return; }
      db.add('posts', post);
      NS.ui.toast('Post published — it\'s live on the marketplace!');
      form.reset(); previewImages = []; renderStrip();
      if (window.renderMyPosts) window.renderMyPosts();
    });

    const draftBtn = document.getElementById('saveDraftBtn');
    if (draftBtn) draftBtn.addEventListener('click', () => {
      const post = collect('draft');
      if (!post) { NS.ui.toast('Please add a title for your draft.', 'error'); return; }
      db.add('posts', post);
      NS.ui.toast('Draft saved.');
      form.reset(); previewImages = []; renderStrip();
      if (window.renderMyPosts) window.renderMyPosts();
    });
  }

  document.addEventListener('DOMContentLoaded', initCreatePostForm);
  NS.posts = { initCreatePostForm };
})();
