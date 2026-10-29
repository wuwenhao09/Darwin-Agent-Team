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
- Scrolling down from Contact loops back to About; menu links use the same transition.
- Scrolling stops for 120 ms when it reaches a page boundary. The next mouse notch or fresh smooth-scrolling pulse turns the page, even when a previous pulse's momentum is still arriving. The pause is fixed and is never extended by that momentum.
- Forward page turns start at the destination's top; reverse page turns start at its bottom. This also applies when looping between Contact and About.
- Browser Back/Forward and direct `#about`, `#research`, and `#contact` links are supported.
- `research.html` redirects to the new `#research` route for backward compatibility.
- Reduced-motion preferences are respected.

Run the scroll-navigation regression checks with `node --test tests/scroll-navigation.test.cjs`.

## Update content

- All three pages and research cards: `index.html`
- Shared styling and page-turn animations: `styles.css`
- Navigation and interaction logic: `script.js`
- About hero image: `assets/images/about-hero.webp`
- Research images: `assets/images/`
- Local paper PDFs: `assets/papers/`

The About artwork is temporary reference artwork from MirroS and can be replaced by overwriting the two `about-*.webp` files.
