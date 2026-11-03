# Darwin Agent Team Website

A static, responsive team website with **About → Research → Contact** cover-style page navigation. No build step or third-party dependencies are required.

## Preview locally

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Page navigation

- Use a mouse wheel, trackpad, **Up / Down Arrow** keys, or vertical touch swipes at page boundaries to turn pages.
- The current page stays stationary while the next page slides up smoothly and covers it.
- Reverse navigation slides the current page down to reveal the previous page underneath.
- Scrolling down from Contact or clicking its “Back to top” link returns to the top of About; menu links use the same transition.
- Scrolling stops for 120 ms when it reaches a page boundary. The next mouse notch or fresh smooth-scrolling pulse turns the page, even when a previous pulse's momentum is still arriving. The pause is fixed and is never extended by that momentum.
- Forward page turns start at the destination's top; reverse page turns start at its bottom. This also applies when looping between Contact and About.
- Browser Back/Forward and direct `#about`, `#research`, and `#contact` links are supported.
- `research.html` redirects to the new `#research` route for backward compatibility.
- Reduced-motion preferences are respected.

Run the scroll-navigation regression checks with `node --test tests/scroll-navigation.test.cjs`.

## Update content

Research uses a dark visual theme, an interactive research tree, and a responsive project grid with the same card layout for every paper. The tree and direction filters share one selection and derive project counts from the cards. Selecting a branch scrolls to the filtered work.

Projects are grouped by their primary research contribution, rather than application domain. Learning includes both model training and skill-bank evolution; harness research focuses on the runtime that organizes an agent's execution. Memory and predictive world models have separate directions.

| Direction | Projects |
| --- | --- |
| Learning & evolution | AdaStep, TRACE |
| Agent harnesses | HarnessX, HarnessPAI |
| Agent memory | Mi-Memory |
| World models | Digital Agents Meet World Models |
| Collective intelligence | Topological Collapse |

- All three pages and research cards: `index.html`
- Shared styling and page-turn animations: `styles.css`
- Navigation and interaction logic: `script.js`
- About hero image: `images/about-hero-monet.webp` with `images/about-hero-monet-mobile.webp` for small screens
- Research images: `images/`
- Team logo, wordmarks, avatar, and design preview: `images/brand/` (usage notes in `images/brand/README.md`)
- Browser icons: `favicon.svg`, `favicon.png`
- Legacy local paper PDFs (not linked): `assets/papers/`

The About cover uses Claude Monet's *The Seine at Giverny* (1897), from the National Gallery of Art's public-domain Open Access collection. Source and processing details are recorded in `images/artwork-sources.md`. The previous cover remains at `images/about-hero.webp`; the Contact landscape is still the temporary reference artwork from MirroS.
