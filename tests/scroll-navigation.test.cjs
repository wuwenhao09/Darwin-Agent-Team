const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// Run the site's actual event handlers with a deterministic clock. In particular,
// a smooth mouse's next pulse must work before its previous tail has gone silent.
const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

function createSite(route = 'research') {
  let time = 1000;
  let scrollTop = 0;
  const listeners = { window: {}, document: {} };
  const element = (height = 900) => {
    const classes = new Set();
    const attributes = new Map();
    const inner = { style: {} };
    return {
      hidden: false, dataset: {}, scrollHeight: height,
      style: { setProperty() {}, removeProperty() {} },
      classList: {
        add: (...names) => names.forEach(name => classes.add(name)),
        remove: (...names) => names.forEach(name => classes.delete(name)),
        contains: name => classes.has(name),
        toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); },
      },
      setAttribute: (name, value) => attributes.set(name, value),
      removeAttribute: name => attributes.delete(name),
      querySelector: () => inner,
      getBoundingClientRect: () => ({ width: 1440 }),
      getAnimations: () => [],
    };
  };
  const pages = ['about', 'research', 'contact'].map(name => {
    const page = element(name === 'research' ? 3500 : 900);
    page.dataset.page = name;
    return page;
  });
  const body = element();
  const stage = element();
  const root = element();
  const maxScroll = () => body.classList.contains('is-turning') ? 0
    : Math.max(0, pages.find(page => !page.hidden).scrollHeight - 900);
  Object.defineProperties(root, {
    scrollTop: { get: () => scrollTop },
    scrollHeight: { get: () => maxScroll() + 900 },
    clientHeight: { get: () => 900 },
  });
  const addListener = scope => (name, handler) => { listeners[scope][name] = handler; };
  const document = {
    body, documentElement: root, scrollingElement: root,
    querySelector: selector => selector === '[data-page-stage]' ? stage : null,
    querySelectorAll: selector => selector === '[data-page]' ? pages : [],
    addEventListener: addListener('document'),
  };
  const window = {
    innerHeight: 900,
    location: { hash: `#${route}` },
    history: { pushState() {}, replaceState() {} },
    matchMedia: () => ({ matches: true }),
    addEventListener: addListener('window'),
    scrollTo(x, y) { scrollTop = Math.max(0, Math.min(maxScroll(), typeof x === 'object' ? x.top : y)); },
  };
  Object.defineProperty(window, 'scrollY', { get: () => scrollTop });
  vm.runInNewContext(source, { document, window, performance: { now: () => time } });

  return {
    get route() { return body.dataset.route; },
    get scrollTop() { return scrollTop; },
    get maxScroll() { return maxScroll(); },
    wait(ms) { time += ms; },
    scrollTo(value) {
      window.scrollTo(0, value);
      listeners.window.scroll();
    },
    wheel(deltaY, { gap = 16, mode = 0, legacy = -3 * deltaY } = {}) {
      time += gap;
      const event = {
        deltaX: 0, deltaY, deltaMode: mode, wheelDeltaY: legacy,
        defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; },
      };
      listeners.window.wheel(event);
      if (!event.defaultPrevented) {
        const unit = mode === 1 ? 16 : mode === 2 ? 900 : 1;
        window.scrollTo(0, scrollTop + deltaY * unit);
        listeners.window.scroll();
      }
    },
    pulse(deltas, options) { deltas.forEach(delta => this.wheel(delta, options)); },
  };
}

function reachBottom(site) {
  site.scrollTo(site.maxScroll - 40);
  site.pulse([8, 12, 24, 32, 24, 16, 10, 6, 4, 2, 1, 0.5]);
  assert.equal(site.route, 'research');
  assert.equal(site.scrollTop, site.maxScroll);
}

test('inertia stops at the bottom, including small fluctuations', () => {
  const site = createSite();
  reachBottom(site);
  site.pulse([0.4, 0.3, 0.25, 0.3, 0.2, 0.15, 0.1]);
  assert.equal(site.route, 'research');
});

test('a second smoothed mouse pulse turns without waiting for silence', () => {
  const site = createSite();
  reachBottom(site);
  // Every event is only 16 ms apart, including the next deliberate mouse pulse.
  site.pulse([1, 3, 9, 18, 24, 12, 6, 3, 1]);
  assert.equal(site.route, 'contact');
  assert.equal(site.scrollTop, 0);
});

test('a long decaying tail cannot prolong the fixed boundary brake', () => {
  const site = createSite();
  reachBottom(site);
  for (let i = 0; i < 150; i++) site.wheel(0.5 * (0.98 ** i));
  assert.equal(site.route, 'research');
  site.pulse([0.5, 1.5, 4.5, 9, 18]);
  assert.equal(site.route, 'contact');
});

test('a second pulse during the initial boundary brake is stopped', () => {
  const site = createSite();
  site.scrollTo(site.maxScroll - 40);
  site.pulse([8, 12, 24, 12, 4, 1, 3, 9, 18]);
  assert.equal(site.route, 'research');
});

test('ordinary small notches can turn on their own', () => {
  for (const delta of [1, 8, 20, 20.5]) {
    const site = createSite('about');
    site.wheel(delta, { legacy: -120 });
    assert.equal(site.route, 'research');
    assert.equal(site.scrollTop, 0);
  }
});

test('mouse input without legacy notch metadata is still usable', () => {
  const site = createSite('about');
  site.wheel(20, { legacy: 0 });
  assert.equal(site.route, 'research');
});

test('the next small notch works after the fixed pause at the bottom', () => {
  const site = createSite();
  site.scrollTo(site.maxScroll - 20);
  site.wheel(40, { legacy: -120 });
  assert.equal(site.route, 'research');
  site.wheel(8, { gap: 20, legacy: -120 });
  assert.equal(site.route, 'research');
  site.wheel(8, { gap: 120, legacy: -120 });
  assert.equal(site.route, 'contact');
});

test('a fresh pulse after a short pause works with fractional deltas', () => {
  const site = createSite();
  reachBottom(site);
  site.wait(180);
  site.pulse([0.5, 1.5, 3.5, 7.5, 12.5]);
  assert.equal(site.route, 'contact');
});

test('reverse scrolling has the same boundary brake and pulse detection', () => {
  const site = createSite();
  site.scrollTo(40);
  site.pulse([-8, -12, -24, -32, -24, -16, -10, -6, -4, -2, -1, -0.5]);
  assert.equal(site.route, 'research');
  assert.equal(site.scrollTop, 0);
  site.pulse([-1, -3, -9, -18, -24]);
  assert.equal(site.route, 'about');
});

test('full loops always reenter Research at the top', () => {
  const site = createSite('about');
  for (let i = 0; i < 3; i++) {
    site.wheel(8, { gap: 180, legacy: -120 });
    assert.equal(site.route, 'research');
    assert.equal(site.scrollTop, 0);
    site.scrollTo(site.maxScroll);
    site.wheel(8, { gap: 180, legacy: -120 });
    assert.equal(site.route, 'contact');
    site.wheel(8, { gap: 180, legacy: -120 });
    assert.equal(site.route, 'about');
  }
});

test('reverse navigation restores the previous reading position', () => {
  const site = createSite();
  site.scrollTo(site.maxScroll);
  const previousScroll = site.scrollTop;
  site.wheel(8, { legacy: -120 });
  assert.equal(site.route, 'contact');
  site.wheel(-8, { gap: 180, legacy: 120 });
  assert.equal(site.route, 'research');
  assert.equal(site.scrollTop, previousScroll);
});
