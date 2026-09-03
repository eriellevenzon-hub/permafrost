# Simone’s Permafrost

Frost's internal design vocabulary, browsable and deep-linkable term
by term.

74 terms, transcribed from Frost Lingo 101. The data lives in
`src/vocabulary.js` and is the single source of truth for this page and for the
Simone Figma plugin. The plugin imports the same file unchanged.

## Run it

```
npm install
npm run dev
```

## Build it

```
npm run build
```

Drag the `dist` folder onto Netlify. There's no backend and no redirect rules to
configure — routing is hash-based (`/#/term/<slug>`), so a pasted link survives a
reload on any static host, including opening `dist/index.html` straight off disk.

## Adding a term

Add an object to the `VOCABULARY` array in `src/vocabulary.js`. Every field is
documented at the top of that file.

Two rules that matter more than they look:

**Slugs are permanent.** They're URLs people paste into chat and links the plugin
holds. Add slugs, never rename them.

**Fill in `aka` generously.** Abbreviations, plurals, the misspelling someone
will actually type. It costs nothing here and it's what makes Simone's matching
work later.

## Keyboard

`/` focuses search. `Escape` clears it, or closes an open term.

## Checking your work

```
npx eslint src/App.jsx
```

Vite compiles this file whether or not the code is sound: deleting a
block leaves the lines that referenced it behind, and `a is not
defined` then only surfaces at runtime, on the first scroll frame.
`no-undef` catches that before you see it in the browser.

## Where things live

`src/App.jsx` holds the whole app, including its stylesheet as a
template literal near the top. Two things in there are worth knowing
before you edit:

- **The mark is never positioned from JavaScript.** It sits in normal
  flow in the masthead and again in the bar, and a single `is-lifted`
  class on the root crossfades them. An earlier version moved a fixed
  element from measured coordinates every frame, which shook on every
  scroll because it was always a frame behind the page.
- **The snow sits in front of the cards** (`.snow`, `z-index: 2`).
  That costs a little contrast as a flake crosses a line of text —
  14.2:1 down to about 10.7:1. `z-index: 0` puts it behind the cards
  and is the one-line revert.
