import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { VOCABULARY, CATEGORIES } from "./vocabulary.js";
import { FROST_MARK_PATH, FROST_MARK_SIMPLE } from "./frostMark.js";

/* ============================================================
   Motion
   ============================================================ */

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const SOFT = "cubic-bezier(0.33, 0.9, 0.28, 1)";

const T = {
  micro: 260,
  control: 380,
  enter: 720,
  stagger: 70,
  ripple: 1150,
  ringGap: 190,
  travel: 2200, // both burst, the dust crosses, both re-form
  open: 520, // a card opening
  melt: 1600, // the mark dissolving and reforming
};

/* ============================================================
   Colour — glacier
   Ice, not sky. The page is near-white with a blue cast and the
   saturated blues are held back for interaction. Tinted panels
   sit barely above the paper so nothing reads as a grey slab.
   Ratios are against `paper` unless noted.
   ============================================================ */

const c = {
  /* the five category fields, sampled from the Frost Lingo slides */
  process: "#1718AC",
  designpro: "#7856FE",
  terms: "#FF4773",
  artifacts: "#4AB4FF",
  misc: "#FA6401",

  paper: "#F8F8F8",
  card: "#FFFFFF",
  quote: "#F1F1F3",
  sunk: "#EFEFF1",
  mist: "#D6D6DC",
  rule: "rgba(11,11,20,0.12)",
  ruleStrong: "rgba(11,11,20,0.2)",
  ink: "#0B0B14",   // 18.4:1 on paper
  ink2: "#3A3A46",  // 9.6:1
  ink3: "#5A5A68",  // 5.9:1 - floor for body text
  accent: "#1718AC",
  accentHover: "#101160",
  accentSoft: "#E6E6F5",
  mark: "#9AA6C4",
}

/* which field a term belongs to */
const FIELD = {
  "Process Related": c.process,
  "Design Process": c.designpro,
  "Design Terms": c.terms,
  "Design Artifacts": c.artifacts,
  Miscellaneous: c.misc,
};
const fieldOf = (entry) => FIELD[entry && entry.category] || c.process;
const illoFor = (slug) => `${import.meta.env.BASE_URL}illustrations/${slug}.webp`;

/* ============================================================
   Styles
   ============================================================ */

