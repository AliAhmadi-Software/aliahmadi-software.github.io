(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const body = document.body;
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const runtime = window.__ALI_RUNTIME__ = {
    version: '0.4.6',
    ready: false,
    errors: [],
    features: {}
  };

  const state = {
    sound: localStorage.getItem('aliSound') !== 'off',
    offline: false,
    audio: null
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>\"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
    }[char]));
  }

  function safeInit(name, fn) {
    try {
      const result = fn();
      runtime.features[name] = result === false ? 'skipped' : 'pass';
    } catch (error) {
      runtime.features[name] = 'fail';
      runtime.errors.push({ name, message: error?.message || String(error) });
      console.error(`[Ali v0.4.6] ${name} failed`, error);
    }
  }

  function hexToRgb(hex) {
    const raw = String(hex || '').replace('#', '');
    const normalized = raw.length === 3 ? raw.split('').map(x => x + x).join('') : raw;
    const n = Number.parseInt(normalized, 16);
    if (!Number.isFinite(n)) return '243,199,124';
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }

  function darkenForLightTheme(hex) {
    const raw = String(hex || '#f3c77c').replace('#', '');
    const normalized = raw.length === 3 ? raw.split('').map(x => x + x).join('') : raw;
    const n = Number.parseInt(normalized, 16);
    if (!Number.isFinite(n)) return '#9a681e';
    const r = Math.round(((n >> 16) & 255) * .62);
    const g = Math.round(((n >> 8) & 255) * .55);
    const b = Math.round((n & 255) * .42);
    return `#${[r,g,b].map(v => v.toString(16).padStart(2,'0')).join('')}`;
  }

  function cue(type = 'click') {
    if (!state.sound) return;
    try {
      state.audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const ctx = state.audio;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const map = {
        click: [430, .028], toggle: [560, .038], success: [720, .055],
        terminal: [310, .022], chat: [620, .045]
      };
      const [freq, dur] = map[type] || map.click;
      osc.type = type === 'terminal' ? 'square' : 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch (_) {
      // Sound is enhancement-only. Never affect the site if WebAudio is unavailable.
    }
  }

  function applyAppearance() {
    const actualTheme = localStorage.getItem('aliTheme') === 'light' ? 'light' : 'dark';
    const accent = '#f3c77c';

    body.dataset.theme = actualTheme;
    body.dataset.font = 'editorial';
    const displayAccent = actualTheme === 'light' ? darkenForLightTheme(accent) : accent;
    root.style.setProperty('--accent', displayAccent);
    root.style.setProperty('--accent-rgb', hexToRgb(displayAccent));
    root.style.setProperty('--gold', displayAccent);
    root.style.setProperty('--gold2', actualTheme === 'light' ? darkenForLightTheme(displayAccent) : (accent.toLowerCase() === '#f3c77c' ? '#fde6a8' : accent));
    root.style.setProperty('--ink-2', displayAccent);
    root.style.setProperty('--ink-3', actualTheme === 'light' ? '#17140f' : '#fde6a8');
    const themeMeta = $('meta[name="theme-color"]');
    if (themeMeta) themeMeta.content = actualTheme === 'light' ? '#f7f4ec' : '#07080b';
  }

  safeInit('appearance', () => {
    applyAppearance();
    const themeToggle = $('#themeToggle');
    const askThemeToggle = $('#askThemeToggle');
    const syncThemeButton = button => {
      if (!button) return;
      const isDark = body.dataset.theme === 'dark';
      button.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
      button.title = isDark ? 'Switch to light theme' : 'Switch to dark theme';
      const glyph = $('span', button);
      if (glyph) glyph.textContent = isDark ? '☼' : '☾';
    };
    const toggleTheme = () => {
      const next = body.dataset.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('aliTheme', next);
      applyAppearance();
      syncThemeButton(themeToggle);
      syncThemeButton(askThemeToggle);
      cue('toggle');
    };
    syncThemeButton(themeToggle);
    syncThemeButton(askThemeToggle);
    themeToggle?.addEventListener('click', toggleTheme);
    askThemeToggle?.addEventListener('click', toggleTheme);
  });

  // Progressive enhancement: content is visible by default. We only hide reveal targets
  // after IntersectionObserver is known to exist and has been attached successfully.
  safeInit('reveal', () => {
    if (!('IntersectionObserver' in window)) return false;
    const targets = $$('.reveal');
    if (!targets.length) return false;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .06, rootMargin: '0px 0px -3% 0px' });
    targets.forEach(element => observer.observe(element));
    root.classList.add('reveal-enabled');
    // Ensure above-the-fold items never wait on the observer callback.
    targets.forEach(element => {
      if (element.getBoundingClientRect().top < innerHeight * 1.05) element.classList.add('visible');
    });
  });

  safeInit('sound-bindings', () => {
    $$('.sound').forEach(element => element.addEventListener('pointerdown', () => cue('click')));
  });

  safeInit('reading-progress', () => {
    const progress = $('#readingProgress');
    const header = $('.site-header');
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (progress) progress.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
      header?.classList.toggle('scrolled', scrollY > 10);
    };
    addEventListener('scroll', update, { passive: true });
    update();
  });

  safeInit('playful-tab-title', () => {
    const askPage = body.classList.contains('chat-body');
    const favicon = $('#dynamicFavicon') || document.querySelector('link[rel~="icon"]');
    const frameBase = 'assets/tab/radar-finds-ali/';
    const staticIcon = 'assets/tab/radar-person.svg';
    const frameCount = 8;
    const frameDelay = 450; // stakeholder selection from Browser Tab Lab v2
    let faviconFrame = 0;
    let faviconTimer = null;
    let titleToken = 0;
    let activeKey = '';
    const titleTimers = [];
    const clearTitleTimers = () => { while (titleTimers.length) clearTimeout(titleTimers.pop()); };
    const later = (fn, ms) => titleTimers.push(setTimeout(fn, ms));
    const framePath = index => `${frameBase}${String(index % frameCount).padStart(2, '0')}.svg`;
    const setFavicon = path => { if (favicon) favicon.href = path; };
    const stopFavicon = () => { clearInterval(faviconTimer); faviconTimer = null; };
    const startFavicon = () => {
      stopFavicon();
      if (!favicon) return;
      if (reduceMotion || document.hidden) { setFavicon(staticIcon); return; }
      setFavicon(framePath(faviconFrame++));
      faviconTimer = setInterval(() => {
        if (document.hidden) return;
        setFavicon(framePath(faviconFrame++));
      }, frameDelay);
    };

    const acquireTitle = (label, settled) => {
      if (document.hidden) return;
      titleToken += 1;
      const token = titleToken;
      clearTitleTimers();
      const frames = [
        `◌ scanning · ${label}`,
        `◍ locating Ali · ${label}`,
        `◎ Ali found · ${label}`,
        `◉ ${settled}`
      ];
      document.title = frames[0];
      later(() => { if (token === titleToken && !document.hidden) document.title = frames[1]; }, 450);
      later(() => { if (token === titleToken && !document.hidden) document.title = frames[2]; }, 900);
      later(() => { if (token === titleToken && !document.hidden) document.title = frames[3]; }, 1350);
    };

    startFavicon();

    if (askPage) {
      const runAskAcquire = () => acquireTitle('Ask Ali', 'Ask Ali · Digital Profile');
      runAskAcquire();
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { stopFavicon(); clearTitleTimers(); }
        else { startFavicon(); runAskAcquire(); }
      });
      return true;
    }

    const sections = [
      { id: 'research', label: '01 Research', settled: '01 · Research & publications — Ali Ahmadi' },
      { id: 'journey', label: '02 Journey', settled: '02 · Academic journey — Ali Ahmadi' },
      { id: 'achievements', label: '03 Achievements', settled: '03 · Achievements — Ali Ahmadi' },
      { id: 'terminal', label: '04 Terminal', settled: '04 · Terminal profile — Ali Ahmadi' },
      { id: 'skills', label: '05 Expertise', settled: '05 · Skills & expertise — Ali Ahmadi' },
      { id: 'toolkit', label: '06 Toolkit', settled: '06 · Technical toolkit — Ali Ahmadi' },
      { id: 'projects', label: '07 Projects', settled: '07 · Projects — Ali Ahmadi' },
      { id: 'ask-preview', label: '08 Ask Ali', settled: '08 · Ask Ali — Ali Ahmadi' },
      { id: 'references', label: '10 Ref', settled: '10 · References — Ali Ahmadi' }
    ];
    const activate = meta => {
      const key = meta?.id || 'hero';
      if (key === activeKey) return;
      activeKey = key;
      if (!meta) acquireTitle('Ali Ahmadi', 'Ali Ahmadi · Research & Systems');
      else acquireTitle(meta.label, meta.settled);
    };
    if ('IntersectionObserver' in window) {
      const lookup = new Map(sections.map(meta => [meta.id, meta]));
      const observer = new IntersectionObserver(entries => {
        const visible = entries.filter(entry => entry.isIntersecting)
          .sort((a,b) => Math.abs(a.boundingClientRect.top - innerHeight * .34) - Math.abs(b.boundingClientRect.top - innerHeight * .34));
        if (visible.length) activate(lookup.get(visible[0].target.id));
        else if (scrollY < innerHeight * .42) activate(null);
      }, { rootMargin: '-18% 0px -56% 0px', threshold: 0 });
      sections.forEach(meta => { const element = document.getElementById(meta.id); if (element) observer.observe(element); });
    }
    activate(null);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { stopFavicon(); clearTitleTimers(); }
      else {
        startFavicon();
        if (activeKey === 'hero') acquireTitle('Ali Ahmadi', 'Ali Ahmadi · Research & Systems');
        else {
          const meta = sections.find(item => item.id === activeKey);
          if (meta) acquireTitle(meta.label, meta.settled);
        }
      }
    });
    return true;
  });

  safeInit('mobile-navigation' , () => {
    const button = $('#mobileNavBtn');
    const menu = $('#mobileNav');
    if (!button || !menu) return false;
    const setOpen = open => {
      button.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('open', open);
      menu.setAttribute('aria-hidden', String(!open));
      body.classList.toggle('nav-open', open);
    };
    button.addEventListener('click', () => { setOpen(!menu.classList.contains('open')); cue('toggle'); });
    $$('#mobileNav a').forEach(link => link.addEventListener('click', () => setOpen(false)));
    addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false); });
    addEventListener('resize', () => { if (innerWidth > 1060) setOpen(false); }, { passive: true });
  });

  safeInit('cursor-aura', () => {
    const aura = $('#cursorSpotlight');
    const finePointer = window.matchMedia('(pointer:fine)').matches;
    if (!aura || !finePointer) return false;
    let targetX = innerWidth * .5, targetY = innerHeight * .45;
    let currentX = targetX, currentY = targetY;
    let frame = 0;
    const render = () => {
      const easing = reduceMotion ? 1 : .14;
      currentX += (targetX - currentX) * easing;
      currentY += (targetY - currentY) * easing;
      aura.style.left = `${currentX.toFixed(1)}px`;
      aura.style.top = `${currentY.toFixed(1)}px`;
      frame = requestAnimationFrame(render);
    };
    addEventListener('pointermove', event => {
      targetX = event.clientX;
      targetY = event.clientY;
      aura.classList.add('is-active');
    }, { passive: true });
    addEventListener('mouseout', event => { if (!event.relatedTarget) aura.classList.remove('is-active'); });
    addEventListener('blur', () => aura.classList.remove('is-active'));
    render();
    return () => cancelAnimationFrame(frame);
  });

  safeInit('back-to-top', () => {
    const control = $('#backToTop');
    if (!control) return false;
    control.addEventListener('click', event => {
      event.preventDefault();
      const behavior = reduceMotion ? 'auto' : 'smooth';
      try { window.scrollTo({ top: 0, left: 0, behavior }); }
      catch (_) { window.scrollTo(0, 0); }
      history.replaceState(null, '', location.pathname + location.search);
      cue('click');
    });
  });

  safeInit('magnetic-buttons', () => {
    if (reduceMotion) return false;
    $$('.magnetic').forEach(element => {
      element.addEventListener('pointermove', event => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * .11;
        const y = (event.clientY - rect.top - rect.height / 2) * .15;
        element.style.transform = `translate(${x}px,${y}px)`;
      });
      element.addEventListener('pointerleave', () => { element.style.transform = ''; });
    });
  });

  safeInit('button-ripple', () => {
    $$('.button').forEach(element => element.addEventListener('pointerdown', event => {
      const rect = element.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      element.append(ripple);
      setTimeout(() => ripple.remove(), 650);
    }));
  });

  safeInit('card-tilt', () => {
    if (reduceMotion) return false;
    $$('.tilt').forEach(element => {
      element.addEventListener('pointermove', event => {
        const rect = element.getBoundingClientRect();
        const rx = ((event.clientY - rect.top) / rect.height - .5) * -2.2;
        const ry = ((event.clientX - rect.left) / rect.width - .5) * 2.6;
        element.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-1px)`;
      });
      element.addEventListener('pointerleave', () => { element.style.transform = ''; });
    });
  });

  safeInit('hero-typewriter', () => {
    const name = $('#heroName');
    const specialty = $('#specialtyText');
    if (!name || !specialty) return false;

    const nameText = name.dataset.text || 'Ali Ahmadi';
    const specialties = [
      'Federated Learning',
      'LLMs & SLMs',
      'Edge Computing',
      'Cloud Computing',
      'Distributed Systems',
      'Data Engineering',
      'Computer Vision',
      'AI for Software Engineering'
    ];

    if (reduceMotion) {
      name.textContent = nameText;
      specialty.textContent = specialties[0];
      return true;
    }

    const wait = delay => new Promise(resolve => setTimeout(resolve, delay));
    const type = async (element, text, speed) => {
      element.textContent = '';
      for (const character of text) {
        element.textContent += character;
        const naturalPause = character === ' ' ? 48 : Math.round(Math.random() * 34);
        await wait(speed + naturalPause);
      }
    };
    const erase = async (element, speed) => {
      while (element.textContent) {
        element.textContent = element.textContent.slice(0, -1);
        await wait(speed);
      }
    };

    const run = async () => {
      await type(name, nameText, 92);
      await wait(620);
      let index = 0;
      while (specialty.isConnected) {
        await type(specialty, specialties[index], 48);
        await wait(1450);
        await erase(specialty, 28);
        await wait(360);
        index = (index + 1) % specialties.length;
      }
    };

    name.textContent = '';
    specialty.textContent = '';
    run();
    return true;
  });

  safeInit('github-activity', () => {
    const activity = $('#githubActivity');
    if (!activity) return false;

    const username = activity.dataset.username || 'AliAhmadi-Software';
    const grid = $('#githubGrid', activity);
    const months = $('#githubMonths', activity);
    const avatar = $('#githubAvatar', activity);
    const name = $('#githubName', activity);
    const contributionTotal = $('#githubContributions', activity);
    const activeDays = $('#githubActiveDays', activity);
    const publicRepos = $('#githubRepos', activity);
    const status = $('#githubStatus', activity);
    const number = new Intl.NumberFormat('en-US');

    if (!grid || !months || !status) return false;

    const levelFor = item => {
      const supplied = Number(item.level);
      if (Number.isFinite(supplied)) return Math.max(0, Math.min(4, supplied));
      const count = Number(item.count) || 0;
      if (!count) return 0;
      if (count < 4) return 1;
      if (count < 8) return 2;
      if (count < 15) return 3;
      return 4;
    };

    const addCell = (week, day, level = 0, title = '') => {
      const cell = document.createElement('span');
      cell.className = 'github-cell';
      cell.dataset.level = String(level);
      cell.style.gridColumn = String(week + 1);
      cell.style.gridRow = String(day + 1);
      if (title) cell.title = title;
      grid.append(cell);
    };

    const renderSkeleton = () => {
      grid.textContent = '';
      grid.style.setProperty('--weeks', '53');
      for (let week = 0; week < 53; week += 1) {
        for (let day = 0; day < 7; day += 1) addCell(week, day);
      }
    };

    const renderCalendar = contributions => {
      if (!Array.isArray(contributions) || !contributions.length) {
        throw new Error('Contribution history is empty.');
      }

      grid.textContent = '';
      months.textContent = '';

      const firstDate = new Date(`${contributions[0].date}T00:00:00`);
      const firstSunday = new Date(firstDate);
      firstSunday.setDate(firstSunday.getDate() - firstSunday.getDay());
      const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
      const monthPositions = new Map();
      let lastWeek = 0;

      contributions.forEach(item => {
        const date = new Date(`${item.date}T00:00:00`);
        if (Number.isNaN(date.getTime())) return;
        const week = Math.floor((date - firstSunday) / millisecondsPerWeek);
        const day = date.getDay();
        const count = Math.max(0, Number(item.count) || 0);
        const label = `${number.format(count)} contribution${count === 1 ? '' : 's'} on ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        addCell(week, day, levelFor(item), label);
        lastWeek = Math.max(lastWeek, week);

        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (date.getDate() <= 7 && !monthPositions.has(monthKey)) {
          monthPositions.set(monthKey, {
            label: date.toLocaleDateString('en-US', { month: 'short' }),
            week
          });
        }
      });

      const weekCount = Math.max(1, lastWeek + 1);
      grid.style.setProperty('--weeks', String(weekCount));
      months.style.setProperty('--weeks', String(weekCount));
      monthPositions.forEach(({ label, week }) => {
        const month = document.createElement('span');
        month.textContent = label;
        month.style.gridColumn = `${week + 1} / span 4`;
        months.append(month);
      });
      grid.classList.remove('is-loading');
    };

    renderSkeleton();

    const requestJson = url => fetch(url, {
      headers: { Accept: 'application/json' },
      referrerPolicy: 'strict-origin-when-cross-origin'
    }).then(response => {
      if (!response.ok) throw new Error(`GitHub request failed with ${response.status}.`);
      return response.json();
    });

    Promise.allSettled([
      requestJson(`https://api.github.com/users/${encodeURIComponent(username)}`),
      requestJson(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(username)}?y=last`)
    ]).then(([profileResult, contributionsResult]) => {
      let liveSources = 0;

      if (profileResult.status === 'fulfilled') {
        const profile = profileResult.value;
        if (avatar && profile.avatar_url) avatar.src = profile.avatar_url;
        if (name && profile.name) name.textContent = profile.name;
        if (publicRepos && Number.isFinite(Number(profile.public_repos))) {
          publicRepos.textContent = number.format(Number(profile.public_repos));
        }
        liveSources += 1;
      }

      if (contributionsResult.status === 'fulfilled') {
        const contributions = contributionsResult.value?.contributions;
        try {
          renderCalendar(contributions);
          const total = contributions.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
          const active = contributions.filter(item => Number(item.count) > 0).length;
          if (contributionTotal) contributionTotal.textContent = number.format(total);
          if (activeDays) activeDays.textContent = number.format(active);
          liveSources += 1;
        } catch (_) {
          grid.classList.remove('is-loading');
        }
      } else {
        grid.classList.remove('is-loading');
      }

      const updated = new Date().toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      activity.setAttribute('aria-busy', 'false');
      activity.classList.toggle('has-live-data', liveSources > 0);
      status.innerHTML = liveSources > 0
        ? `<i></i>Live · @${escapeHtml(username)} · updated ${escapeHtml(updated)}`
        : `<i></i>Live data unavailable · <a href="https://github.com/${encodeURIComponent(username)}" rel="noreferrer" target="_blank">view GitHub profile ↗</a>`;
    });

    return true;
  });

  safeInit('paper-cards', () => {
    $$('.paper-toggle').forEach(button => button.addEventListener('click', () => {
      const card = button.closest('.paper-card');
      if (!card) return;
      const open = card.classList.toggle('expanded');
      button.setAttribute('aria-expanded', String(open));
      const icon = $('span', button);
      if (icon) icon.textContent = open ? '−' : '+';
      cue('toggle');
    }));
  });

  safeInit('research-map', () => {
    const mapText = {
      adaptive: 'Adaptive systems is the connective theme: efficient models, distributed adaptation and deployable software under real constraints.',
      fl: 'Federated Learning connects directly to MAB-RAFD and Ali’s thesis direction around adaptive LLM systems for federated and edge environments.',
      llm: 'LLMs / SLMs connect to both current works: compact log-analysis models in EdgeLog and federated LoRA adaptation in MAB-RAFD.',
      edge: 'Edge + Cloud frames the deployment side of Ali’s research interests: efficiency, communication constraints, cloud infrastructure and distributed execution.',
      data: 'Data + Logs connects most directly to EdgeLog, while the CV also lists Spark, Kafka, Hadoop and data engineering among Ali’s technical skills.'
    };
    $$('.map-node').forEach(button => button.addEventListener('click', () => {
      $$('.map-node').forEach(x => x.classList.remove('active'));
      button.classList.add('active');
      const description = $('#mapDescription');
      if (description) description.textContent = mapText[button.dataset.map] || mapText.adaptive;
      $$('.paper-card').forEach(x => x.classList.remove('highlight'));
      if (button.dataset.map === 'fl') $('#mab-rafd')?.classList.add('highlight');
      if (['llm', 'adaptive'].includes(button.dataset.map)) $$('.paper-card').forEach(x => x.classList.add('highlight'));
      if (button.dataset.map === 'data') $('#edgelog')?.classList.add('highlight');
      cue('toggle');
    }));
  });

  safeInit('avatar-journey', () => {
    const journey = $('#journeyStage');
    const person = $('#journeyPerson');
    const complete = $('#journeyComplete');
    const preview = $('#journeyPreview');
    const radar = $('#journeyRadar');
    const replay = $('#journeyReplay');
    if (!journey || !person || !complete || !radar) return false;

    const points = $$('.journey-point[data-stop]');
    let played = false;
    let playing = false;
    let timers = [];
    let previewTimer = null;
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; clearTimeout(previewTimer); };
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const stationPos = point => 7 + Number(point.dataset.stop) * 86;
    const clearLocks = () => points.forEach(point => point.classList.remove('radar-lock'));
    const setVisited = index => points.forEach((point, i) => {
      point.classList.toggle('visited', i <= index);
      point.classList.toggle('active', i === index);
    });
    const showPreview = (point, keep = 1350) => {
      if (!preview || !point) return;
      const image = $('#journeyPreviewImg');
      const kicker = $('#journeyPreviewKicker');
      const title = $('#journeyPreviewTitle');
      const note = $('#journeyPreviewNote');
      if (image && point.dataset.img) { image.src = point.dataset.img; image.alt = point.dataset.title || 'Academic milestone'; }
      if (kicker) kicker.textContent = point.dataset.kicker || '';
      if (title) title.textContent = point.dataset.title || '';
      if (note) note.textContent = point.dataset.note || '';
      // Let the card rise near the milestone that was just passed, while clamping
      // the edge stations so the card never leaves the stage.
      const cardX = Math.max(27, Math.min(73, stationPos(point)));
      preview.style.left = `${cardX}%`;
      preview.classList.remove('show');
      void preview.offsetWidth;
      preview.classList.add('show');
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => preview.classList.remove('show'), keep);
    };
    const setProgress = (position, duration = 1000) => {
      person.style.transitionDuration = `${duration}ms`;
      complete.style.transitionDuration = `${duration}ms`;
      person.style.left = `${position}%`;
      complete.style.width = `${Math.max(0, Math.min(100, ((position - 7) / 86) * 100))}%`;
    };
    const acquire = (point, duration = 620) => {
      if (!point) return;
      clearLocks();
      radar.style.left = `${stationPos(point)}%`;
      radar.classList.remove('locked');
      radar.classList.add('acquiring');
      point.classList.add('radar-lock');
      cue('toggle');
      later(() => {
        radar.classList.remove('acquiring');
        radar.classList.add('locked');
      }, Math.max(260, duration - 180));
    };
    const travelTo = (position, duration, onArrival) => {
      person.classList.add('travelling');
      setProgress(position, duration);
      later(() => {
        person.classList.remove('travelling');
        onArrival?.();
      }, duration + 30);
    };
    const reset = () => {
      clearTimers();
      playing = false;
      replay?.classList.remove('show');
      preview?.classList.remove('show');
      radar.classList.remove('acquiring','locked');
      clearLocks();
      points.forEach(point => point.classList.remove('visited','active'));
      person.classList.remove('travelling');
      person.style.transitionDuration = '0ms';
      complete.style.transitionDuration = '0ms';
      person.style.left = '5%';
      complete.style.width = '0%';
      radar.style.left = `${stationPos(points[0])}%`;
      void person.offsetWidth;
    };

    const play = () => {
      if (playing) return;
      reset();
      played = true;
      playing = true;
      const kamal = points[0], nosh = points[1], iust = points[2];
      const kamalStation = stationPos(kamal);
      const noshStation = stationPos(nosh);
      const iustStation = stationPos(iust);
      const kamalPass = Math.min(kamalStation + 8, noshStation - 8);
      const noshPass = Math.min(noshStation + 8, iustStation - 7);

      // Acquire Kamal, pass it, then reveal the institution card.
      later(() => acquire(kamal), 260);
      later(() => travelTo(kamalPass, 1050, () => {
        radar.classList.remove('locked'); clearLocks(); setVisited(0); showPreview(kamal, 1400); cue('success');
      }), 920);

      // Acquire Noshirvani only after Kamal has been passed and acknowledged.
      later(() => { preview?.classList.remove('show'); acquire(nosh); }, 2850);
      later(() => travelTo(noshPass, 1250, () => {
        radar.classList.remove('locked'); clearLocks(); setVisited(1); showPreview(nosh, 1500); cue('success');
      }), 3520);

      // Final acquisition: arrive at IUST and stay there. Future remains dotted.
      later(() => { preview?.classList.remove('show'); acquire(iust); }, 5720);
      later(() => travelTo(iustStation, 1280, () => {
        radar.classList.remove('locked'); clearLocks(); setVisited(2); showPreview(iust, 1750); cue('success');
      }), 6420);
      later(() => {
        playing = false;
        preview?.classList.remove('show');
        replay?.classList.add('show');
      }, 8850);
    };

    points.forEach((point, index) => point.addEventListener('click', () => {
      if (playing) return;
      clearTimers(); preview?.classList.remove('show'); replay?.classList.add('show');
      acquire(point, 420);
      const station = stationPos(point);
      const destination = index < points.length - 1 ? Math.min(station + 8, index === 0 ? stationPos(points[1]) - 8 : stationPos(points[2]) - 7) : station;
      later(() => travelTo(destination, 700, () => {
        radar.classList.remove('locked'); clearLocks(); setVisited(index); showPreview(point, 1600);
      }), 500);
    }));
    replay?.addEventListener('click', play);

    if (reduceMotion) {
      reset();
      const iust = points[2];
      setProgress(stationPos(iust), 0);
      setVisited(2);
      showPreview(iust, 2400);
      replay?.classList.add('show');
      return true;
    }
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting) && !played) { play(); observer.disconnect(); }
      }, { threshold: .38 });
      observer.observe(journey);
    } else {
      play();
    }
    return true;
  });

  safeInit('skills' , () => {
    const skillData = {
      ai: { title: 'AI / ML', text: 'TensorFlow, Keras, Scikit-Learn, Pandas and NumPy support model experimentation and data work, while Ali’s current research focuses on compact LLMs and federated adaptation.', evidence: ['EdgeLog', 'MAB-RAFD', 'LLMs / SLMs'], nodes: ['ai', 'fl'] },
      data: { title: 'Data Engineering', text: 'Apache Spark, Kafka and the Hadoop ecosystem appear in the supplied CV alongside SQL and Python, framing large-scale data processing and streaming work.', evidence: ['Spark', 'Kafka', 'HDFS'], nodes: ['data'] },
      backend: { title: 'Backend Systems', text: 'Django, DRF, GraphQL, PostgreSQL, MySQL and MongoDB form the backend/database layer listed in the current CV.', evidence: ['Django / DRF', 'GraphQL', 'SQL + NoSQL'], nodes: ['backend'] },
      devops: { title: 'Cloud / DevOps', text: 'Docker, Kubernetes, Git, CI/CD and Linux align with Ali’s systems and deployment interests, especially practical model delivery and distributed infrastructure.', evidence: ['Docker', 'Kubernetes', 'CI/CD'], nodes: ['devops', 'cloud'] },
      fl: { title: 'Federated Learning', text: 'A core research interest and direct context for MAB-RAFD, federated LoRA and the M.Sc. thesis direction.', evidence: ['MAB-RAFD', 'Federated LoRA', 'M.Sc. Thesis'], nodes: ['fl', 'ai'] },
      cloud: { title: 'Cloud / Edge', text: 'Cloud computing, edge computing, auto-scaling and distributed systems are explicitly listed research interests in the supplied CV.', evidence: ['Edge Computing', 'Cloud Computing', 'Distributed Systems'], nodes: ['cloud', 'devops'] }
    };
    const setSkill = domain => {
      const data = skillData[domain] || skillData.ai;
      const panel = $('#skillDetail');
      if (panel) {
        const heading = $('h3', panel);
        const paragraph = $('p', panel);
        const evidence = $('.skill-evidence', panel);
        if (heading) heading.textContent = data.title;
        if (paragraph) paragraph.textContent = data.text;
        if (evidence) evidence.innerHTML = data.evidence.map(item => `<span>${escapeHtml(item)}</span>`).join('');
      }
      $$('.skill-ring').forEach(x => {
        const active = x.dataset.domain === domain;
        x.classList.toggle('active', active);
        x.setAttribute('aria-selected', String(active));
      });
      $$('.skill-node').forEach(x => x.classList.toggle('active', data.nodes.includes(x.dataset.domain)));
      cue('toggle');
    };
    $$('.skill-ring,.skill-node').forEach(element => element.addEventListener('click', () => setSkill(element.dataset.domain)));
    const initial = $('.skill-ring.active')?.dataset.domain || $('.skill-ring')?.dataset.domain;
    if (initial) setSkill(initial);
  });

  safeInit('achievement-vault', () => {
    const dialog = $('#vaultDialog');
    const record = $('#vaultRecord');
    $$('.achievement-card').forEach(card => card.addEventListener('click', () => {
      const title = $('h3', card)?.textContent || 'Achievement';
      const detail = card.dataset.detail || '';
      if (record) record.innerHTML = `<span class="eyebrow">Vault record · ${escapeHtml(title)}</span><p>${escapeHtml(detail)}</p>`;
      if (dialog?.showModal) {
        const titleNode = $('#vaultTitle');
        const textNode = $('#vaultText');
        if (titleNode) titleNode.textContent = title;
        if (textNode) textNode.textContent = detail;
        dialog.showModal();
      }
      cue('success');
    }));
    $('#vaultClose')?.addEventListener('click', () => dialog?.close());
    dialog?.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  });

  safeInit('terminals', () => {
    const commandResponses = {
      help: 'Commands: whoami · research · projects · skills · education · teaching · contact · cv · clear',
      whoami: 'Ali Ahmadi — M.Sc. Computer Engineering (Software), IUST. Research interests include federated learning, LLMs/SLMs, edge/cloud computing, distributed systems and AI for software engineering.',
      research: 'Current supplied-CV works:\n01  EdgeLog — Under Review · ICSE 2027\n02  MAB-RAFD — Manuscript Ready for Submission',
      projects: 'Current academic project focus: EdgeLog and MAB-RAFD. Additional GitHub repositories should be curated before final portfolio inclusion.',
      skills: 'Python · SQL · Bash | TensorFlow · Keras · Scikit-Learn | Spark · Kafka · Hadoop | Django · DRF · GraphQL | Docker · Kubernetes · CI/CD · Linux',
      education: 'IUST — M.Sc. Computer Engineering, Software · 2024–Present\nBabol Noshirvani University of Technology — B.Sc. Computer Engineering · 2018–2024',
      teaching: 'Supplied CV: TA for Software Architecture and Advanced Software Engineering; visiting lecturer teaching Database Systems and Advanced Programming.',
      contact: 'Email: aliahmadi79sh@gmail.com\nGitHub: github.com/AliAhmadi-Software\nLinkedIn: linkedin.com/in/ali-ahmadi-79ah/',
      cv: 'CV download is available from the header button.'
    };

    const print = (output, rawCommand) => {
      if (!output) return;
      const command = String(rawCommand || '').trim().toLowerCase();
      if (!command) return;
      if (command === 'clear') { output.innerHTML = ''; return; }
      const paragraph = document.createElement('p');
      paragraph.innerHTML = `<span class="prompt">$</span> ${escapeHtml(command)}\n${escapeHtml(commandResponses[command] || `Unknown command: ${command}. Type help.`)}`;
      output.append(paragraph);
      output.scrollTop = output.scrollHeight;
      cue('terminal');
    };

    const bind = (form, input, output) => {
      form?.addEventListener('submit', event => {
        event.preventDefault();
        print(output, input?.value);
        if (input) input.value = '';
      });
    };

    const visibleOutput = $('#visibleTerminalOutput');
    bind($('#visibleTerminalForm'), $('#visibleTerminalInput'), visibleOutput);
    $$('.terminal-command').forEach(button => button.addEventListener('click', () => print(visibleOutput, button.dataset.command)));

    const hidden = $('#hiddenTerminal');
    bind($('#hiddenTerminalForm'), $('#hiddenTerminalInput'), $('#hiddenTerminalOutput'));
    addEventListener('keydown', event => {
      if (event.altKey && event.key.toLowerCase() === 't') {
        event.preventDefault();
        if (!hidden) return;
        hidden.classList.toggle('open');
        const open = hidden.classList.contains('open');
        hidden.setAttribute('aria-hidden', String(!open));
        if (open) $('#hiddenTerminalInput')?.focus();
        cue('terminal');
      }
      if (event.key === 'Escape' && hidden?.classList.contains('open')) {
        hidden.classList.remove('open');
        hidden.setAttribute('aria-hidden', 'true');
      }
    });
    $('#hiddenTerminalClose')?.addEventListener('click', () => {
      hidden?.classList.remove('open');
      hidden?.setAttribute('aria-hidden', 'true');
    });
  });

  safeInit('ask-ali', () => {
    const chatForm = $('#chatForm');
    const chatInput = $('#chatInput');
    const chatLog = $('#chatLog');
    if (!chatForm || !chatInput || !chatLog) return false;

    const answers = [
      { keys: ['research', 'interest'], markdown: `Ali’s current research sits at the intersection of **adaptive AI systems** and **distributed software**.\n\n## Core research areas\n\n- Federated Learning\n- LLMs and SLMs\n- Edge and Cloud Computing\n- Auto-Scaling and Distributed Systems\n- Data Engineering\n- Computer Vision\n- AI for Software Engineering\n\nHis M.Sc. thesis focuses on **Adaptive and Efficient LLM Systems for Federated and Edge Environments**.` },
      { keys: ['edgelog', 'log'], markdown: `## EdgeLog\n\n**EdgeLog: When a 0.5B Framework Rivals 7B LLMs in Log Analysis** is one of Ali’s current research works.\n\n### What it explores\n\n- Compact language models for log analysis\n- Efficiency compared with substantially larger 7B baselines\n- Practical deployment constraints\n\n### Current status\n\n**Under Review — ICSE 2027**\n\nThe public site should not present it as a published paper until that status changes.` },
      { keys: ['mab', 'rafd', 'lora', 'federated'], markdown: `## MAB-RAFD\n\nMAB-RAFD is a **bandit-controlled, role-adaptive factor-decoupling approach for Federated LoRA**.\n\n### Research goal\n\nIt targets adaptive and communication-efficient model personalization in federated settings.\n\n### Current status\n\n**Manuscript Ready for Submission**` },
      { keys: ['teach', 'course', 'lecturer', 'ta'], markdown: `Ali’s supplied CV includes both **teaching-assistant** and **lecturer** experience.\n\n## Teaching experience\n\n- TA — Software Architecture\n- TA — Advanced Software Engineering\n- Visiting Lecturer — Database Systems\n- Visiting Lecturer — Advanced Programming\n\nThe CV also describes project supervision, grading support and development of course material.` },
      { keys: ['education', 'university', 'iust'], markdown: `## Education\n\n### Iran University of Science and Technology\n\n**M.Sc. in Computer Engineering — Software**  \n2024 — Present\n\n- GPA: **18.63 / 20**\n- Supervisor: **Dr. Mehrdad Ashtiani**\n- Thesis: *Adaptive and Efficient LLM Systems for Federated and Edge Environments*\n\n### Babol Noshirvani University of Technology\n\n**B.Sc. in Computer Engineering**  \n2018 — 2024` },
      { keys: ['contact', 'email', 'github', 'linkedin'], markdown: `## Contact Ali\n\n- **Email:** [aliahmadi79sh@gmail.com](mailto:aliahmadi79sh@gmail.com)\n- **GitHub:** [AliAhmadi-Software](https://github.com/AliAhmadi-Software)\n- **LinkedIn:** [ali-ahmadi-79ah](https://www.linkedin.com/in/ali-ahmadi-79ah/)\n\nIf the production AI layer is unavailable, these direct channels remain the fallback.` }
    ];
    const fallbackMarkdown = `I only answer questions supported by Ali’s current profile evidence in this demo.\n\n### Try asking about\n\n- Research interests\n- EdgeLog\n- MAB-RAFD\n- Education\n- Teaching\n- Contact information`;
    const respond = question => {
      const text = question.toLowerCase();
      const match = answers.find(answer => answer.keys.some(key => text.includes(key)));
      return match?.markdown || fallbackMarkdown;
    };

    const inlineMarkdown = raw => {
      let text = escapeHtml(raw);
      text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
      text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
      return text;
    };
    const renderMarkdown = markdown => {
      const lines = String(markdown || '').replace(/\r/g, '').split('\n');
      const html = [];
      let list = null;
      let code = false;
      let codeLines = [];
      const closeList = () => { if (list) { html.push(`</${list}>`); list = null; } };
      for (const line of lines) {
        if (/^```/.test(line.trim())) {
          closeList();
          if (!code) { code = true; codeLines = []; }
          else { html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`); code = false; codeLines = []; }
          continue;
        }
        if (code) { codeLines.push(line); continue; }
        if (!line.trim()) { closeList(); continue; }
        const heading = line.match(/^(#{2,4})\s+(.+)$/);
        if (heading) { closeList(); const level = heading[1].length; html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`); continue; }
        const bullet = line.match(/^[-*]\s+(.+)$/);
        if (bullet) { if (list !== 'ul') { closeList(); list='ul'; html.push('<ul>'); } html.push(`<li>${inlineMarkdown(bullet[1])}</li>`); continue; }
        const ordered = line.match(/^\d+\.\s+(.+)$/);
        if (ordered) { if (list !== 'ol') { closeList(); list='ol'; html.push('<ol>'); } html.push(`<li>${inlineMarkdown(ordered[1])}</li>`); continue; }
        const quote = line.match(/^>\s?(.+)$/);
        if (quote) { closeList(); html.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`); continue; }
        closeList();
        html.push(`<p>${inlineMarkdown(line).replace(/\s{2}$/,'<br>')}</p>`);
      }
      closeList();
      if (code) html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      return html.join('');
    };

    const appendUser = question => {
      const turn = document.createElement('section');
      turn.className = 'conversation-turn user-turn';
      turn.innerHTML = `<div class="turn-label">You</div><div class="user-prompt">${escapeHtml(question)}</div>`;
      chatLog.append(turn);
    };
    const appendAssistant = markdown => {
      const turn = document.createElement('article');
      turn.className = 'conversation-turn assistant-turn';
      turn.innerHTML = `<div class="assistant-meta"><img src="assets/ali-avatar.jpg" alt=""><div><strong>Ali</strong><span>Digital profile · evidence-backed demo</span></div></div><div class="markdown-body">${renderMarkdown(markdown)}</div>`;
      chatLog.append(turn);
    };
    const appendTyping = () => {
      const typing = document.createElement('div');
      typing.className = 'assistant-typing';
      typing.innerHTML = `<img src="assets/ali-avatar.jpg" alt=""><span>Ali is composing</span><span class="typing" aria-label="Typing"><i></i><i></i><i></i></span>`;
      chatLog.append(typing);
      return typing;
    };
    const sendQuestion = question => {
      if (!question || state.offline) return;
      body.classList.add('conversation-active');
      appendUser(question);
      const typing = appendTyping();
      chatLog.scrollTop = chatLog.scrollHeight;
      cue('chat');
      setTimeout(() => {
        typing.remove();
        appendAssistant(respond(question));
        chatLog.scrollTop = chatLog.scrollHeight;
        cue('success');
      }, 650);
    };

    const resizeComposer = () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = `${Math.min(chatInput.scrollHeight, 240)}px`;
    };
    chatInput.addEventListener('input', resizeComposer);
    chatInput.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); chatForm.requestSubmit(); }
    });
    chatForm.addEventListener('submit', event => {
      event.preventDefault();
      const question = chatInput.value.trim();
      chatInput.value = '';
      resizeComposer();
      sendQuestion(question);
    });
    $$('.suggestion').forEach(button => button.addEventListener('click', () => sendQuestion(button.dataset.question)));
    $('#offlineToggle')?.addEventListener('click', () => {
      state.offline = !state.offline;
      $('#offlineBanner')?.classList.toggle('show', state.offline);
      chatInput.disabled = state.offline;
      const send = $('.chat-input button[type="submit"]');
      if (send) send.disabled = state.offline;
      const label = $('#chatModeLabel');
      if (label) label.textContent = state.offline ? 'Offline fallback active' : 'Local evidence-backed demo';
      const toggle = $('#offlineToggle');
      if (toggle) {
        const toggleLabel = state.offline ? 'Restore demo AI' : 'Simulate offline';
        toggle.setAttribute('aria-pressed', String(state.offline));
        toggle.setAttribute('aria-label', toggleLabel);
        toggle.title = toggleLabel;
      }
      cue(state.offline ? 'toggle' : 'success');
    });
    return true;
  });

  runtime.ready = true;
  root.dataset.runtime = runtime.errors.length ? 'degraded' : 'ready';
  window.dispatchEvent(new CustomEvent('ali:runtime-ready', { detail: runtime }));
})();
