# NODE Site - Claude Instructions

## Project Overview

Next.js 14 app at `localhost:3000`. Wraps the **Keynote Framer template** (from `keynote.framer.website`) and rebrands it for **NODE - Northern Ontario Dev Exchange**. The Framer React bundle loads from `framerusercontent.com` CDN; we never touch Framer source directly. All branding overrides happen via three mechanisms:

1. `NodeTextOverride.tsx` - client-side TreeWalker + MutationObserver text replacement
2. `globals.css` - CSS `!important` overrides and `content: url()` image swaps
3. `public/content_chunk.mjs` - direct patch of the Framer static bundle

## CRITICAL: SWC Apostrophe Bug

**NEVER use the Write tool or Edit tool on `NodeTextOverride.tsx`.**

The Write tool converts ASCII apostrophes (`'`) to curly apostrophes (`’`), which breaks SWC compilation with a cryptic parse error. Always write this file via Python:

```bash
python3 - << 'PYEOF'
content = open('src/components/NodeTextOverride.tsx').read()
# make your change to `content` string
open('src/components/NodeTextOverride.tsx', 'w', encoding='utf-8').write(content)
PYEOF
```

Or use Bash with a heredoc + `printf` (no `echo`). Never use the Write/Edit tools for this file.

## Key Files

| File | Purpose |
|------|---------|
| `src/components/NodeTextOverride.tsx` | All text replacements, QR inject, footer fill |
| `src/app/globals.css` | CSS overrides (image swap, hide Framer badges, NODE logo) |
| `src/app/layout.tsx` | Modulepreload for content_chunk.mjs with cache-bust version |
| `public/content_chunk.mjs` | Framer bundle - patched for OFFSCREEN and STUDIO DRAADLOOS strings |
| `public/node-logo.svg` | NODE SVG logo (replaces hero person photo) |
| `public/nodesudbury-qr.svg` | QR code pointing to nodesudbury.com |
| `public/script_main.mjs` | Framer entry point - contains `import('/content_chunk.mjs?v=4')` |

## NodeTextOverride.tsx Architecture

- **`REPLACEMENTS`** array: `[from, to]` pairs run via TreeWalker on all text nodes
- **`CHAR_ANIM_MAPS`** array: char-by-char animated text (Framer splits each char into its own span). Replacements MUST be same character count as original
- **`fixCharAnimatedText()`**: matches combined span text and swaps char-by-char
- **`fixExactTextNodes()`**: exact-match node replacements (e.g. bare `"design"` -> `"tech"`)
- **`replaceQRCode()`**: clears the Framer QR SVG symbol, injects `<img src="/nodesudbury-qr.svg">` into `.framer-1a1p7qu` (ticket stub)
- **`fillFooter()`**: injects 3-column info div into `.framer-1ilwqi8` (footer Column 1)
- **`applyOverrides()`**: runs all of the above; called on mount and on every MutationObserver tick for 30s

## QR Code Positioning

The ticket stub (`.framer-1a1p7qu`) has a 3D `matrix3d` parent transform. Local CSS coordinates (offsetTop) are used for positioning, NOT viewport coordinates (getBoundingClientRect).

- Stub height: 443px
- SEAT "24" text ends at local y ~379px
- QR injection: `top:393px; width:40px; height:40px` (14px gap below "24")

## Footer Structure

- Footer outer row: `.framer-b8450f`
- Footer Column 1: `.framer-1ilwqi8` (1162px wide, mostly empty except logo)
- "NODE" logo replacement: `[data-framer-name="Keynote"]` via CSS `::after { content: 'NODE' }`
- Footer fill div injected as child of `.framer-1ilwqi8` with class `node-footer-fill`

## content_chunk.mjs Cache Busting

When patching `public/content_chunk.mjs`, bump the version query string in TWO places:
1. `public/script_main.mjs`: `import('/content_chunk.mjs?v=N')`
2. `src/app/layout.tsx`: `<link rel="modulepreload" href="/content_chunk.mjs?v=N" />`

Current version: `?v=4`

## Framer Scroll Behaviour

- `window.scrollTo()` is intercepted by Framer - has no effect
- `document.documentElement.scrollTop = value` also blocked
- `Element.scrollIntoView()` blocked
- Only mouse wheel events work (225px per scroll tick)
- Page is ~18000px tall; footer absolute Y ~17847
- Between sections: Framer renders a black void (scroll-driven animation transitions)
- Screenshot tools can fail to capture GPU-composited Framer content at deep scroll positions - use DOM inspection to verify instead

## Dev Server

```bash
cd /Users/hannanmax/Downloads/Wastewise/website-downloader/keynote_nextjs
npm run dev
# Server at localhost:3000
```

## CSS Overrides (globals.css) Key Rules

```css
/* Replace hero person photo with NODE logo */
[data-framer-name="Man"] img[alt="Header image"] { content: url('/node-logo.svg') !important; }

/* Hide Framer QR (replaced by JS injection) */
.framer-g66ize { display: none !important; }

/* Hide Framer promo links */
a[href*="polar.sh"], a[href*="holygrid.studio"], .framer-zhlkhb { display: none !important; }

/* Replace footer "KEYNOTE" SVG with "NODE" text */
[data-framer-name="Keynote"] * { display: none !important; }
[data-framer-name="Keynote"]::after { content: 'NODE'; ... }

/* Force Framer appear animations visible */
[data-framer-appear-id] { opacity: 1 !important; animation: none !important; }
```

## Writing Rules (inherited from parent CLAUDE.md)

- NEVER use em-dashes (---) in any output. Use a regular hyphen or rewrite.
- NEVER include Claude session links in commit messages.
- NEVER push to `https://github.com/NODE-Sudbury/NODE-Sudbury.github.io` unless the user explicitly says "push" in that specific message.