const CSS = `
:root {
  /* the five category colours, used by the mark's shards and the cards */
  --process: ${c.process};
  --designpro: ${c.designpro};
  --terms: ${c.terms};
  --artifacts: ${c.artifacts};
  --misc: ${c.misc};

  --paper: ${c.paper};
  --card: ${c.card};
  --quote: ${c.quote};
  --sunk: ${c.sunk};
  --mist: ${c.mist};
  --rule: ${c.rule};
  --rule-strong: ${c.ruleStrong};
  --ink: ${c.ink};
  --ink2: ${c.ink2};
  --ink3: ${c.ink3};
  --accent: ${c.accent};
  --accent-hover: ${c.accentHover};
  --accent-soft: ${c.accentSoft};
  --mark: ${c.mark};

  --ease: ${EASE};
  --soft: ${SOFT};
  --t-micro: ${T.micro}ms;
  --t-control: ${T.control}ms;
  --t-enter: ${T.enter}ms;
  --t-open: ${T.open}ms;
  --t-ripple: ${T.ripple}ms;

  --sans: "Inter", -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --serif: "Iowan Old Style", "Palatino Linotype", Georgia, serif;
  /* the heavy condensed grotesk the slides use; Impact is the closest
     face shipping on both macOS and Windows */
  --display: Impact, "Haettenschweiler", "Arial Narrow Bold", sans-serif;

  --s1: 8px;  --s2: 16px; --s3: 24px;
  --s4: 32px; --s5: 48px; --s6: 72px;

  --title: clamp(38px, 6.4vw, 86px);
  --rail: 258px;
  /* the bar insets its content by this on both sides */
  --bar-inset: 14px;
  /* the space between the rail and the reading column — the shell's
     measure is derived from it, so narrowing this walks the cards
     left without breaking the shared right edge */
  --col-gap: 60px;
  /* a chip's own left/right padding — the gap between its box and
     the word inside it */
  --chip-pad: 13px;
  /* Ink, not boxes. A mono glyph carries a side bearing and the
     letter-spacing adds a trailing gap after the last character, so
     the "1" stops about 5px short of its own text box. Measured off
     a screenshot at 1.63x: the card sat 4.9px right of the glyph. */
  --optical-ink: 5px;
  /* the same effect at the other end of a label: mono caps read as
     sitting slightly left of where their box starts */
  --optical-label: 4px;
  /* the hover row's own geometry: how much sits before the active
     marker, and how far the marker sits from the word */
  --rail-lead: 4px;
  /* Measured off the screenshot: the search border, the label's ink
     and the term's ink all land on one line, and only the hover
     panel was out — it began 14.5px to their left. The marker now
     sits on that line and the panel bleeds --rail-lead behind it,
     which reads as the panel's own padding rather than as a fourth
     left edge. */
  --rail-marker-gap: 8px;
  /* Clearance for the scrollbar. scrollbar-gutter: stable reserves
     nothing when the OS draws overlay scrollbars — they float above
     the content — so the rail keeps real padding as well. */
  --rail-scroll-clear: 12px;

  /* Frost, as an interaction language. Real backdrop-filter forces a
     compositing layer per element, so it is spent only where there
     are a handful of elements — the tabs and the buttons. The 74
     rail rows get the same read from layering instead: a translucent
     white face, a bright top edge where light would catch, a cold
     hairline, and a short shadow. */
  /* One radius for every surface. The ripple discs, the snowflakes
     and the dust stay round — those are effects, not chrome — and
     the 2px active marker and the scrollbar thumb stay square,
     since a 6px radius on a 2px-wide bar is just a capsule. */
  --radius: 6px;

  --frost-blur: 14px;
  --frost-face: rgba(255, 255, 255, 0.58);
  --frost-edge: rgba(255, 255, 255, 0.95);
  --frost-rim: rgba(183, 207, 232, 0.55);

  /* The rail meets the bar's content ORIGIN, not the search text.
     The search text moves — 30 at rest, 87 once the mark opens — so
     nothing can align to it in both states. What never moves is
     where the bar's content begins: the search pill sits there at
     rest, the mark sits there when lifted. */
  --rail-indent: calc(var(--bar-inset) + 8px);
  --gutter: 40px;
  --bar: 88px; /* .controls: 12 + 64 bar + 12 */
  --sy: 0;         /* scroll offset, written from JS for parallax */
  --snow-y: 0px;   /* the same, as a length, for the snow layers */
}

html { scroll-behavior: smooth; }

.pf {
  min-height: 100%;
  /* The card was already pure white, so it could not be lightened —
     what it lacked was something to be light against. The page now
     carries a gradient, deepest at the top where the masthead sits
     and clearing toward the foot, which lifts the card's separation
     from 1.04 to 1.13 without touching the card itself. Text on the
     deepest stop still reads at 12.6:1. */
  background:
    linear-gradient(168deg, #F2F2F4 0%, var(--paper) 46%, #FAFAFB 100%)
      fixed;
  color: var(--ink);
  /* sans throughout, as in the panel. The serif is reserved for quoted
     speech, and the display face for terms. */
  font-family: var(--sans);
  font-size: 17px;
  line-height: 27px;
}

/* ambient ice — a full-height layer with no edge to cross the
   viewport; it only drifts a few pixels so it can never band */
.pf::before {
  content: "";
  position: fixed;
  inset: -120px 0;
  background:
    radial-gradient(46% 38% at 18% 4%, rgba(199,217,238,0.28) 0%, rgba(199,217,238,0) 68%),
    radial-gradient(42% 34% at 84% 0%, rgba(186,210,235,0.24) 0%, rgba(186,210,235,0) 70%),
    radial-gradient(70% 30% at 50% 100%, rgba(207,223,238,0.18) 0%, rgba(207,223,238,0) 72%);
  transform: translate3d(0, calc(var(--sy) * -0.035px), 0);
  pointer-events: none;
  z-index: 0;
}

.pf > * { position: relative; z-index: 1; }

/* --- the mark ----------------------------------------------- */

/* Afterword's approach: the mark sits in normal flow in both
   places and a single "is-lifted" boolean drives CSS transitions.
   Nothing is positioned from JavaScript, so it scrolls with the
   page natively — the shake was a fixed element having its
   coordinates rewritten every frame from a rect that had already
   moved, so it was always a frame behind the thing it sat beside. */

.mark-head,
.mark-bar {
  position: relative;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  /* whichever category is under the bar; the accent until you scroll */
  color: var(--nav-field, var(--accent));
  cursor: pointer;
  transition: color var(--t-enter) var(--soft);
}
.mark-head svg,
.mark-bar svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}
.mark-head .mark-travel,
.mark-bar .mark-travel { overflow: hidden; }
.mark-bar .mark-travel {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
}

/* in the header: full size, and it dissolves as the bar takes over */
.mark-head {
  /* square, at the title's own size, so the crystal stands as tall as
     the letters beside it and scales with them */
  flex: 0 0 auto;
  width: var(--title);
  height: var(--title);
  /* the same ink as the wordmark it sits beside */
  color: var(--ink);
  transition:
    opacity var(--t-enter) var(--soft),
    filter var(--t-enter) var(--soft);
}
.pf.is-lifted .mark-head {
  opacity: 0;
  filter: blur(6px);
  pointer-events: none;
}

/* in the bar: closed to nothing until the bar lifts, then it opens
   out — width and opacity, the way Afterword reveals its own */
.mark-bar {
  width: 0;
  height: 32px;
  margin-right: 0;
  opacity: 0;
  /* not overflow:hidden - it clipped this button's own tooltip. The
     glyph is clipped by .mark-travel instead. */
  overflow: visible;
  transition:
    width var(--t-enter) var(--ease),
    margin-right var(--t-enter) var(--ease),
    opacity 260ms ease-out,
    filter 260ms ease-out;
  filter: blur(4px);
}
.pf.is-lifted .mark-bar {
  width: 32px;
  /* 7, not 12: the crystal's ink stops 4.8px short of its box, so a
     matching margin put more air on the divider's left than its right */
  margin-right: 7px;
  opacity: 1;
  filter: blur(0);
}
.mark-bar:hover,
.mark-head:hover {
  filter: brightness(0.8);
}

/* --- snow --------------------------------------------------- */

/* In front of the content. The flakes pass over the cards, which
   costs some contrast while one crosses a line of text — measured
   at 14.2:1 down to 10.7:1 under the largest of them, so still well
   clear of the floor, but it does dim and brighten as they go. The
   one-line revert is z-index 0, which puts them behind the cards
   and leaves them visible only in the margins. */
/* Above everything, the bar included. At z-index 2 the flakes fell
   behind the bar, so every surface with a background sliced one in
   half at its edge — the chip's hover face, and the bar's own top
   edge, which is what read as it being chipped. Nothing occludes
   them now, so there is no boundary left to cut against. */
.snow {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 35;
  overflow: hidden;
}
.snow-defs { position: absolute; width: 0; height: 0; }

/* Each layer creeps at its own rate as the page moves, so the field
   has depth instead of sitting flat on the glass. The flakes'
   own animation lives on the children, so the two transforms never
   contend for the same property. */
.snow-layer {
  position: absolute;
  inset: 0;
  transform: translate3d(0, calc(var(--snow-y, 0px) * var(--par, 0.02)), 0);
  will-change: transform;
}

/* Every flake is the mark's own eight-point star. A white circle
   with a ring and a halo is a soap bubble, which is exactly what it
   read as — shape is what makes a falling speck read as snow.
   Pale blue rather than white: snow in shade is blue, and a tint
   gives the form an edge on a near-white page without the ring that
   was drawing the bubble outline. */
.snow svg.snow-star {
  position: absolute;
  top: -18px;
  opacity: 0;
  fill: url(#pf-frost);
  animation-name: drift;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  will-change: transform, opacity;
}

/* Snow meanders; ash falls straight. Two sway waypoints on the way
   down, and a slow turn, so no two flakes trace the same line. */
/* Five sway waypoints rather than three, each a different width,
   so the descent reads as a wander rather than a zigzag. Opacity
   breathes twice on the way down and the flake turns by its own
   --spin, either direction. */
@keyframes drift {
  0% {
    opacity: 0;
    transform: translate3d(0, 0, 0) rotate(0deg) scale(0.86);
  }
  6%  { opacity: var(--o, 0.4); }
  18% {
    transform: translate3d(var(--sway, 14px), 18vh, 0)
      rotate(calc(var(--spin, 160deg) * 0.18)) scale(1);
  }
  33% {
    opacity: calc(var(--o, 0.4) * 0.68);
    transform: translate3d(calc(var(--sway, 14px) * -0.72), 34vh, 0)
      rotate(calc(var(--spin, 160deg) * 0.34)) scale(0.94);
  }
  50% {
    opacity: var(--o, 0.4);
    transform: translate3d(calc(var(--sway, 14px) * 0.45), 51vh, 0)
      rotate(calc(var(--spin, 160deg) * 0.5)) scale(1);
  }
  68% {
    opacity: calc(var(--o, 0.4) * 0.74);
    transform: translate3d(calc(var(--sway, 14px) * -1), 69vh, 0)
      rotate(calc(var(--spin, 160deg) * 0.7)) scale(0.92);
  }
  85% {
    opacity: var(--o, 0.4);
    transform: translate3d(calc(var(--sway, 14px) * 0.3), 86vh, 0)
      rotate(calc(var(--spin, 160deg) * 0.86)) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate3d(calc(var(--sway, 14px) * -0.5), 106vh, 0)
      rotate(var(--spin, 160deg)) scale(0.9);
  }
}

/* --- ripple ------------------------------------------------ */

.rp { position: relative; overflow: hidden; isolation: isolate;
      -webkit-tap-highlight-color: transparent; }
.rp-content { position: relative; z-index: 2; display: inline-flex;
              align-items: center; gap: var(--s1); }
.rp-wash { position: absolute; top: 0; left: 0; width: 100%; height: 100%;
           pointer-events: none; z-index: 0; }

.rp-wash::after {
  content: "";
  position: absolute;
  top: 50%;
  left: var(--wash-x, 50%);
  width: 100%;
  padding-bottom: 100%;
  transform: translate(-50%, -50%) scale(0.35);
  border-radius: 50%;
  background: var(--wash-color, rgba(214, 231, 247, 0.72));
  opacity: 0;
  transition: transform var(--t-enter) var(--ease),
              opacity var(--t-control) var(--soft);
}

.rp:hover .rp-wash::after,
.rp:focus-visible .rp-wash::after { transform: translate(-50%,-50%) scale(2.3); opacity: 1; }

.rp-wide .rp-wash::after {
  left: 0; width: 130%; padding-bottom: 130%;
  transform: translate(-40%, -50%) scale(0.35);
}
.rp-wide:hover .rp-wash::after,
.rp-wide:focus-visible .rp-wash::after { transform: translate(-40%,-50%) scale(2.6); }

.rp-ring {
  position: absolute; border-radius: 50%; pointer-events: none;
  background: var(--mark);
  transform: translate(-50%, -50%) scale(0);
  opacity: 0.3;
  animation: rp-ring var(--t-ripple) var(--ease) forwards;
  z-index: 1;
}
.rp-ring.is-second { opacity: 0.16; animation-delay: ${T.ringGap}ms; }
@keyframes rp-ring { to { transform: translate(-50%,-50%) scale(2.6); opacity: 0; } }

/* --- scroll reveal ----------------------------------------- */

.reveal {
  opacity: 0;
  transform: translate3d(0, 18px, 0);
  transition:
    opacity var(--t-enter) var(--soft),
    transform var(--t-enter) var(--ease);
  transition-delay: var(--d, 0ms);
  will-change: opacity, transform;
}
.reveal.is-in { opacity: 1; transform: none; }

/* --- shell ------------------------------------------------- */

/* The page uses rail + gap + reading column = 258 + 72 + 660 = 990.
   At 1140 the shell was 70px wider than that, so the bar ran past
   the right edge of the cards and the divider under the category
   label looked short against it. Capping the shell to the measure
   puts the bar, the cards and both rules on one right edge. */
.shell {
  max-width: calc(var(--rail) + var(--col-gap) + 660px + var(--gutter) * 2);
  margin: 0 auto;
  padding: 0 var(--gutter);
}

/* --- masthead ---------------------------------------------- */

.masthead {
  text-align: center;
  /* the gap under the title, down to the search row */
  padding: 60px 0 32px;
  /* drifts up and fades as the page moves under the bar */
  transform: translate3d(0, calc(var(--sy) * -0.16px), 0);
  opacity: var(--mast-o, 1);
  will-change: transform, opacity;
}

.eyebrow {
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink3);
  margin: 0;
}

.wordmark {
  font-family: var(--display);
  text-transform: uppercase;
  letter-spacing: -0.025em;
  font-size: var(--title);
  line-height: 1.02;
  font-weight: 400;
  /* upright. The italic and the -0.03em tracking were tuned for the
     serif this used to be set in; Impact has no true italic, so the
     browser was slanting it synthetically. */
  margin: 10px 0 0;
  color: var(--ink);
}
.wordmark em { font-style: normal; font-weight: 400; }

/* the title and the mark sit on one line before you scroll */
/* ---- the tooltip, as in the plugin ---- */
[data-tip] { position: relative; }
[data-tip]::before {
  content: attr(data-tip);
  position: absolute; top: calc(100% + 6px); left: 50%;
  transform: translate(-50%, -4px);
  white-space: nowrap; pointer-events: none;
  font-size: 9px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  /* Without this it inherits the page's 27px line-height against 9px
     text, and the pill comes out twice the height its padding implies -
     which is what made it read as a big grey capsule. */
  line-height: 1;
  color: #F8F8F8;
  /* darker, so it reads as a label rather than a grey blob on paper */
  background: rgba(11, 11, 20, 0.88);
  -webkit-backdrop-filter: blur(8px) saturate(140%);
  backdrop-filter: blur(8px) saturate(140%);
  box-shadow: 0 4px 12px -8px rgba(11, 11, 20, 0.5);
  /* a small radius, not a capsule: at this height 20px rounds it fully */
  padding: 6px 8px; border-radius: 4px;
  opacity: 0; z-index: 60;
  transition: opacity var(--t-micro) var(--soft), transform var(--t-enter) var(--ease);
}
[data-tip]:hover::before { opacity: 1; transform: translate(-50%, 0); }

/* ---- browse: the plugin's page, as an overlay ---- */
.browse {
  position: fixed; inset: 0; z-index: 50;
  background: var(--paper);
  overflow-y: auto; overscroll-behavior: contain;
  /* the bar scrolls with the content now, so this is the page's own top */
  padding: 64px 0 80px;
  opacity: 0; transform: translateY(6px); pointer-events: none;
  transition: opacity 260ms var(--soft), transform var(--t-enter) var(--ease);
}
.browse.is-in { opacity: 1; transform: none; pointer-events: auto; }
.browse-inner { max-width: 720px; margin: 0 auto; padding: 0 var(--s4); }
/* In the flow, not fixed over it: the arrow and her name sit directly
   above the heading, the same 8px apart as the heading and its line. */
.browse-bar { margin-bottom: 8px; }
/* the same column the heading below it sits on */
.browse-bar-inner { display: flex; align-items: center; gap: 10px; }
.browse-back {
  flex: 0 0 auto; width: 16px; height: 12px;
  display: flex; align-items: center; justify-content: flex-start;
  color: var(--ink); cursor: pointer; line-height: 0;
  transition: color var(--t-micro) var(--soft);
}
.browse-back:hover { color: #1F51FF; }
.browse-back svg { width: 16px; height: 12px; display: block; }
.browse-name {
  font-family: var(--display); text-transform: uppercase;
  font-size: 22px; line-height: 1; letter-spacing: -0.01em; color: var(--ink);
}
.browse-head h2 {
  font-family: var(--display); text-transform: uppercase; letter-spacing: -0.025em;
  font-size: clamp(34px, 5vw, 56px); line-height: 1.05; margin: 0 0 8px; color: #1F51FF;
}
.browse-head p { margin: 0 0 26px; font-size: 17px; line-height: 1.35; color: var(--ink2); }
.bgroup + .bgroup { border-top: 1px solid var(--rule); }
.bgroup-head {
  width: 100%; display: flex; align-items: center; gap: 12px;
  padding: 18px 2px; cursor: pointer;
}
.bgroup-head .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--field); flex: 0 0 auto; }
.bgroup-head .nm { font-size: 12px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.bgroup-head .n { font-size: 11px; font-weight: 700; color: var(--ink3); margin-left: auto; }
.bgroup-head .caret { width: 15px; height: 15px; color: var(--ink3); transition: transform var(--t-enter) var(--ease); }
.bgroup.is-open .caret { transform: rotate(180deg); }
.bgroup.is-open .nm { color: var(--field); }
/* Its own timing: --t-open is 520ms on a strongly decelerating curve,
   which crawls at the end of a collapse. And the padding used to snap
   while the rows eased, which is the jump at the close. */
.bgroup-body {
  display: grid; grid-template-rows: 0fr;
  transition: grid-template-rows 340ms cubic-bezier(0.3, 0.82, 0.3, 1);
}
.bgroup.is-open .bgroup-body { grid-template-rows: 1fr; }
.bgroup-body > div {
  overflow: hidden;
  padding-bottom: 0;
  opacity: 0;
  transition:
    padding-bottom 340ms cubic-bezier(0.3, 0.82, 0.3, 1),
    opacity 220ms var(--soft);
}
.bgroup.is-open .bgroup-body > div { padding-bottom: 20px; opacity: 1; }

.mast-row {
  display: flex;
  justify-content: center;
  margin-top: 0;
}

/* The mark sits above the title, both centred on the same axis.
   Stacking also settles the centring question outright: nothing
   sits beside the title, so nothing can push it off centre when it
   fades. */
.title-wrap {
  position: relative;
  display: flex;
  /* the mark reads as part of the name, not a thing stacked above it */
  flex-direction: row;
  align-items: center;
  gap: calc(var(--title) * 0.16);
}
.title-wrap .wordmark { margin: 0; }

/* the title thaws with the mark — both dissolve, snow falls off
   them, then they settle back */
.title-wrap.is-melting .wordmark {
  animation: melt-text ${T.travel}ms var(--soft);
}

@keyframes melt-text {
  0%   { opacity: 1; filter: none; transform: none; }
  12%  { opacity: 0.05; filter: blur(10px); transform: translateY(6px) scale(0.985); }
  68%  { opacity: 0.05; filter: blur(10px); transform: translateY(6px) scale(0.985); }
  100% { opacity: 1; filter: none; transform: none; }
}

.title-snow {
  position: absolute; inset: 0;
  pointer-events: none;
}
.title-snow i {
  position: absolute;
  border-radius: 50%;
  background: #8FB1CE;
  opacity: 0;
}
.title-wrap.is-melting .title-snow i {
  animation: title-fall ${T.travel}ms var(--soft);
  animation-delay: inherit;
}
@keyframes title-fall {
  0%   { opacity: 0; transform: translate(0, 0) scale(0.3); }
  9%   { opacity: 0.9; transform: translate(0, 0) scale(1); }
  22%  { opacity: 0.55; transform: translate(calc(var(--tx) * 0.5), calc(var(--ty) * 0.5)) scale(0.85); }
  34%  { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0.5); }
  100% { opacity: 0; transform: translate(0, 0) scale(0.3); }
}

/* --- the bar ----------------------------------------------- */

.controls { position: sticky; top: 0; z-index: 30; padding: 12px 0; }

.bar {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 var(--bar-inset);
  border-radius: var(--radius);
  border: 1px solid transparent;
  background: transparent;
  transition:
    background var(--t-control) var(--soft),
    border-color var(--t-control) var(--soft),
    box-shadow var(--t-control) var(--soft);
}

/* Real frost: transparent enough to see the page move underneath,
   heavy blur, saturation pushed so the blues behind it stay blue,
   and a light inner edge along the top so it reads as a pane of
   ice rather than a flat white bar. */
.controls.is-lifted .bar {
  background: rgba(255, 255, 255, 0.5);
  -webkit-backdrop-filter: blur(28px) saturate(200%);
  backdrop-filter: blur(28px) saturate(200%);
  border-color: rgba(255, 255, 255, 0.8);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 1px 1px rgba(31, 44, 58, 0.03),
    0 10px 20px -10px rgba(31, 44, 58, 0.10),
    0 28px 56px -28px rgba(31, 44, 58, 0.14);
}

/* --- the mark ----------------------------------------------- */

.mark-star { transform-origin: 50% 50%; transform-box: fill-box; }

/* the crystal, and the four it breaks into */
/* In the masthead it is the plugin's blue. Once it has shrunk into the
   bar it follows whatever you are reading, like the rest of the nav -
   currentColor is already --nav-field there. */
.mark-head .core { fill: #1F51FF; }
.mark-bar .core { fill: currentColor; }
.mark-bar .s1, .mark-head .s1 { fill: var(--artifacts); }
.mark-bar .s2, .mark-head .s2 { stroke: var(--designpro); fill: none; }
.mark-bar .s3, .mark-head .s3 { fill: var(--process); }
.mark-bar .s4, .mark-head .s4 { fill: var(--misc); }
.mark-bar svg > *, .mark-head svg > * {
  transform-box: view-box;
  transform-origin: 12px 12px;
  transition: transform var(--t-enter) var(--ease), opacity 240ms var(--soft);
}
.mark-bar .s1, .mark-head .s1 { opacity: 0; transform: translate(5.5px, 5.5px) scale(0.4); }
.mark-bar .s2, .mark-head .s2 { opacity: 0; transform: translate(-5.5px, 5.5px) scale(0.4); }
.mark-bar .s3, .mark-head .s3 { opacity: 0; transform: translate(5.5px, -5.5px) scale(0.4); }
.mark-bar .s4, .mark-head .s4 { opacity: 0; transform: translate(-5.5px, -5.5px) scale(0.4); }
/* Either one bursts it: the mark on its own hover, or the name beside
   it. Only the name scatters the dust, though - that belongs to the
   letters. */
.mark-bar:hover .core, .mark-head:hover .core,
.title-wrap.is-naming .core { opacity: 0; transform: scale(0.55); }
.mark-bar:hover .s1, .mark-head:hover .s1, .title-wrap.is-naming .s1,
.mark-bar:hover .s2, .mark-head:hover .s2, .title-wrap.is-naming .s2,
.mark-bar:hover .s3, .mark-head:hover .s3, .title-wrap.is-naming .s3,
.mark-bar:hover .s4, .mark-head:hover .s4, .title-wrap.is-naming .s4 { opacity: 1; transform: none; }

/* --- hovering the mark in the bar: burst, then re-form -------- */

.mark-bar.is-melting .mark-star { animation: melt ${T.melt}ms var(--soft); }

@keyframes melt {
  0%   { opacity: 1; transform: none; filter: none; }
  30%  { opacity: 0.06; transform: translateY(3px) scale(0.9); filter: blur(2.4px); }
  52%  { opacity: 0.06; transform: translateY(3px) scale(0.9); filter: blur(2.4px); }
  100% { opacity: 1; transform: none; filter: none; }
}

.flake { opacity: 0; }
.mark-bar.is-melting .flake {
  animation: fall ${T.melt}ms var(--soft);
  animation-delay: var(--fd, 0ms);
}

@keyframes fall {
  0%   { opacity: 0; transform: translate(0,0) scale(0.4); }
  22%  { opacity: 0.9; transform: translate(0,0) scale(1); }
  50%  { opacity: 0.5; transform: translate(var(--fx,0px), 13px) scale(0.8); }
  70%  { opacity: 0; transform: translate(var(--fx,0px), 20px) scale(0.5); }
  100% { opacity: 0; transform: translate(0,0) scale(0.4); }
}

/* --- hovering the header: both burst, the dust crosses -------- */

/* The sequence, on one clock:
     0–14%   the title and the mark both break into snow
     10–75%  the mark's dust drifts across to the far side, each
             mote on its own delay so it reads as a trail rather
             than a block moving
     78–100% both re-form where they started

   The travel lives on an inner wrapper because JS owns the outer
   element's transform every frame; both writing the same property
   would only overwrite each other. */
.mark-head.is-traveling .mark-travel {
  animation: mark-dissolve ${T.travel}ms var(--soft);
}

@keyframes mark-dissolve {
  0%   { opacity: 1; filter: none; transform: scale(1); }
  12%  { opacity: 0; filter: blur(9px); transform: scale(0.7); }
  68%  { opacity: 0; filter: blur(9px); transform: scale(0.7); }
  100% { opacity: 1; filter: none; transform: scale(1); }
}

/* the dust itself */
.dust {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.dust i {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 6px rgba(167, 196, 222, 0.95);
  opacity: 0;
}
.mark-head.is-traveling .dust i {
  animation-name: fairy;
  /* flicked, not carried: most of the distance is covered early,
     then it drifts to a stop */
  animation-timing-function: cubic-bezier(0.12, 0.85, 0.22, 1);
  animation-fill-mode: both;
}

/* born at the mark, lifted on an arc, thrown to the far side */
@keyframes fairy {
  0% {
    opacity: 0;
    transform: translate(var(--x0), var(--y0)) scale(0.25);
  }
  10% {
    opacity: 1;
    transform: translate(var(--x0), var(--y0)) scale(1);
  }
  58% {
    opacity: 0.85;
    transform: translate(
        calc(var(--travel, 0px) * 0.62 + var(--x0)),
        calc(var(--y0) + var(--arc))
      )
      scale(0.8);
  }
  100% {
    opacity: 0;
    transform: translate(
        calc(var(--travel, 0px) + var(--x0)),
        calc(var(--y0) + var(--drop))
      )
      scale(0.22);
  }
}

/* closes to nothing with the mark, so the search can sit flush at
   the top of the page and be pushed right as the mark opens */
.bar-split {
  width: 0; height: 26px; flex: 0 0 auto;
  margin-right: 0;
  background: var(--rule-strong);
  opacity: 0;
  transition:
    width var(--t-enter) var(--ease),
    margin-right var(--t-enter) var(--ease),
    opacity var(--t-control) var(--soft);
}
.controls.is-lifted .bar-split { width: 1px; margin-right: 12px; opacity: 1; }

/* --- search ------------------------------------------------ */

.search { flex: 1 1 300px; position: relative; display: flex; align-items: center; }

.search input {
  width: 100%; height: 42px;
  background: rgba(255,255,255,0.72);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  padding: 0 var(--s5) 0 var(--s2);
  font-family: var(--sans); font-size: 13px; color: var(--ink);
  outline: none;
  transition: border-color var(--t-micro) var(--soft),
              background var(--t-micro) var(--soft),
              box-shadow var(--t-micro) var(--soft);
}
/* light enough to read as a hint and vanish on typing, still
   4.6:1 on the field */
.search input::placeholder { color: #627689; }
.search input:focus {
  border-color: var(--accent);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(62,98,127,0.13);
}

.search-clear {
  position: absolute; right: 7px;
  width: 28px; height: 28px; border-radius: var(--radius);
  display: grid; place-items: center; cursor: pointer;
  color: var(--ink3); font-family: var(--sans); font-size: 15px; line-height: 1;
  transition: color var(--t-micro) var(--soft), background var(--t-micro) var(--soft);
}
.search-clear:hover { color: var(--ink); background: var(--sunk); }

/* --- tabs -------------------------------------------------- */

/* the group gets its own pane of frost once the bar lifts, so the
   tabs read as one control rather than five loose words */
.filters {
  display: flex; gap: 10px; align-items: center; flex: 0 0 auto;
  margin-left: 12px;
  padding: 3px;
  /* concentric with the chips inside: outer radius = inner + padding */
  border-radius: calc(var(--radius) + 3px);
  background: transparent;
  border: 1px solid transparent;
  transition: background var(--t-control) var(--soft),
              border-color var(--t-control) var(--soft),
              box-shadow var(--t-control) var(--soft);
}
.controls.is-lifted .filters {
  background: rgba(255,255,255,0.55);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  backdrop-filter: blur(16px) saturate(180%);
  border-color: rgba(255,255,255,0.9);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.9),
              0 1px 2px rgba(31,44,58,0.04);
}

.chip {
  height: 34px; display: inline-flex; align-items: center;
  padding: 0 var(--chip-pad);
  font-family: var(--sans); font-size: 11px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--ink3);
  border-radius: var(--radius); border: none; cursor: pointer; background: transparent;
  transition: color var(--t-micro) var(--soft),
              background var(--t-micro) var(--soft),
              transform var(--t-control) var(--ease);
}
/* A light frosted face. It can be a plain fill again now that the
   snow passes in front of the bar rather than behind it — there is
   nothing underneath for its edge to cut. */
.chip:hover {
  color: var(--ink);
  background: rgba(255, 255, 255, 0.42);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7);
}
.chip:active { transform: scale(0.97); }
.chip .n {
  margin-left: 6px; font-size: 10px; font-weight: 400;
  opacity: 0.55; letter-spacing: 0.04em; font-variant-numeric: tabular-nums;
}
.chip[aria-pressed="true"] { background: var(--nav-field, var(--accent)); color: #fff; }
.chip[aria-pressed="true"] .n { opacity: 0.72; }
.chip { transition: color var(--t-micro) var(--soft),
              background var(--t-enter) var(--soft),
              transform var(--t-control) var(--ease); }
.chip[aria-pressed="true"]:hover { background: var(--nav-field, var(--accent)); color: #fff; filter: brightness(0.85); }

.tally {
  font-family: var(--sans); font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--ink3);
  margin-left: 12px; padding-right: var(--chip-pad); white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* --- buttons ----------------------------------------------- */

/* Anything clickable that isn't a tab looks like a button: a
   surface, a border and a shape. Bare coloured text was reading
   as decoration. */
.btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 10px 6px;
  font-family: var(--sans); font-size: 9px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase; line-height: 1;
  color: var(--field, var(--accent));
  background: transparent;
  border: 1.5px solid var(--field, var(--accent));
  border-radius: 20px;
  cursor: pointer;
  transition: color var(--t-micro) var(--soft),
              border-color var(--t-micro) var(--soft),
              background var(--t-micro) var(--soft),
              transform var(--t-control) var(--ease),
              box-shadow var(--t-micro) var(--soft);
}
.btn:hover {
  color: var(--paper);
  border-color: var(--field, var(--accent));
  background: var(--field, var(--accent));
  /* the plugin just fills. The frosted lift it replaced drew a white
     inset line across the top of every chip. */
  box-shadow: none;
}
.btn:active { transform: scale(0.97); transition-duration: 90ms; }

.btn-quiet {
  color: var(--ink3);
  background: transparent;
  border-color: var(--rule);
}
.btn-quiet:hover { color: var(--ink); border-color: var(--rule-strong); }

.btn svg { width: 12px; height: 12px; flex: 0 0 auto; }

/* --- body -------------------------------------------------- */

.body {
  display: grid;
  grid-template-columns: var(--rail) 1fr;
  gap: var(--col-gap);
  align-items: start;
  padding-bottom: 180px;
}

/* --- index ------------------------------------------------- */

.index {
  position: sticky;
  top: calc(var(--bar) + var(--s1));
  max-height: calc(100vh - var(--bar) - var(--s3));
  overflow-y: auto; overscroll-behavior: contain;
  scrollbar-gutter: stable;
  /* --rail-indent lines the text up with the search field's */
  padding: var(--s4) var(--rail-scroll-clear) var(--s5) 0;
  scrollbar-width: thin; scrollbar-color: var(--mist) transparent;
}
.index::-webkit-scrollbar { width: 5px; }
.index::-webkit-scrollbar-thumb { background: var(--mist); }

.index-group + .index-group { margin-top: var(--s4); }

.index-head {
  display: flex; align-items: baseline; gap: var(--s1);
  /* Margin, not padding. A border-bottom spans the element's padding
     too, so padding-left moved the label right but left the rule
     starting 30px to its left — the rule appeared to overshoot the
     label. Margin moves the box itself, so the rule begins where the
     word does. It ends at the content box, not past it: reaching
     into the scrollbar gutter put the count underneath the
     scrollbar. */
  margin: 0 0 6px var(--rail-indent);
  padding: 0 0 var(--s1);
  border-bottom: 1px solid var(--rule);
}
.index-head .count { font-family: var(--sans); font-size: 10px; color: var(--ink3); margin-left: auto; }

/* The row used to start at the rail's left edge, which left 20px of
   dead space before the marker. It now begins --rail-lead before
   the marker, and makes that back up in padding so the word still
   lands on --rail-indent. */
.index-item {
  position: relative;
  display: block;
  margin-left: calc(var(--rail-indent) - var(--rail-lead));
  width: calc(100% - var(--rail-indent) + var(--rail-lead) - 4px);
  /* +2px on top: the serif's cap sits low in its line box, so equal
     padding reads as the word hugging the top of the row */
  padding: 10px 12px 8px calc(var(--rail-lead) + var(--rail-marker-gap));
  text-align: left;
  font-family: var(--sans); font-size: 15px; line-height: 24px;
  color: var(--ink2);
  border-radius: var(--radius);
  cursor: pointer;
  /* room for the 3px hover shift and its shadow inside the scroll
     container, which clips at its padding box */
  margin-bottom: 2px;
  transition:
    color var(--t-micro) var(--soft),
    background var(--t-micro) var(--soft),
    box-shadow var(--t-micro) var(--soft),
    transform var(--t-control) var(--ease);
}
.index-item:hover {
  color: var(--ink);
  transform: translateX(3px);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.92) 0%,
    rgba(255, 255, 255, 0.5) 100%
  );
  box-shadow:
    inset 0 1px 0 var(--frost-edge),
    inset 0 0 0 1px var(--frost-rim),
    0 2px 7px -3px rgba(31, 44, 58, 0.16);
}
/* the marker grows a stub on hover, so the row hints at what
   selecting it will do */
.index-item:not([aria-current="true"]):hover::before {
  height: calc(100% - 14px);
  opacity: 0.45;
}
.index-item .rp-content { display: block; }
/* No wash on these rows. A circle scaling inside a rounded rectangle
   with overflow: hidden reads as a cropped disc sweeping through —
   the frosted panel is the whole hover here. */
.index-item .rp-wash { display: none; }
.index-item[aria-current="true"] {
  color: var(--nav-field, var(--accent));
  font-weight: 500;
  transition: color var(--t-enter) var(--soft);
}
.index-item::before {
  content: ""; position: absolute; left: var(--rail-lead); top: 50%;
  height: 0; width: 2px; background: var(--nav-field, var(--accent));
  transform: translateY(-50%);
  transition:
    height var(--t-enter) var(--ease),
    background var(--t-enter) var(--soft),
    opacity var(--t-micro) var(--soft);
  z-index: 2;
}
.index-item[aria-current="true"]::before { height: calc(100% - 14px); }

/* --- entries ----------------------------------------------- */

/* The cards end on the last tab's NUMBER, not on its box. At rest no
   pill is drawn, so the rightmost thing actually visible in both
   states is that glyph — it sits --bar-inset inside the pill and
   another --chip-pad inside its own chip. This is the rule the left
   side already follows: the search text meets the rail's text, ink
   to ink, rather than box to box. */
.entries {
  max-width: calc(660px - var(--bar-inset) - var(--chip-pad) - var(--optical-ink));
  padding-top: var(--s4);
}

/* Set exactly like the rail's own head — same hairline, same
   count on the right, same 8px to the rule and 16px past it — so
   the two columns start on one line and stay in step down the
   page. */
.cat-marker {
  display: flex;
  align-items: baseline;
  gap: var(--s2);
  padding: 0 0 var(--s1);
  border-bottom: 1px solid var(--rule);
  margin-bottom: var(--s2);
}
/* Both heads, in opposite directions: the label sits left of where
   its box starts, so it moves right; the count's trailing bearing
   leaves it looking pushed out, so it moves back in. */
.index-head .eyebrow,
.cat-marker .eyebrow {
  transform: translateX(var(--optical-label));
}
.index-head .count,
.cat-marker .count {
  transform: translateX(calc(var(--optical-label) * -1));
}

.cat-marker .count {
  margin-left: auto;
  font-family: var(--sans);
  font-size: 10px;
  color: var(--ink3);
  font-variant-numeric: tabular-nums;
}
/* the break between categories, carried by the label's own space */
.entries > section + section .cat-marker { margin-top: var(--s6); }

.card {
  background: var(--card);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  margin-bottom: 10px;
  scroll-margin-top: calc(var(--bar) + var(--s3));
  transition: border-color var(--t-control) var(--soft),
              box-shadow var(--t-control) var(--soft),
              transform var(--t-control) var(--ease);
}
.card:hover {
  border-color: var(--mist);
  transform: translateY(-2px);
  box-shadow:
    inset 0 1px 0 var(--frost-edge),
    0 2px 4px -2px rgba(31, 44, 58, 0.06),
    0 14px 30px -16px rgba(31, 44, 58, 0.26);
}
.card.is-open {
  /* beats .reveal — an open card can never be an invisible gap */
  opacity: 1;
  transform: none;
  border-color: color-mix(in srgb, var(--field) 34%, transparent);
  box-shadow: 0 2px 6px -2px rgba(11,11,20,0.05),
              0 18px 40px -22px color-mix(in srgb, var(--field) 42%, transparent);
}
/* a spine of the term's own colour, drawn on open */
.card::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--field); border-radius: var(--radius) 0 0 var(--radius);
  opacity: 0; transform: scaleY(0.4); transform-origin: 50% 50%;
  transition: opacity var(--t-control) var(--soft), transform var(--t-control) var(--ease);
}
.card.is-open::before { opacity: 1; transform: none; }
.card { position: relative; }

.card-head {
  width: 100%;
  display: block;
  text-align: left;
  padding: var(--s3) calc(var(--s3) + 2px);
  cursor: pointer;
  border-radius: var(--radius);
}

.card-title {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}
.card-title h3 {
  font-family: var(--display); text-transform: uppercase;
  font-size: 30px; line-height: 30px; letter-spacing: 0.005em;
  font-weight: 400; margin: 0; color: var(--ink);
  transition: color var(--t-micro) var(--soft);
}
.card-head:hover .card-title h3,
.card.is-open .card-title h3 { color: var(--field); }

/* The pill itself keeps its shape; the padding goes on a wrapper, so
   the filled surface is unchanged and only its position shifts. */
.aud-wrap { display: inline-flex; gap: 4px; padding-top: 2px; }

.aud {
  display: inline-block;
  font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--field);
  background: color-mix(in srgb, var(--field) 12%, #FFFFFF);
  border-radius: 20px; padding: 5px 9px 4px; white-space: nowrap; line-height: 1;
  transition: background var(--t-micro) var(--soft), color var(--t-micro) var(--soft);
}
.card.is-open .aud { background: var(--field); color: var(--paper); }

.chev {
  margin-left: auto; width: 26px; height: 26px; flex: 0 0 auto;
  /* box-sizing keeps the 26px box; the padding lifts the glyph inside
     it so it centres against the cap height rather than the line box */
  padding-bottom: 3px;
  display: grid; place-items: center;
  color: var(--ink3);
  transition: transform var(--t-control) var(--ease), color var(--t-micro) var(--soft);
}
.card.is-open .chev { transform: rotate(180deg); color: var(--accent); }
.card-head:hover .chev { color: var(--accent); }

.card-short {
  display: block;
  margin: 10px 0 0;
  padding-left: 2px;                     /* optical */
  font-size: 17px; line-height: 27px;
  color: var(--ink2);
  max-width: 58ch;
}

/* Opening glides on grid-template-rows rather than a measured
   pixel height: no reading offsetHeight, no transitionend
   bookkeeping, and it reflows on its own if the text wraps
   differently. */
.drawer {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--t-open) var(--ease);
}
.card.is-open .drawer { grid-template-rows: 1fr; }

.drawer-inner {
  overflow: hidden;
  min-height: 0;
  opacity: 0;
  transform: translateY(-6px);
  transition: opacity var(--t-open) var(--soft), transform var(--t-open) var(--ease);
}
.card.is-open .drawer-inner { opacity: 1; transform: none; }
.drawer-pad { padding: 0 calc(var(--s3) + 6px) var(--s3); }

/* the same pill the panel puts above this paragraph */
.chip-label {
  display: inline-block; margin: 0 0 10px -2px;
  background: color-mix(in srgb, var(--field) 12%, #FFFFFF);
  color: var(--field);
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em;
  text-transform: uppercase; padding: 6px 9px 4px; border-radius: 20px;
  /* without this it inherits the page's 27px line-height and the pill
     grows a band of empty space above the text - the "white line" */
  line-height: 1;
}
.long { margin: 0; padding-left: 2px; font-size: 17px; line-height: 27px; color: var(--ink2); }

/* the illustration, on a light tint of its own category */
.illo {
  margin: var(--s3) 0 0;
  padding: var(--s2);
  background: color-mix(in srgb, var(--field) 6%, rgba(255,255,255,0.86));
  line-height: 0;
  overflow: hidden;
}
.illo img {
  width: 100%; height: auto; display: block;
  opacity: 0; transform: scale(1.012);
  transition: opacity 620ms var(--soft), transform 900ms var(--ease);
}
.card.is-open .illo img { opacity: 1; transform: none; }

.quote {
  margin: var(--s3) 0 0;
  padding: var(--s3);
  border-radius: 0;
  background: color-mix(in srgb, var(--field) 13%, rgba(255,255,255,0.72));
  -webkit-backdrop-filter: blur(14px) saturate(170%);
  backdrop-filter: blur(14px) saturate(170%);
  box-shadow: 0 2px 10px -6px rgba(11,11,20,0.28);
}
.quote p {
  margin: 0; font-family: var(--serif); font-style: italic;
  font-size: 19px; line-height: 30px; color: var(--ink);
}
.quote footer {
  margin-top: 12px; font-size: 10px; font-weight: 500;
  letter-spacing: 0.06em; text-transform: uppercase; color: #3C3C48;
}

/* A tertiary link: text, and an underline that opens from the centre.
   It sits var(--s3) below the example, the same gap the example keeps
   from the definition above it. */
.tlink {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: var(--s3);
  /* 4px in, to sit level by eye with the prose above it */
  padding: 0 0 3px 4px;
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
  background: none;
  border: none;
  cursor: pointer;
  /* the label is two words and belongs on one line */
  white-space: nowrap;
  transition: color var(--t-micro) var(--soft);
}
/* The icon carries no width of its own - it was sized by .btn svg,
   which stopped applying when this became a .tlink. An unsized SVG
   falls back to 300x150, which is what made it enormous and pushed
   the label onto a second line. */
.tlink svg { width: 12px; height: 12px; flex: 0 0 auto; }
.tlink::after {
  content: "";
  position: absolute;
  left: 50%; right: 50%; bottom: 0;
  height: 1px;
  background: var(--accent);
  transition: left var(--t-enter) var(--ease), right var(--t-enter) var(--ease);
}
.tlink:hover { color: var(--accent-hover); }
/* Starts at the padding, not the box: the 4px optical inset would
   otherwise put the underline 4px left of the first letter. Stops
   0.06em short on the right, where the letter-spacing leaves its
   trailing gap after the final character. */
.tlink:hover::after { left: 4px; right: 0.06em; }

.actions {
  /* 16px above the rule and 16px below it, so the divider sits
     centred in the space between the link and the Related label */
  margin-top: var(--s2);
  padding-top: var(--s2);
  border-top: 1px solid var(--rule);
}
/* tight to the terms it labels, and 2px in to sit level with them */
.nearby-label {
  margin: 0 0 4px;
  padding-left: 4px;
}
.nearby-row { display: flex; gap: 6px; flex-wrap: wrap; }

/* --- empty ------------------------------------------------- */

.empty { padding: var(--s6) 0 var(--s5); max-width: 46ch; }
.empty h2 {
  font-family: var(--serif); font-size: 28px; line-height: 38px;
  font-weight: 400; margin: var(--s2) 0 0; color: var(--ink);
}
.empty p { color: var(--ink3); margin: 12px 0 0; }
.empty-actions { margin-top: var(--s3); display: flex; gap: var(--s1); flex-wrap: wrap; }

/* --- foot -------------------------------------------------- */

.foot {
  border-top: 1px solid var(--rule);
  padding: var(--s3) 0 var(--s6);
  color: var(--ink3); font-family: var(--sans); font-size: 11px;
  letter-spacing: 0.08em;
  display: flex; justify-content: space-between; gap: var(--s2); flex-wrap: wrap;
}

.index-toggle { display: none; }

:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: var(--radius); }

/* --- responsive -------------------------------------------- */

@media (max-width: 980px) {
  :root { --gutter: 20px; --rail: 100%; }
  .masthead { padding: 56px 0 var(--s3); }
  .body { grid-template-columns: 1fr; gap: 0; }
  .bar { height: auto; flex-wrap: wrap; padding: 10px; border-radius: var(--radius); }
  .search { flex: 1 1 100%; order: 3; }
  .filters { order: 2; overflow-x: auto; max-width: 100%; margin-left: 0; }
  .tally { display: none; }
  .index-toggle {
    display: inline-flex; align-items: center; height: 36px; padding: 0 14px;
    margin-top: var(--s3);
    font-family: var(--sans); font-size: 11px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--ink2); border: 1px solid var(--rule-strong);
    border-radius: var(--radius); cursor: pointer; background: var(--card);
  }
  .index {
    position: static; max-height: none; overflow: visible;
    padding: var(--s2) 0 var(--s3); border-bottom: 1px solid var(--rule);
  }
  .index.is-closed { display: none; }
  .entries { padding-top: var(--s3); }
  .card-title h3 { font-size: 22px; line-height: 29px; }
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .masthead, .pf::before { transform: none !important; }
  .reveal { opacity: 1; transform: none; transition: none; }
  .rp-wash::after, .rp-wide .rp-wash::after {
    transform: translate(-50%,-50%) scale(2.3) !important;
    opacity: 0; transition: opacity 120ms linear !important;
  }
  .rp:hover .rp-wash::after, .rp:focus-visible .rp-wash::after { opacity: 1; }
  .rp-ring, .flake { display: none; }
  .mark-bar.is-melting .mark-star,
  .mark-head.is-traveling .mark-travel,
  .mark-head.is-traveling .dust i { animation: none; }
  .drawer { transition: none; }
  /* the frost stays — it is colour, not motion — but nothing moves */
  .chip:hover, .index-item:hover, .btn:hover, .card:hover { transform: none; }
}
`;

