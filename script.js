(() => {
  const routes = ['about', 'research', 'contact'];
  const labels = { about: 'About', research: 'Research', contact: 'Contact' };
  const titles = {
    about: 'Darwin Agent',
    research: 'Research — Darwin Agent',
    contact: 'Contact — Darwin Agent',
  };

  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('[data-menu-toggle]');
  const navigation = document.querySelector('[data-nav]');
  const stage = document.querySelector('[data-page-stage]');
  const previousButton = document.querySelector('[data-previous-page]');
  const nextButton = document.querySelector('[data-next-page]');
  const pageNumber = document.querySelector('[data-page-number]');
  const pageName = document.querySelector('[data-page-name]');
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
  let wheelAmount = 0;
  let wheelDirection = 0;
  let wheelLastAt = 0;
  let waitForWheelGestureEnd = false;
  let wheelEndTimer = null;
  const scrollPositions = { about: 0, research: 0, contact: 0 };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const animationDuration = () => (reduceMotion.matches ? 0 : 880);

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
    const index = routes.indexOf(route);
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

    if (pageNumber) pageNumber.textContent = String(index + 1).padStart(2, '0');
    if (pageName) pageName.textContent = labels[route];

    const previousRoute = routes[(index - 1 + routes.length) % routes.length];
    const nextRoute = routes[(index + 1) % routes.length];
    previousButton?.setAttribute('aria-label', `Previous page: ${labels[previousRoute]}`);
    nextButton?.setAttribute('aria-label', `Next page: ${labels[nextRoute]}`);
    updateHeader(scrollTop);
  };

  const jumpTo = (scrollTop) => {
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, scrollTop);
    root.style.scrollBehavior = previousBehavior;
  };

  const finishTurn = ({ oldPage, newPage, oldInner, newInner, newRoute, targetScroll }) => {
    const transitionClasses = [
      'is-page-leaving', 'is-page-entering', 'page--underneath', 'page--covering',
      'page--enter-from-bottom', 'page--exit-to-top',
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
    stage.removeAttribute('aria-busy');
    document.body.classList.remove('is-turning');
    jumpTo(targetScroll);
    updateHeader(targetScroll);
    isTurning = false;

    if (queuedNavigation) {
      const next = queuedNavigation;
      queuedNavigation = null;
      window.setTimeout(() => navigate(next.route, next), 40);
    }
  };

  const turnTo = (newRoute, direction) => {
    const oldRoute = currentRoute;
    const oldPage = pages.get(oldRoute);
    const newPage = pages.get(newRoute);
    const oldInner = oldPage.querySelector('.page__inner');
    const newInner = newPage.querySelector('.page__inner');
    const oldScroll = window.scrollY;
    const targetScroll = scrollPositions[newRoute] || 0;

    closeMenu();
    scrollPositions[oldRoute] = oldScroll;
    currentRoute = newRoute;
    isTurning = true;
    updateChrome(newRoute, targetScroll);
    stage.setAttribute('aria-busy', 'true');

    oldInner.style.transform = `translate3d(0, ${-oldScroll}px, 0)`;
    newInner.style.transform = `translate3d(0, ${-targetScroll}px, 0)`;
    newPage.hidden = false;
    newPage.classList.add('is-active');
    newPage.removeAttribute('aria-hidden');
    oldPage.setAttribute('aria-hidden', 'true');

    stage.classList.add('is-turning');
    document.body.classList.add('is-turning');
    oldPage.classList.add('is-page-leaving');
    newPage.classList.add('is-page-entering');

    if (direction > 0) {
      oldPage.classList.add('page--underneath');
      newPage.classList.add('page--covering', 'page--enter-from-bottom');
    } else {
      oldPage.classList.add('page--covering', 'page--exit-to-top');
      newPage.classList.add('page--underneath');
    }

    window.setTimeout(
      () => finishTurn({ oldPage, newPage, oldInner, newInner, newRoute, targetScroll }),
      animationDuration(),
    );
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
    if (direction > 0) {
      return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    }
    return window.scrollY <= 4;
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

  previousButton?.addEventListener('click', () => turnBy(-1));
  nextButton?.addEventListener('click', () => turnBy(1));

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
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      if (isAtPageBoundary(direction)) {
        event.preventDefault();
        turnBy(direction);
      }
    }
  });

  const finishWheelGestureLater = () => {
    if (wheelEndTimer) window.clearTimeout(wheelEndTimer);
    wheelEndTimer = window.setTimeout(() => {
      waitForWheelGestureEnd = false;
      wheelAmount = 0;
      wheelDirection = 0;
      wheelEndTimer = null;
    }, 180);
  };

  window.addEventListener('wheel', (event) => {
    if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    if (waitForWheelGestureEnd) {
      finishWheelGestureLater();
      return;
    }
    if (isTurning) {
      waitForWheelGestureEnd = true;
      finishWheelGestureLater();
      return;
    }

    const direction = event.deltaY > 0 ? 1 : -1;
    if (!isAtPageBoundary(direction)) {
      wheelAmount = 0;
      wheelDirection = direction;
      return;
    }

    const now = performance.now();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    if (direction !== wheelDirection || now - wheelLastAt > 180) wheelAmount = 0;
    wheelDirection = direction;
    wheelLastAt = now;
    wheelAmount += Math.abs(event.deltaY) * unit;

    if (wheelAmount >= 56) {
      wheelAmount = 0;
      waitForWheelGestureEnd = true;
      finishWheelGestureLater();
      turnBy(direction);
    }
  }, { passive: true });

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

  window.addEventListener('scroll', () => updateHeader(), { passive: true });
})();
