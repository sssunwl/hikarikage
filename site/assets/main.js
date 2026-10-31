(() => {
  const base = document.documentElement.dataset.assets || 'assets/';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => 1 - Math.pow(1 - t, 3);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // 片的結構集中在這裡,HTML 只寫 data-film
  const films = $$('[data-film]').map(el => {
    const src = `${base}film/${el.dataset.film}.webp`;
    el.classList.add('film');
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', el.dataset.alt || '');
    el.innerHTML = `<div class="film__cast" style="background-image:url('${src}')"></div><div class="film__body"></div>
      <div class="film__win"><img src="${src}" alt="" loading="lazy" draggable="false"></div>
      <div class="film__label">${el.dataset.label || ''}</div>`;
    return { el, cur: 0, target: 0, hover: 0, mode: el.dataset.lit || 'scroll' };
  });

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .18, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  const hero = document.querySelector('.hero');
  const heroFilm = films.find(f => f.mode === 'hero');
  const depth = document.querySelector('.depth');
  const depthFilms = films.filter(f => f.mode === 'depth');
  const meter = document.querySelector('.depth__meter');
  const line = document.querySelector('.depth__line');
  const scenes = $$('.scene');
  const stops = depthFilms.map(f => ({ m: f.el.dataset.m, t: f.el.dataset.line }));

  const progress = el => {
    const r = el.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - innerHeight));
  };

  function updateHero() {
    if (!hero) return;
    const p = calm ? 1 : progress(hero);
    const light = ease(clamp(p / .6));
    heroFilm.target = Math.max(.14, light);
    hero.style.setProperty('--p', light.toFixed(3));
    const before = hero.querySelector('.hero__before');
    const after = hero.querySelector('.hero__after');
    before.style.opacity = clamp(1 - (p - .44) / .16);
    before.style.transform = `translateY(${-clamp((p - .44) / .16) * 26}px)`;
    after.style.opacity = clamp((p - .6) / .18);
    after.style.transform = `translateY(${(1 - clamp((p - .6) / .18)) * 26}px)`;
    heroFilm.el.style.translate = `0 ${(1 - light) * 3.5}vh`;
    hero.querySelector('.hero__cue').style.opacity = 1 - clamp(p * 6);
  }

  let lastStop = -1;
  function updateDepth() {
    if (!depth) return;
    const p = calm ? 1 : progress(depth);
    const n = depthFilms.length;
    const pos = p * (n - .18);
    const mobile = innerWidth < 768;
    const spread = mobile ? 15 : 7.2;
    const now = Math.min(n - 1, Math.floor(pos));
    depthFilms.forEach((f, i) => {
      const t = ease(clamp(pos - i + .05));
      const rest = i - (n - 1) / 2;
      const settle = ease(clamp(pos - n + 1.5));
      const x = rest * spread * (.45 + settle * .55);
      f.el.style.translate = `${x}vw ${(1 - t) * 105}vh`;
      f.el.style.rotate = `${rest * 3.6}deg`;
      f.el.style.opacity = t > .01 ? 1 : 0;
      f.target = i === now ? 1 : i < now ? .34 : 0;
    });
    depth.style.setProperty('--d', (p).toFixed(3));
    if (now !== lastStop && stops[now]) {
      lastStop = now;
      meter.textContent = stops[now].m;
      line.textContent = stops[now].t;
    }
  }

  function updateFilms() {
    const mid = innerHeight / 2;
    films.forEach(f => {
      if (f.mode !== 'scroll') return;
      const r = f.el.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - mid) / (innerHeight * .72);
      f.target = calm ? 1 : ease(clamp(1.15 - d));
    });
  }

  function updateScenes() {
    scenes.forEach(s => {
      const r = s.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const t = clamp((innerHeight - r.top) / (innerHeight + r.height));
      s.style.setProperty('--z', (calm ? 1.04 : 1.16 - t * .14).toFixed(4));
    });
  }

  let dirty = true;
  addEventListener('scroll', () => { dirty = true; }, { passive: true });
  addEventListener('resize', () => { dirty = true; lastStop = -1; });

  // 光要有慣性,所以數值一路追目標,不是直接跳過去
  function frame() {
    if (dirty) { dirty = false; updateHero(); updateDepth(); updateFilms(); updateScenes(); }
    films.forEach(f => {
      const goal = Math.max(f.target, f.hover);
      if (Math.abs(goal - f.cur) < .002) return;
      f.cur = calm ? goal : f.cur + (goal - f.cur) * .08;
      f.el.style.setProperty('--lit', f.cur.toFixed(3));
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  if (!coarse) {
    const torch = document.querySelector('.torch');
    addEventListener('pointermove', e => {
      torch.style.opacity = 1;
      torch.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    }, { passive: true });
    films.forEach(f => {
      f.el.addEventListener('pointermove', e => {
        const r = f.el.getBoundingClientRect();
        const x = clamp((e.clientX - r.left) / r.width);
        const y = clamp((e.clientY - r.top) / r.height);
        f.hover = 1;
        f.el.style.setProperty('--mx', x.toFixed(3));
        if (!calm) {
          f.el.style.setProperty('--ry', `${(x - .5) * 14}deg`);
          f.el.style.setProperty('--rx', `${(.5 - y) * 8}deg`);
        }
      });
      f.el.addEventListener('pointerleave', () => {
        f.hover = 0;
        f.el.style.setProperty('--ry', '0deg');
        f.el.style.setProperty('--rx', '0deg');
      });
    });
  }

  // 首屏光束裡的微塵
  const canvas = document.querySelector('.hero__dust');
  if (canvas && !calm) {
    const ctx = canvas.getContext('2d');
    let dots = [], w = 0, h = 0, seen = true;
    const size = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
      dots = Array.from({ length: w < 768 ? 26 : 56 }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: .4 + Math.random() * 1.3,
        s: .05 + Math.random() * .2, a: Math.random() * 6.28
      }));
    };
    size();
    addEventListener('resize', size);
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; }).observe(canvas);
    (function dust() {
      if (seen) {
        const lit = .12 + (heroFilm ? heroFilm.cur : 0) * .7;
        ctx.clearRect(0, 0, w, h);
        dots.forEach(d => {
          d.a += .004;
          d.x += Math.cos(d.a) * d.s;
          d.y -= d.s * .6;
          if (d.y < 0) d.y = h;
          ctx.globalAlpha = lit * (.3 + .7 * Math.abs(Math.sin(d.a * 3)));
          ctx.fillStyle = '#ffeccc';
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, 6.28);
          ctx.fill();
        });
      }
      requestAnimationFrame(dust);
    })();
  }

  // 婚宴頁:名字和日期即時印到片上
  const names = document.querySelector('#names');
  const date = document.querySelector('#date');
  const demo = document.querySelector('#demo .film__label');
  if (names && date && demo) {
    const sync = () => {
      const d = date.value ? date.value.replaceAll('-', '.') : '';
      demo.textContent = [names.value.trim(), d].filter(Boolean).join('  ');
    };
    names.addEventListener('input', sync);
    date.addEventListener('input', sync);
    sync();
  }
})();
