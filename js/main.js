(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- topo: fundo sólido ao rolar + menu mobile ----------
  const topbar = document.getElementById('topbar');
  const onScroll = () => topbar.classList.toggle('solid', window.scrollY > 60);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const menuBtn = document.getElementById('menuBtn');
  const nav = document.getElementById('nav');
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  nav.addEventListener('click', e => { if (e.target.tagName === 'A') nav.classList.remove('open'); });

  // ---------- pétalas caindo no hero ----------
  const petals = document.getElementById('heroPetals');
  const hero = document.getElementById('inicio');
  let heroVisible = true;
  new IntersectionObserver(es => (heroVisible = es[0].isIntersecting)).observe(hero);
  function spawnPetal() {
    if (heroVisible && document.visibilityState === 'visible') {
      const p = document.createElement('span');
      p.className = 'hero-petal';
      const size = 0.6 + Math.random() * 0.7;
      p.style.left = Math.random() * 100 + '%';
      p.style.width = 10 * size + 'px';
      p.style.height = 22 * size + 'px';
      p.style.setProperty('--dx', (Math.random() * 160 - 40) + 'px');
      p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      p.style.animationDuration = 7 + Math.random() * 6 + 's';
      p.addEventListener('animationend', () => p.remove());
      petals.appendChild(p);
    }
    setTimeout(spawnPetal, 650 + Math.random() * 900);
  }
  if (!reduce) setTimeout(spawnPetal, 2200);

  // ---------- cards e modal ----------
  const data = window.ATRATIVOS || [];
  const byId = Object.fromEntries(data.map(d => [d.id, d]));
  const cards = document.getElementById('cards');

  function media(d) {
    if (d.img) return `<img src="${d.img}" alt="${d.title}" loading="lazy"${d.pos ? ` style="object-position:${d.pos}"` : ''}>`;
    if (d.logo) return `<img class="logo-img" src="${d.logo}" alt="Logo ${d.title}" loading="lazy"${d.logoBg ? ` style="background:${d.logoBg}"` : ''}>`;
    return `<span class="card-emoji" aria-hidden="true">${d.emoji}</span>`;
  }
  const mediaBg = d => (d.logo && !d.img ? d.logoBg || '#fff' : d.bg);

  cards.innerHTML = data.map(d => `
    <button class="card" data-spot="${d.id}">
      <div class="card-media" style="background:${mediaBg(d)}">${media(d)}</div>
      <div class="card-body">
        <span class="card-tag">${d.area}</span>
        <h3>${d.title}</h3>
        <p>${d.short}</p>
      </div>
    </button>`).join('');

  const modal = document.getElementById('modal');
  const mMedia = document.getElementById('modalMedia');
  let lastFocus = null, currentId = null;
  document.getElementById('modalMap').addEventListener('click', () => {
    const id = currentId;
    closeModal();
    document.getElementById('explore').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => window.focusSpot && window.focusSpot(id), 500);
  });

  window.openSpot = function (id) {
    const d = byId[id];
    if (!d) return;
    lastFocus = document.activeElement;
    currentId = id;
    mMedia.style.background = mediaBg(d);
    mMedia.innerHTML = media(d);
    document.getElementById('modalTag').textContent = d.area;
    document.getElementById('modalTitle').textContent = d.title;
    document.getElementById('modalText').textContent = d.text;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modal.querySelector('.modal-close').focus();
  };
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  modal.addEventListener('click', e => { if (e.target.hasAttribute('data-close')) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
  cards.addEventListener('click', e => {
    const c = e.target.closest('[data-spot]');
    if (c) openSpot(c.dataset.spot);
  });
})();