/* ============================================================
   Ripple
   ============================================================ */

let ringId = 0;

function Ripple({
  as: Tag = "button",
  wide = false,
  washColor,
  ring = true,
  className = "",
  onClick,
  children,
  style,
  ...rest
}) {
  const hostRef = useRef(null);
  const [rings, setRings] = useState([]);

  const handleMove = useCallback(
    (e) => {
      if (wide) return;
      const el = hostRef.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      el.style.setProperty("--wash-x", `${((e.clientX - box.left) / box.width) * 100}%`);
    },
    [wide]
  );

  const handleDown = useCallback(
    (e) => {
      if (!ring) return;
      const el = hostRef.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      const size = Math.max(box.width, box.height);
      const base = ++ringId;
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;
      setRings((r) => [
        ...r,
        { id: base, x, y, size, second: false },
        { id: base + 0.5, x, y, size: size * 0.82, second: true },
      ]);
      window.setTimeout(
        () => setRings((r) => r.filter((k) => k.id !== base && k.id !== base + 0.5)),
        T.ripple + T.ringGap
      );
    },
    [ring]
  );

  return (
    <Tag
      ref={hostRef}
      className={`rp ${wide ? "rp-wide" : ""} ${className}`}
      onPointerMove={handleMove}
      onPointerDown={handleDown}
      onClick={onClick}
      style={style}
      {...rest}
    >
      <span
        className="rp-wash"
        style={washColor ? { "--wash-color": washColor } : undefined}
        aria-hidden="true"
      />
      {rings.map((r) => (
        <span
          key={r.id}
          className={`rp-ring ${r.second ? "is-second" : ""}`}
          aria-hidden="true"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}
      <span className="rp-content">{children}</span>
    </Tag>
  );
}

/* ============================================================
   The mark
   Frost's own logo, traced to a path. Hovering thaws it: the
   rosette blurs out, a scatter of flakes falls, and it settles
   back. Clicking takes you to the top — the bar is always on
   screen, so the mark is a permanent way back and a separate
   back-to-top control would be a second button for the same job.
   ============================================================ */

const FLAKES = [
  { x: 9, y: 16, r: 1.5, fx: -4, d: 0 },
  { x: 16, y: 11, r: 1.1, fx: -2, d: 90 },
  { x: 24, y: 9, r: 1.7, fx: 0, d: 40 },
  { x: 32, y: 12, r: 1.2, fx: 2, d: 140 },
  { x: 39, y: 17, r: 1.4, fx: 4, d: 70 },
  { x: 13, y: 26, r: 1.2, fx: -5, d: 180 },
  { x: 21, y: 30, r: 1.6, fx: -1, d: 120 },
  { x: 28, y: 28, r: 1.1, fx: 2, d: 210 },
  { x: 35, y: 31, r: 1.4, fx: 5, d: 160 },
  { x: 24, y: 21, r: 1.3, fx: 0, d: 240 },
];

function MarkGlyph() {
  return (
    /* The plugin's mark: one crystal at rest, four shards on hover -
       a cell, a flake, a shard and a bead. Same 24 box as the panel so
       the two products carry the same object. */
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path className="core" d="M12 1.6L20.4 9.2 12 22.4 3.6 9.2z" />
      <path className="s1" d="M11.1 6.5L8.8 10.5H4.2L1.9 6.5 4.2 2.5h4.6z" />
      <g className="s2" strokeWidth="1.9" strokeLinecap="round">
        <path d="M12.9 6.5h9.2M15.2 2.5l4.6 8M19.8 2.5l-4.6 8" />
      </g>
      <path className="s3" d="M6.5 12.9L11.1 17.5 6.5 22.1 1.9 17.5z" />
      <circle className="s4" cx="17.5" cy="17.5" r="4.4" />
    </svg>
  );
}


/* The dust that carries the mark across. These are HTML, not SVG
   circles: inside a scaled <svg> a translate of 600px means 600
   user units, which at this scale lands nowhere near the far side. */
const DUST = Array.from({ length: 26 }, (_, i) => {
  const r = (n) => ((Math.sin(i * 17.3 + n * 41.7) * 43758.5453) % 1 + 1) % 1;
  return {
    size: 1.6 + r(1) * 3.6,
    x0: (r(2) * 78 - 39).toFixed(0),
    y0: (r(3) * 78 - 39).toFixed(0),
    arc: (r(4) * 66 - 40).toFixed(0),
    drop: (r(5) * 40 - 6).toFixed(0),
    delay: Math.round(r(6) * 400),
    dur: 760 + Math.round(r(7) * 420),
  };
});

/* 34 flakes across the title, seeded so they don't reshuffle */
const TITLE_SNOW = Array.from({ length: 34 }, (_, i) => {
  const r = (n) => ((Math.sin(i * 31.7 + n * 12.9898) * 43758.5453) % 1 + 1) % 1;
  return {
    left: `${(4 + r(1) * 92).toFixed(2)}%`,
    top: `${(8 + r(2) * 74).toFixed(2)}%`,
    size: 2 + r(3) * 4.5,
    tx: (r(4) * 54 - 27).toFixed(0),
    ty: (34 + r(5) * 54).toFixed(0),
    delay: Math.round(r(6) * 420),
  };
});

/* 42 flakes, seeded once so they don't reshuffle on every render */
/* Ambient, not weather — and depth rather than density. Three
   layers: far ones small, faint, blurred and slow with barely any
   sway; near ones larger, brighter, sharper and swinging wider.
   Each layer drifts at its own rate as the page scrolls, so the
   field has parallax instead of sitting flat on the glass. Overall
   presence is close to the previous single layer; the elaboration
   is in the separation, not the count. */
/* Blur is expensive in visibility, not just in depth: it spreads a
   flake over (size + 2 x blur) px and cuts its peak alpha by the
   square of that ratio. A 2.5px dot at 0.23 opacity under 1.5px of
   blur keeps about a third of its alpha, which on this page is
   nothing. Depth now comes mostly from size, speed and sway, with
   only a touch of blur on the far layer. */
const LAYERS = [
  { key: "far",  n: 14, size: [4.5, 3.5], op: [0.28, 0.14], blur: 0.5, dur: [32, 14], sway: [8, 12],  par: 0.012 },
  { key: "mid",  n: 17, size: [6.5, 4.5], op: [0.38, 0.18], blur: 0.2, dur: [22, 11], sway: [14, 18], par: 0.026 },
  { key: "near", n: 10, size: [9.5, 5.5], op: [0.48, 0.20], blur: 0,   dur: [14, 9],  sway: [24, 26], par: 0.044 },
];

const SNOW = LAYERS.map((L, li) =>
  Array.from({ length: L.n }, (_, i) => {
    const r = (n) =>
      ((Math.sin((i + li * 97) * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
    return {
      left: `${(r(1) * 100).toFixed(2)}%`,
      size: L.size[0] + r(2) * L.size[1],
      dur: L.dur[0] + r(3) * L.dur[1],
      delay: -r(4) * 48,
      sway: (L.sway[0] + r(5) * L.sway[1]).toFixed(0),
      o: L.op[0] + r(6) * L.op[1],
      blur: L.blur,
      /* half a turn either way, so they never rotate in unison */
      spin: Math.round(120 + r(7) * 130) * (r(8) > 0.5 ? 1 : -1),
    };
  })
);

function Snow() {
  if (reduced()) return null;
  return (
    <div className="snow" aria-hidden="true">
      {SNOW.map((layer, li) => (
        <div
          key={LAYERS[li].key}
          className="snow-layer"
          style={{ "--par": LAYERS[li].par }}
        >
          {layer.map((f, i) => (
            <svg
              key={i}
              className="snow-star"
              viewBox="0 0 100 100"
              style={{
                left: f.left,
                width: f.size,
                height: f.size,
                animationDuration: `${f.dur}s`,
                animationDelay: `${f.delay}s`,
                /* the outline has to ride with any blur, so both
                   live on one declaration */
                filter: `drop-shadow(0 0 1px rgba(86, 130, 180, 0.55))${
                  f.blur ? ` blur(${f.blur}px)` : ""
                }`,
                "--sway": `${f.sway}px`,
                "--spin": `${f.spin}deg`,
                "--o": f.o,
              }}
            >
              <use href="#pf-flake" />
            </svg>
          ))}
        </div>
      ))}
    </div>
  );
}

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true">
    <path
      d="M5 9l7 7 7-7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M10 13a5 5 0 007.5.5l2-2A5 5 0 0012.5 4.5l-1 1M14 11a5 5 0 00-7.5-.5l-2 2A5 5 0 0011.5 19.5l1-1"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ============================================================
   Data helpers
   ============================================================ */

/* "Shared" said the words belonged to no one in particular, which read
   as vague rather than inclusive - and it sat beside a filter called
   "All", so the two were easy to confuse. "All teams" names who uses
   the term, and pairs against "Everything" for the whole vocabulary:
   teams versus things, rather than two words for the same idea. */
const AUDIENCE_LABELS = { all: "All teams", designers: "Designers", devs: "Devs", content: "Content" };

const FILTERS = [
  { key: "everything", label: "Everything" },
  { key: "all", label: "All teams" },
  { key: "designers", label: "Designers" },
  { key: "devs", label: "Devs" },
  { key: "content", label: "Content" },
];

const BY_SLUG = new Map(VOCABULARY.map((e) => [e.slug, e]));

function matches(entry, q) {
  const needle = q.toLowerCase().trim();
  if (!needle) return true;
  if (entry.term.toLowerCase().includes(needle)) return true;
  if (entry.slug.includes(needle)) return true;
  if (entry.aka.some((a) => a.toLowerCase().includes(needle))) return true;
  return (
    entry.short.toLowerCase().includes(needle) ||
    entry.long.toLowerCase().includes(needle) ||
    entry.example.toLowerCase().includes(needle)
  );
}

const inAudience = (entry, key) => key === "everything" || entry.audience.includes(key);
const audienceLabel = (entry) => entry.audience.map((a) => AUDIENCE_LABELS[a] || a).join(" · ");

function slugFromHash() {
  try {
    const m = window.location.hash.match(/^#\/term\/([a-z0-9-]+)$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/* Hash routing needs a real document URL. Inside a sandboxed iframe
   the document's origin and its URL don't match and every History
   call throws. Probe once, then fall back to in-memory navigation. */
const CAN_ROUTE = (() => {
  try {
    window.history.replaceState(null, "", window.location.href);
    return true;
  } catch {
    return false;
  }
})();

function writeHash(slug) {
  if (!CAN_ROUTE) return;
  try {
    window.history.replaceState(null, "", `#/term/${slug}`);
  } catch {
    /* host revoked it mid-session */
  }
}

function permalinkFor(slug) {
  try {
    const { origin, pathname } = window.location;
    return `${origin}${pathname}#/term/${slug}`;
  } catch {
    return `#/term/${slug}`;
  }
}

const BAR_H = 88; /* the bar's stuck height — keep in step with --bar */

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Reveal-on-scroll has to be React state, not a class poked onto
   the node. className is a controlled attribute: the moment
   anything re-renders — opening a card re-renders every card —
   React rewrites it from the template and an externally added
   class is gone. That silently reset every card to opacity 0,
   which looked like cards vanishing, dead index links and tabs
   that didn't filter. */
function useInView(ref) {
  const [inView, setInView] = useState(() => reduced());
  useEffect(() => {
    if (reduced()) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}

function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref);
  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "is-in" : ""} ${className}`}
      style={{ "--d": `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ============================================================
   App
   ============================================================ */

export default function App() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("everything");
  const [open, setOpen] = useState(null); // one card at a time
  const openRef = useRef(null);
  openRef.current = open;
  const navFieldRef = useRef(null);
  const [current, setCurrent] = useState(null);
  const [indexOpen, setIndexOpen] = useState(false);
  const [lifted, setLifted] = useState(false);

  const entryRefs = useRef(new Map());
  const suppressObserver = useRef(false);
  const searchRef = useRef(null);
  const rootRef = useRef(null);
  const entriesRef = useRef(null);
  const mastRow = useRef(null);
  const headMark = useRef(null);
  const applyRef = useRef(null);
  const controlsRef = useRef(null);
  const flatRef = useRef([]);
  const tops = useRef([]);
  const needsMeasure = useRef(true);
  const currentRef = useRef(null);
  const meltTimer = useRef(0);
  const travelTimer = useRef(0);
  const pendingTop = useRef(false);
  const indexRef = useRef(null);
  const [melting, setMelting] = useState(false);
  const [traveling, setTraveling] = useState(false);
  const [naming, setNaming] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);

  const searched = useMemo(() => VOCABULARY.filter((e) => matches(e, query)), [query]);
  const visible = useMemo(() => searched.filter((e) => inAudience(e, filter)), [searched, filter]);

  const counts = useMemo(() => {
    const out = {};
    for (const f of FILTERS) out[f.key] = searched.filter((e) => inAudience(e, f.key)).length;
    return out;
  }, [searched]);

  const groups = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        category,
        entries: visible
          .filter((e) => e.category === category)
          .sort((a, b) => a.term.localeCompare(b.term)),
      })).filter((g) => g.entries.length > 0),
    [visible]
  );

  /* One place decides the colour: whichever entry is highlighted in the
     index. The bar, the mark, the active filter and the index marker all
     read it, so they cannot drift apart. */
  /* One place decides the bar's colour, in this order:
       an open card, while any part of it is still on screen;
       otherwise whatever the index has highlighted.
     Reading the same measurements the highlight uses means the two can
     never disagree, and no extra observer runs per frame. */
  const setNavField = useCallback((slug) => {
    const entry = BY_SLUG.get(slug);
    if (!entry || navFieldRef.current === slug) return;
    const root = document.querySelector(".pf");
    if (!root) return;
    navFieldRef.current = slug;
    root.style.setProperty("--nav-field", fieldOf(entry));
  }, []);

  const resolveNavField = useCallback(
    (highlighted, y, line) => {
      const openSlug = openRef.current;
      if (openSlug) {
        const box = tops.current.find((t) => t.slug === openSlug);
        /* still on screen: its foot is below the bar and its head is
           above the fold */
        const onScreen =
          box &&
          box.bottom - y > line &&
          box.top - y < (window.innerHeight || 0);
        if (onScreen) {
          setNavField(openSlug);
          return;
        }
      }
      if (highlighted) setNavField(highlighted);
    },
    [setNavField]
  );

  /* opening a card recolours straight away rather than waiting for the
     next scroll frame; closing it hands the colour back to the index */
  useEffect(() => {
    if (open) setNavField(open);
    else if (currentRef.current) setNavField(currentRef.current);
  }, [open, setNavField]);

  const flat = useMemo(() => groups.flatMap((g) => g.entries), [groups]);
  flatRef.current = flat;

  /* -- scroll: parallax offset, the lifted bar, nothing else -- */

  useEffect(() => {
    let frame = 0;
    const apply = () => {
      const y = window.scrollY || 0;
      setLifted(y > 12);
      const el = rootRef.current;
      if (el && !reduced()) {
        el.style.setProperty("--sy", String(y));
        el.style.setProperty("--snow-y", `${y}px`);
        el.style.setProperty("--mast-o", String(Math.max(0, 1 - y / 420)));
      }

      /* The only thing left to measure for the mark is how far its
         dust can skate before it reaches the far end of the title.
         That is layout, not scroll — the mark itself is in normal
         flow now and positions itself. */
      const row = mastRow.current;
      const head = headMark.current;
      if (row && head) {
        const rr = row.getBoundingClientRect();
        const rh = head.getBoundingClientRect();
        head.style.setProperty("--travel", `${Math.max(0, rr.right - rh.right)}px`);
      }

      /* --- which card is under the bar's bottom edge --- */
      if (!suppressObserver.current) {
        if (needsMeasure.current) {
          tops.current = flatRef.current
            .map((entry) => {
              const node = entryRefs.current.get(entry.slug);
              if (!node) return null;
              const r = node.getBoundingClientRect();
              return { slug: entry.slug, top: r.top + y, bottom: r.bottom + y };
            })
            .filter(Boolean);
          needsMeasure.current = false;
        }
        const bar = controlsRef.current;
        const line = (bar ? bar.getBoundingClientRect().bottom : 88) + 4;
        /* The first card still readable below the line — not the
           last one whose top has crossed it. Those differ: once a
           card has scrolled almost entirely under the bar, its top
           is past the line but the card you are actually reading is
           the next one. A card has to show at least MIN_VISIBLE of
           itself to claim the highlight, so a sliver tucked behind
           the bar doesn't hold it. */
        const MIN_VISIBLE = 28;
        let found = null;
        for (const item of tops.current) {
          if (item.bottom - y - line >= MIN_VISIBLE) {
            found = item.slug;
            break;
          }
        }
        if (!found && tops.current.length) {
          found = tops.current[tops.current.length - 1].slug;
        }
        if (found && found !== currentRef.current) {
          currentRef.current = found;
          setCurrent(found);
        }
        /* every frame, not only when the highlight moves: an open card
           can scroll out of view without the highlight changing */
        resolveNavField(found || currentRef.current, y, line);
      }

      frame = 0;
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };
    apply();
    applyRef.current = apply;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    /* the list changing length moves both slots without necessarily
       firing a scroll event — that is the tab-switch case */
    const ro = new ResizeObserver(() => {
      needsMeasure.current = true;
      onScroll();
    });
    if (document.body) ro.observe(document.body);
    /* the display face changes the masthead's height when it
       arrives, which moves the slot under the mark */
    document.fonts?.ready?.then(apply).catch(() => {});
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ro.disconnect();
      applyRef.current = null;
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  /* -- navigate to a term ---------------------------------- */

  const goTo = useCallback((slug, { push = true, expand = true } = {}) => {
    suppressObserver.current = true;
    setCurrent(slug);
    if (expand) setOpen(slug);
    if (push) writeHash(slug);

    /* Two passes. The first gets you roughly there; the second
       runs once the drawer has finished opening, because opening
       this card and collapsing the previously open one both change
       the page height around the target — which is what pushed the
       card up under the bar and cut its top off. */
    const place = () => {
      const node = entryRefs.current.get(slug);
      if (!node) return false;
      const top = window.scrollY + node.getBoundingClientRect().top - (BAR_H + 20);
      window.scrollTo({
        top: Math.max(0, top),
        behavior: reduced() ? "auto" : "smooth",
      });
      return true;
    };

    let tries = 0;
    const attempt = () => {
      if (place()) return;
      if (tries++ < 6) window.requestAnimationFrame(attempt);
    };
    window.requestAnimationFrame(attempt);

    const settle = window.setTimeout(place, T.open + 90);

    window.setTimeout(() => {
      suppressObserver.current = false;
      window.clearTimeout(settle);
    }, T.open + 400);
  }, []);

  const thaw = useCallback(() => {
    setMelting((on) => {
      if (on) return on;
      window.clearTimeout(meltTimer.current);
      meltTimer.current = window.setTimeout(() => setMelting(false), T.melt);
      return true;
    });
  }, []);

  const skate = useCallback(() => {
    setTraveling((on) => {
      if (on) return on;
      window.clearTimeout(travelTimer.current);
      travelTimer.current = window.setTimeout(() => setTraveling(false), T.travel);
      return true;
    });
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(meltTimer.current);
      window.clearTimeout(travelTimer.current);
    },
    []
  );

  /* The plugin's mark opens "all 74 words". Here the whole page already
     is that, so the mark clears whatever is narrowing it - the search,
     the filter, an open card - and returns you to the full list. */
  const toTop = useCallback(() => {
    setQuery("");
    setFilter("everything");
    setOpen(null);
    window.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });
  }, []);

  /* -- open at the hash ------------------------------------ */

  useEffect(() => {
    const slug = slugFromHash();
    if (!slug || !BY_SLUG.has(slug)) return;
    const id = window.setTimeout(() => goTo(slug, { push: false }), 90);
    return () => window.clearTimeout(id);
  }, [goTo]);

  useEffect(() => {
    if (!CAN_ROUTE) return;
    const onHash = () => {
      const slug = slugFromHash();
      if (slug && BY_SLUG.has(slug)) goTo(slug, { push: false });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [goTo]);

  /* -- which card is in view ------------------------------- */

  /* Which term is current is decided by the bar's own bottom edge:
     the last card whose top has passed under it. That line is what
     a reader treats as the top of the content, and measuring it
     beats the guessed offset this used before — the bar's height
     changes with the viewport, and a constant can only ever be
     right at one size. Positions are cached and only re-measured
     when the layout actually moves, so this costs one comparison
     per card per frame rather than a full layout read. */
  useEffect(() => {
    needsMeasure.current = true;
  }, [flat, open]);

  useEffect(() => {
    if (!current) return;
    const rail = indexRef.current;
    const item = rail?.querySelector(`[data-index-for="${current}"]`);
    if (!rail || !item) return;

    /* deliberately not scrollIntoView: that walks up and scrolls
       every scrollable ancestor including the window, so tracking
       the active term shoved the page around under the reader */
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    const viewTop = rail.scrollTop;
    const viewBottom = viewTop + rail.clientHeight;
    const pad = 24;
    if (top < viewTop + pad) {
      rail.scrollTop = Math.max(0, top - pad);
    } else if (bottom > viewBottom - pad) {
      rail.scrollTop = bottom - rail.clientHeight + pad;
    }
  }, [current]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        if (document.activeElement === searchRef.current) {
          setQuery("");
          searchRef.current?.blur();
        } else if (open) {
          setOpen(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const registerEntry = useCallback((slug, node) => {
    if (node) entryRefs.current.set(slug, node);
    else entryRefs.current.delete(slug);
  }, []);

  /* A new tab is a new list, so put the reader at the top of it —
     not back at the masthead, and not stranded mid-scroll in a set
     that no longer holds what they were reading. */
  /* The scroll has to happen after React has committed the new
     list — measuring during the click handler reads the old list's
     geometry and lands nowhere useful, which is what made tab
     switching feel broken. */
  useLayoutEffect(() => {
    if (!pendingTop.current) return;
    pendingTop.current = false;
    /* the rail keeps its own scroll position, so without this you
       switch tabs and are still looking at the middle of the new
       list — which reads as "the filter did nothing" */
    if (indexRef.current) indexRef.current.scrollTop = 0;
    const list = entriesRef.current;
    const top = list
      ? window.scrollY + list.getBoundingClientRect().top - (BAR_H + 16)
      : 0;
    window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    applyRef.current?.();
  }, [filter]);

  const pickFilter = useCallback(
    (key) => {
      if (key === filter) return;
      setFilter(key);
      setCurrent(null);
      setOpen(null);
      pendingTop.current = true;
    },
    [filter]
  );

  const narrowed = query.trim().length > 0;
  const tally = `${visible.length} of ${VOCABULARY.length}`;

  return (
    <div className={`pf ${lifted ? "is-lifted" : ""}`} ref={rootRef}>
      <style>{CSS}</style>

      {/* The plugin's browse page, as an overlay. The site already lists
          everything, but collapsed by category it answers the same
          question - what is in here? - without a scroll. */}
      <div className={`browse ${browsing ? "is-in" : ""}`} aria-hidden={!browsing}>
        <div className="browse-inner">
        {/* the plugin's bar: the back arrow, then her name */}
        <div className="browse-bar">
          <div className="browse-bar-inner">
          <button
            className="browse-back"
            type="button"
            onClick={() => setBrowsing(false)}
            aria-label="Back"
            data-tip="Back"
          >
            <svg viewBox="4 6 16 12" fill="none" aria-hidden="true">
              <path d="M19 12H5M10 7l-5 5 5 5" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="browse-name">Simone</span>
          </div>
        </div>
          <div className="browse-head">
            <h2>All {VOCABULARY.length} words</h2>
            <p>Frost has named them. Each has its place.</p>
          </div>
          {CATEGORIES.map((cat) => {
            const list = VOCABULARY.filter((e) => e.category === cat)
              .slice()
              .sort((a, b) => a.term.localeCompare(b.term));
            if (!list.length) return null;
            const isOpen = openGroup === cat;
            return (
              <div
                className={`bgroup ${isOpen ? "is-open" : ""}`}
                key={cat}
                style={{ "--field": FIELD[cat] }}
              >
                <button
                  className="bgroup-head"
                  type="button"
                  onClick={() => setOpenGroup(isOpen ? null : cat)}
                  aria-expanded={isOpen}
                >
                  <span className="dot" />
                  <span className="nm">{cat}</span>
                  <span className="n">{list.length}</span>
                  <svg className="caret" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 9.5l6 6 6-6" stroke="currentColor" strokeWidth="2.4"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div className="bgroup-body">
                  <div>
                    <div className="nearby-row">
                      {list.map((e) => (
                        <button
                          key={e.slug}
                          className="btn"
                          style={{ "--field": FIELD[cat] }}
                          onClick={() => {
                            setBrowsing(false);
                            goTo(e.slug);
                          }}
                        >
                          {e.term}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* shared by the snow and by the dissolving ghost, so it has to sit
          outside <Snow/> — that returns null under reduced motion */}
      <svg className="snow-defs" aria-hidden="true">
        <defs>
          {/* Frost, not paint: light catches the upper edge of a
              crystal and the blue settles into the lower. A real
              backdrop-filter would frost a square — the SVG's box is
              rectangular, so you'd see blurred boxes rather than
              stars. */}
          <linearGradient id="pf-frost" x1="0" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
            <stop offset="48%" stopColor="#DCEAF9" />
            <stop offset="100%" stopColor="#B4D1EE" />
          </linearGradient>
        </defs>
        <symbol id="pf-flake" viewBox="0 0 100 100">
          <path d={FROST_MARK_SIMPLE} fillRule="evenodd" />
        </symbol>
      </svg>

      <Snow />

      <header className="shell masthead">
        <div className="mast-row">
          <span
            className={`title-wrap ${traveling ? "is-melting" : ""} ${
              naming ? "is-naming" : ""
            }`}
            ref={mastRow}
          >
          <button
            className={`mark-head ${traveling ? "is-traveling" : ""}`}
            ref={headMark}
            onClick={() => setBrowsing(true)}
            aria-label="Browse all 74 words"
            data-tip="Browse all 74"
          >
            <span className="mark-travel">
              <MarkGlyph />
            </span>
            <span className="dust" aria-hidden="true">
              {DUST.map((d, i) => (
                <i
                  key={i}
                  style={{
                    width: d.size,
                    height: d.size,
                    "--x0": `${d.x0}px`,
                    "--y0": `${d.y0}px`,
                    "--arc": `${d.arc}px`,
                    "--drop": `${d.drop}px`,
                    animationDelay: `${d.delay}ms`,
                    animationDuration: `${d.dur}ms`,
                  }}
                />
              ))}
            </span>
          </button>
          {/* The burst belongs to the name, not the mark: hovering the
              letters is what scatters it. */}
          <h1
            className="wordmark"
            onMouseEnter={() => {
              setNaming(true);
              skate();
            }}
            onMouseLeave={() => setNaming(false)}
          >
            Simone’s <em>Permafrost</em>
          </h1>
          <span className="title-snow" aria-hidden="true">
            {TITLE_SNOW.map((f, i) => (
              <i
                key={i}
                style={{
                  left: f.left,
                  top: f.top,
                  width: f.size,
                  height: f.size,
                  "--tx": `${f.tx}px`,
                  "--ty": `${f.ty}px`,
                  animationDelay: `${f.delay}ms`,
                }}
              />
            ))}
          </span>
          </span>
        </div>
      </header>

      <div className={`controls ${lifted ? "is-lifted" : ""}`} ref={controlsRef}>
        <div className="shell">
          <div className="bar">
            <button
              className={`mark-bar ${melting ? "is-melting" : ""}`}
              onMouseEnter={thaw}
              onFocus={thaw}
              onClick={() => setBrowsing(true)}
              aria-label="Browse all 74 words"
              data-tip="Browse all 74"
              tabIndex={lifted ? 0 : -1}
            >
              <span className="mark-travel">
                <MarkGlyph />
              </span>
            </button>
            <span className="bar-split" aria-hidden="true" />

            <div className="search">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name it. The Ice Queen knows it."
                aria-label="Search the vocabulary"
                spellCheck="false"
                autoComplete="off"
              />
              {query && (
                <button
                  className="search-clear"
                  onClick={() => {
                    setQuery("");
                    searchRef.current?.focus();
                  }}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="filters" role="group" aria-label="Filter by audience">
              {FILTERS.map((f) => (
                <Ripple
                  key={f.key}
                  className="chip"
                  aria-pressed={filter === f.key}
                  washColor={filter === f.key ? c.accentHover : "rgba(62,98,127,0.10)"}
                  onClick={() => pickFilter(f.key)}
                >
                  {f.label}
                  <span className="n">{counts[f.key]}</span>
                </Ripple>
              ))}
            </div>

            {narrowed && <span className="tally">{tally}</span>}

          </div>
        </div>
      </div>

      <div className="shell">
        <button
          className="index-toggle"
          onClick={() => setIndexOpen((v) => !v)}
          aria-expanded={indexOpen}
        >
          {indexOpen ? "Hide index" : "Show index"}
        </button>
      </div>

      <div className="shell body">
        <nav
          className={`index ${indexOpen ? "" : "is-closed"}`}
          aria-label="All terms"
          ref={indexRef}
        >
          {groups.map((g) => (
            <div className="index-group" key={g.category}>
              <div className="index-head">
                <span className="eyebrow">{g.category}</span>
                <span className="count">{g.entries.length}</span>
              </div>
              {g.entries.map((e) => (
                <Ripple
                  key={e.slug}
                  wide
                  ring={false}
                  className="index-item"
                  data-index-for={e.slug}
                  aria-current={current === e.slug ? "true" : undefined}
                  onClick={() => {
                    goTo(e.slug);
                    if (window.innerWidth <= 980) setIndexOpen(false);
                  }}
                >
                  {e.term}
                </Ripple>
              ))}
            </div>
          ))}
          {groups.length === 0 && (
            <p className="eyebrow" style={{ padding: "10px 0" }}>
              Nothing to index
            </p>
          )}
        </nav>

        <main className="entries" ref={entriesRef}>
          {groups.length === 0 ? (
            <EmptyState
              query={query}
              filter={filter}
              onPick={(slug) => {
                setQuery("");
                setFilter("everything");
                window.setTimeout(() => goTo(slug), 100);
              }}
              onReset={() => {
                setQuery("");
                setFilter("everything");
              }}
            />
          ) : (
            groups.map((g) => (
              <section key={g.category}>
                <div className="cat-marker">
                  <span className="eyebrow">{g.category}</span>
                  <span className="count">{g.entries.length}</span>
                </div>
                {g.entries.map((entry, i) => (
                  <Card
                    key={entry.slug}
                    entry={entry}
                    delay={Math.min(i, 5) * T.stagger}
                    isOpen={open === entry.slug}
                    onToggle={() =>
                      setOpen((v) => {
                        const next = v === entry.slug ? null : entry.slug;
                        if (next) writeHash(entry.slug);
                        return next;
                      })
                    }
                    register={registerEntry}
                    onNavigate={goTo}
                  />
                ))}
              </section>
            ))
          )}
        </main>
      </div>

      <footer className="shell foot">
        <span>The Permafrost · {VOCABULARY.length} terms</span>
        <span>Press / to search · Esc to close</span>
      </footer>
    </div>
  );
}

/* ============================================================
   Card
   ============================================================ */

function Card({ entry, delay, isOpen, onToggle, register, onNavigate }) {
  const ref = useRef(null);
  const inView = useInView(ref);
  const [copyState, setCopyState] = useState("idle");

  useEffect(() => {
    register(entry.slug, ref.current);
    return () => register(entry.slug, null);
  }, [entry.slug, register]);

  const copyLink = () => {
    const url = permalinkFor(entry.slug);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => {
          setCopyState("done");
          window.setTimeout(() => setCopyState("idle"), 1800);
        },
        () => setCopyState("failed")
      );
    } else {
      setCopyState("failed");
    }
  };

  return (
    <article
      className={`card reveal ${inView ? "is-in" : ""} ${isOpen ? "is-open" : ""}`}
      ref={ref}
      id={`term-${entry.slug}`}
      data-slug={entry.slug}
      style={{ "--d": `${delay}ms`, "--field": fieldOf(entry) }}
    >
      <div
        className="card-head"
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={isOpen}
        aria-controls={`drawer-${entry.slug}`}
      >
        <span className="card-title">
          <h3>{entry.term}</h3>
          <span className="aud-wrap">
            {/* one tag per team, so a term used by two reads as two */}
            {entry.audience.map((a) => (
              <span className="aud" key={a}>
                {AUDIENCE_LABELS[a] || a}
              </span>
            ))}
          </span>
          <span className="chev" aria-hidden="true">
            <Chevron />
          </span>
        </span>
        <span className="card-short">{entry.short}</span>
      </div>

      <div className="drawer" id={`drawer-${entry.slug}`}>
        <div className="drawer-inner">
          <div className="drawer-pad">
            <span className="chip-label">Why and when</span>
            <p className="long">{entry.long}</p>

            {/* the term's own artwork, lifted from its Frost Lingo slide.
                Served as a file rather than inlined: the site has a
                network, unlike the plugin. */}
            <figure className="illo">
              <img src={illoFor(entry.slug)} alt="" loading="lazy" decoding="async" />
            </figure>

            <blockquote className="quote">
              <p>“{entry.example}”</p>
              <footer>{entry.saidBy}</footer>
            </blockquote>

            {/* A tertiary action, so a tertiary control: text and a
                centre-out underline rather than a bordered button
                competing with the Related terms below it. Sits the same
                24px below the example that the example keeps from the
                definition above it. */}
            <button className="tlink copy-link" onClick={copyLink}>
              <LinkIcon />
              {copyState === "done"
                ? "Link copied"
                : copyState === "failed"
                  ? "Copy failed"
                  : "Copy link"}
            </button>

            <div className="actions">
              {/* The button lives on the label line, not beside the
                  chips. Sharing a band with a variable-length chip
                  block leaves ragged space at every count - here the
                  row is always one line with room to its right, and
                  the chips wrap underneath without ever meeting it. */}
              {entry.related.length > 0 && (
                <p className="eyebrow nearby-label">Related</p>
              )}
              {entry.related.length > 0 && (
                <div className="nearby-row">
                  {entry.related.map((slug) => {
                    const target = BY_SLUG.get(slug);
                    if (!target) return null;
                    return (
                      <button
                        key={slug}
                        className="btn"
                        onClick={() => onNavigate(slug)}
                      >
                        {target.term}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ============================================================
   Empty state
   ============================================================ */

function EmptyState({ query, filter, onPick, onReset }) {
  const suggestions = useMemo(() => {
    const needle = query.toLowerCase().trim();
    if (!needle) return [];
    return VOCABULARY.map((e) => {
      const hay = [e.term, ...e.aka].map((s) => s.toLowerCase());
      let best = 0;
      for (const h of hay) {
        let overlap = 0;
        for (let i = 0; i < Math.min(h.length, needle.length); i++) {
          if (h[i] === needle[i]) overlap++;
          else break;
        }
        best = Math.max(best, overlap);
      }
      return { entry: e, score: best };
    })
      .filter((s) => s.score > 1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((s) => s.entry);
  }, [query]);

  const filterName = FILTERS.find((f) => f.key === filter)?.label ?? "All";

  return (
    <div className="empty">
      <p className="eyebrow">No match</p>
      <h2>Nothing here answers to “{query.trim() || filterName}”.</h2>
      <p>
        {filter !== "everything"
          ? `You're also on the ${filterName} tab. Widen that first — the term may be filed for another group.`
          : "It may not be written down yet. Terms get added to vocabulary.js as the studio names them."}
      </p>
      <div className="empty-actions">
        {suggestions.map((e) => (
          <button key={e.slug} className="btn" onClick={() => onPick(e.slug)}>
            {e.term}
          </button>
        ))}
        <button className="btn btn-quiet" onClick={onReset}>
          Show all terms
        </button>
      </div>
    </div>
  );
}
