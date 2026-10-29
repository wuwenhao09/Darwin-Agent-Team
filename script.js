(() => {
  const routes = ['about', 'research', 'contact'];
  const titles = {
    about: 'Darwin Agent',
    research: 'Research — Darwin Agent',
    contact: 'Contact — Darwin Agent',
  };

  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('[data-menu-toggle]');
  const navigation = document.querySelector('[data-nav]');
  const stage = document.querySelector('[data-page-stage]');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const pages = new Map(
    [...document.querySelectorAll('[data-page]')].map((page) => [page.dataset.page, page]),
  );

  if (!stage || routes.some((route) => !pages.has(route))) return;

  const routeFromHash = () => {
    const route = window.location.hash.slice(1);
    return routes.includes(route) ? route : null;
  };

  let currentRoute = routeFromHash() || 'about';
  let isTurning = false;
  let queuedNavigation = null;
  let touchStart = null;
  const wheel = {
    direction: 0, lastAt: -Infinity, lastDelta: 0,
    peak: 0, trough: Infinity, decayed: false, riseCount: 0, riseAmount: 0,
    amount: 0, canTurn: false, blocked: false, blockedAt: -Infinity,
    smooth: false, scrollingRoute: null,
  };
  const wheelGestureGap = 160;
  const wheelBoundaryPause = 120;
  const wheelTurnThreshold = 12;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const closeMenu = () => {
    if (!menuButton || !navigation) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
    navigation.classList.remove('is-open');
    header?.classList.remove('is-menu-open');
    document.body.classList.remove('menu-open');
  };

  const updateHeader = (scrollTop = window.scrollY) => {
    if (!header) return;
    header.classList.toggle('is-scrolled', currentRoute === 'about' && scrollTop > 24);
  };

  const updateChrome = (route, scrollTop = 0) => {
    document.body.dataset.route = route;
    document.title = titles[route];
    if (themeColor) themeColor.content = route === 'about' ? '#17181c' : '#f7f6f8';

    header?.classList.toggle('site-header--overlay', route === 'about');
    header?.classList.toggle('site-header--light', route !== 'about');

    navigation?.querySelectorAll('a[href^="#"]').forEach((link) => {
      const active = link.getAttribute('href') === `#${route}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    updateHeader(scrollTop);
  };

  const jumpTo = (scrollTop) => {
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, scrollTop);
    root.style.scrollBehavior = previousBehavior;
  };

  const finishTurn = ({ oldPage, newPage, oldInner, newInner, targetScroll }) => {
    const transitionClasses = [
      'is-page-leaving', 'is-page-entering', 'page--underneath', 'page--covering',
      'page--enter-from-bottom', 'page--exit-to-bottom',
    ];

    oldPage.classList.remove(...transitionClasses);
    newPage.classList.remove(...transitionClasses);
    oldPage.classList.remove('is-active');
    oldPage.hidden = true;
    oldPage.setAttribute('aria-hidden', 'true');
    newPage.classList.add('is-active');
    newPage.removeAttribute('aria-hidden');
    oldInner.style.transform = '';
    newInner.style.transform = '';
    stage.classList.remove('is-turning');
    stage.style.removeProperty('--page-turn-width');
    stage.removeAttribute('aria-busy');
    document.body.classList.remove('is-turning');
    jumpTo(targetScroll);
    updateHeader(targetScroll);
    isTurning = false;

    if (queuedNavigation) {
      const next = queuedNavigation;
      queuedNavigation = null;
      navigate(next.route, next);
    }
  };

  const turnTo = (newRoute, direction) => {
    const oldRoute = currentRoute;
    const oldPage = pages.get(oldRoute);
    const newPage = pages.get(newRoute);
    const oldInner = oldPage.querySelector('.page__inner');
    const newInner = newPage.querySelector('.page__inner');
    const oldScroll = window.scrollY;

    closeMenu();
    wheel.scrollingRoute = null;
    wheel.amount = 0;
    wheel.canTurn = false;
    wheel.blocked = true;
    wheel.blockedAt = performance.now();
    currentRoute = newRoute;
    isTurning = true;
    stage.setAttribute('aria-busy', 'true');
    // Fixed layers must keep the same width as the page with its scrollbar gutter.
    stage.style.setProperty('--page-turn-width', `${oldPage.getBoundingClientRect().width}px`);

    oldPage.classList.add('is-page-leaving');
    newPage.classList.add('is-page-entering');
    newPage.hidden = false;
    const targetScroll = direction > 0 ? 0 : Math.max(0, newPage.scrollHeight - window.innerHeight);
    oldInner.style.transform = `translate3d(0, ${-oldScroll}px, 0)`;
    newInner.style.transform = `translate3d(0, ${-targetScroll}px, 0)`;
    newPage.classList.add('is-active');
    newPage.removeAttribute('aria-hidden');
    oldPage.setAttribute('aria-hidden', 'true');

    stage.classList.add('is-turning');
    document.body.classList.add('is-turning');
    updateChrome(newRoute, targetScroll);

    if (direction > 0) {
      oldPage.classList.add('page--underneath');
      newPage.classList.add('page--covering', 'page--enter-from-bottom');
    } else {
      oldPage.classList.add('page--covering', 'page--exit-to-bottom');
      newPage.classList.add('page--underneath');
    }

    const complete = () => finishTurn({ oldPage, newPage, oldInner, newInner, targetScroll });
    const movingPage = direction > 0 ? newPage : oldPage;
    const [animation] = movingPage.getAnimations();
    if (reduceMotion.matches || !animation) complete();
    else animation.finished.then(complete, complete);
  };

  const navigate = (route, options = {}) => {
    if (!routes.includes(route)) return;
    if (route === currentRoute) {
      closeMenu();
      return;
    }

    if (isTurning) {
      queuedNavigation = { route, ...options };
      return;
    }

    const direction = options.direction ?? (routes.indexOf(route) > routes.indexOf(currentRoute) ? 1 : -1);
    if (options.historyMode === 'replace') {
      window.history.replaceState({ route }, '', `#${route}`);
    } else if (options.historyMode !== 'none') {
      window.history.pushState({ route }, '', `#${route}`);
    }
    turnTo(route, direction);
  };

  const turnBy = (direction) => {
    const index = routes.indexOf(currentRoute);
    const route = routes[(index + direction + routes.length) % routes.length];
    navigate(route, { direction });
  };

  const isAtPageBoundary = (direction) => {
    const scroller = document.scrollingElement || document.documentElement;
    const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    return direction > 0 ? scroller.scrollTop >= maxScroll - 4 : scroller.scrollTop <= 4;
  };

  const pauseWheelAtBoundary = () => {
    if (wheel.scrollingRoute !== currentRoute || !isAtPageBoundary(wheel.direction)) return;
    wheel.scrollingRoute = null;
    wheel.canTurn = false;
    wheel.blocked = true;
    // Anchor the pause to reaching the edge, never to the latest momentum event.
    wheel.blockedAt = performance.now();
  };

  pages.forEach((page, route) => {
    const active = route === currentRoute;
    page.hidden = !active;
    page.classList.toggle('is-active', active);
    if (active) page.removeAttribute('aria-hidden');
    else page.setAttribute('aria-hidden', 'true');
  });

  if (!routeFromHash()) window.history.replaceState({ route: currentRoute }, '', `#${currentRoute}`);
  updateChrome(currentRoute, 0);

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const route = link.getAttribute('href').slice(1);
    if (!routes.includes(route)) return;

    event.preventDefault();
    if (link.hasAttribute('data-scroll-top') && route === currentRoute) {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      return;
    }
    navigate(route);
  });

  const handleLocationChange = () => {
    const route = routeFromHash();
    if (route && route !== currentRoute) navigate(route, { historyMode: 'none' });
  };
  window.addEventListener('popstate', handleLocationChange);
  window.addEventListener('hashchange', handleLocationChange);

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const editing = target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    const menuOpen = menuButton?.getAttribute('aria-expanded') === 'true';
    if (event.key === 'Escape' && menuOpen) {
      closeMenu();
      menuButton.focus();
      return;
    }
    if (editing || menuOpen || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (isTurning) {
        event.preventDefault();
        return;
      }
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      if (isAtPageBoundary(direction)) {
        event.preventDefault();
        turnBy(direction);
      }
    }
  });

  window.addEventListener('wheel', (event) => {
    if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    if (menuButton?.getAttribute('aria-expanded') === 'true') return;

    const direction = event.deltaY > 0 ? 1 : -1;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    const delta = Math.abs(event.deltaY) * unit;
    const now = performance.now();
    pauseWheelAtBoundary();
    const gap = now - wheel.lastAt;
    const changedDirection = direction !== wheel.direction;
    const legacyDelta = Math.abs(event.wheelDeltaY || event.wheelDelta || 0);
    const mouseNotch = event.deltaMode !== 0 || ((!wheel.smooth || gap >= wheelGestureGap || changedDirection)
      && legacyDelta >= 120 && legacyDelta % 120 === 0);

    // A smoothed mouse notch can start while the previous notch's tail is still arriving.
    // Look for a sustained rise from a decayed tail, rather than requiring total silence.
    if (wheel.decayed && delta > wheel.lastDelta * 1.2 && delta - wheel.lastDelta >= 0.5) {
      wheel.riseCount += 1;
      wheel.riseAmount += delta;
    } else {
      wheel.riseCount = 0;
      wheel.riseAmount = 0;
    }
    const renewedPulse = wheel.blocked && wheel.decayed && (
      (wheel.riseCount >= 2 && wheel.riseAmount >= 12 && delta >= Math.max(4, wheel.trough * 3))
      || (delta >= 16 && delta >= wheel.lastDelta * 6 && delta >= wheel.trough * 6)
    );
    const startsGesture = changedDirection || gap >= wheelGestureGap
      || (mouseNotch && gap >= 50) || renewedPulse;
    if (startsGesture) {
      wheel.amount = 0;
      wheel.peak = delta;
      wheel.trough = delta;
      wheel.decayed = false;
      wheel.riseCount = 0;
      wheel.riseAmount = 0;
      wheel.smooth = !mouseNotch;
      if (!isTurning && now - wheel.blockedAt >= wheelBoundaryPause) {
        wheel.blocked = false;
        wheel.canTurn = isAtPageBoundary(direction);
      }
    } else {
      wheel.peak = Math.max(wheel.peak, delta);
      if (!wheel.decayed) {
        wheel.trough = delta;
        if (delta <= wheel.peak / 2) wheel.decayed = true;
      } else wheel.trough = Math.min(wheel.trough, delta);
    }
    wheel.direction = direction;
    wheel.lastAt = now;
    wheel.lastDelta = delta;

    if (isTurning || wheel.blocked) {
      event.preventDefault();
      return;
    }

    if (!isAtPageBoundary(direction)) {
      wheel.amount = 0;
      wheel.canTurn = false;
      wheel.scrollingRoute = currentRoute;
      return;
    }

    event.preventDefault();
    if (!wheel.canTurn) {
      wheel.blocked = true;
      wheel.blockedAt = now;
      return;
    }
    wheel.amount += delta;

    if (mouseNotch || wheel.amount >= wheelTurnThreshold) turnBy(direction);
  }, { passive: false });

  document.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1 || isTurning || event.target.closest('a, button')) {
      touchStart = null;
      return;
    }
    touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });

  document.addEventListener('touchend', (event) => {
    if (!touchStart || isTurning || !event.changedTouches.length) return;
    const deltaX = event.changedTouches[0].clientX - touchStart.x;
    const deltaY = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(deltaY) > 72 && Math.abs(deltaY) > Math.abs(deltaX) * 1.3) {
      const direction = deltaY < 0 ? 1 : -1;
      if (isAtPageBoundary(direction)) turnBy(direction);
    }
  }, { passive: true });

  if (menuButton && navigation) {
    menuButton.addEventListener('click', () => {
      const willOpen = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(willOpen));
      menuButton.setAttribute('aria-label', willOpen ? 'Close navigation' : 'Open navigation');
      navigation.classList.toggle('is-open', willOpen);
      header?.classList.toggle('is-menu-open', willOpen);
      document.body.classList.toggle('menu-open', willOpen);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 760) closeMenu();
    });
  }

  document.querySelectorAll('[data-current-year]').forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  window.addEventListener('scroll', () => {
    updateHeader();
    if (!isTurning) pauseWheelAtBoundary();
  }, { passive: true });
})();
