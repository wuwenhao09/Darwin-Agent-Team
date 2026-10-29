# Darwin Agent Team Website

A static, responsive team website with **About → Research → Contact** cover-style page navigation. No build step or third-party dependencies are required.

## Preview locally

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Page navigation

- Use a mouse wheel, trackpad, **Up / Down Arrow** keys, or vertical touch swipes at page boundaries to turn pages.
- The current page stays stationary while the next page slides up continuously and covers it, with a brief hesitation near the end.
- Reverse navigation slides the current page away to reveal the previous page underneath.
- The bottom previous/next controls and menu links use the same transition.
- Each page keeps its own vertical scroll position.
- Browser Back/Forward and direct `#about`, `#research`, and `#contact` links are supported.
- `research.html` redirects to the new `#research` route for backward compatibility.
- Reduced-motion preferences are respected.

## Update content

- All three pages and research cards: `index.html`
- Shared styling and page-turn animations: `styles.css`
- Navigation and interaction logic: `script.js`
- About hero image: `assets/images/about-hero.webp`
- Research images: `assets/images/`
- Local paper PDFs: `assets/papers/`

The About artwork is temporary reference artwork from MirroS and can be replaced by overwriting the two `about-*.webp` files.
