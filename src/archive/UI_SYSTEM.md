# NODE Site UI System Reference

Extracted from the Framer/Keynote template. Use these rules when creating any new page to maintain pixel-perfect design consistency.

---

## Color Tokens

| Role | Value | Tailwind class | When to use |
|---|---|---|---|
| Background | `#0a0a0a` | `bg-bg` | Page background — always |
| Surface | `#111111` | `bg-surface` | Cards, panels, elevated elements |
| Border | `#1f1f1f` | `border-border` | All dividers, card outlines |
| Accent | `#f0e6d3` | `text-accent` | CTAs, highlights, active states |
| Text primary | `#f5f5f5` | `text-foreground` | Headings, important body text |
| Text muted | `#6b6b6b` | `text-muted` | Secondary text, labels, metadata |

Never use pure white (`#ffffff`) or pure black (`#000000`). Never deviate from these tokens.

---

## Typography

- **Font:** Inter (loaded globally via `framer.css` — do not re-import)
- **Display / Hero:** `font-black` (900), tight tracking (`tracking-tighter`), `leading-[0.88]` to `leading-tight`
- **Section headings:** `font-black`, `clamp(2rem, 6vw, 4.5rem)`, `tracking-tighter`
- **Body:** `font-normal` or `font-medium`, `text-lg`, `leading-relaxed` (1.6)
- **Labels / eyebrows:** `text-xs`, `uppercase`, `tracking-widest`, `font-semibold`, color `#6b6b6b`
- **Mono / times:** `font-mono`, `tabular-nums` for schedule times and numeric data

---

## Spacing System

- Section vertical padding: `py-24` to `py-32`
- Section horizontal padding: `px-6 md:px-16 lg:px-24`
- Max width container: `max-w-7xl mx-auto`
- Card internal padding: `p-6` to `p-10`
- Gap between cards: `gap-4` to `gap-6`

---

## Component Patterns

### Section wrapper (always use this)
```tsx
<section className="py-32 px-6 md:px-16 lg:px-24 max-w-7xl mx-auto">
```

### Eyebrow label (above every heading)
```tsx
<p className="text-muted text-xs font-semibold tracking-widest uppercase mb-5">
  Section Label
</p>
```

### Display heading
```tsx
<h2 className="text-[clamp(2rem,6vw,4.5rem)] font-black tracking-tighter text-foreground mb-5">
  Heading Text
</h2>
```

### Card
```tsx
<div className="border border-[#1f1f1f] rounded-2xl p-8 bg-[#111111]/30 hover:border-[#f0e6d3]/20 transition-all duration-300">
```

### Primary CTA button (filled)
```tsx
<Link href="#" className="inline-flex items-center gap-2 bg-accent text-[#0a0a0a] font-bold px-8 py-4 rounded-full text-sm hover:bg-accent/90 transition-all hover:scale-105 active:scale-95">
  Join NODE
</Link>
```

### Outline CTA button
```tsx
<Link href="#" className="inline-flex items-center gap-2 border border-accent/40 text-accent px-8 py-4 rounded-full text-sm hover:bg-accent hover:text-[#0a0a0a] transition-all">
  Learn more
</Link>
```

### Divider
```tsx
<div className="border-t border-[#1f1f1f] my-16" />
```

### Scrolling ticker
```tsx
<div className="border-y border-[#1f1f1f] py-2.5 overflow-hidden bg-[#111111]/60">
  <div className="flex whitespace-nowrap" style={{ animation: 'marquee 24s linear infinite' }}>
    {[0,1,2].map(i => <span key={i}>Message 1 · Message 2 · Message 3 ·</span>)}
  </div>
</div>
```

---

## Border Radius Scale

| Size | Value | Use |
|---|---|---|
| sm | `rounded-xl` (12px) | Tags, badges, small chips |
| md | `rounded-2xl` (16px) | Cards, inputs |
| lg | `rounded-3xl` (24px) | Large containers, ticket sections |
| full | `rounded-full` | Buttons, pills |

---

## Animations

All Framer appear-animations are loaded globally via `FramerScripts`. For new custom components, use CSS transitions:

```css
/* Scroll reveal — add .visible class via IntersectionObserver */
.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.reveal.visible { opacity: 1; transform: translateY(0); }

/* Marquee ticker */
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-33.333%); }
}
```

---

## Creating a New Page

### Step 1 — File location
```
src/app/[page-slug]/page.tsx
```

### Step 2 — Minimal page shell
```tsx
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import FramerScripts from '@/components/FramerScripts'

export default function NewPage() {
  return (
    <main className="bg-[#0a0a0a] min-h-screen text-[#f5f5f5]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Navbar />

      {/* YOUR SECTIONS HERE */}

      <Footer />
      <FramerScripts />
    </main>
  )
}
```

### Step 3 — Reusing archived sections
- Open `src/archive/preserved_sections.html`
- Copy the section HTML you want
- Paste into `dangerouslySetInnerHTML={{ __html: ... }}` inside a `<div>`
- Or convert to JSX manually following the patterns above

### Step 4 — Which sections to reuse for common pages

| Page | Reuse from archive |
|---|---|
| Hackathon event | Hero, Schedule/timeline, Speakers grid, Ticket tiers |
| Annual Gala | Hero, Speakers grid, Venue section, Ticket tiers |
| About NODE | Introduction section, Partners section |
| Membership | Ticket tiers section |
| Seminar | Schedule/timeline, Speakers grid |

---

## Breakpoints

| Name | Width |
|---|---|
| Mobile | `< 810px` |
| Tablet | `810px – 1199px` |
| Desktop | `≥ 1200px` |

Tailwind equivalents: `md:` = 810px+, `lg:` = 1200px+

---

## Files Reference

| File | Purpose |
|---|---|
| `src/app/framer.css` | All original Framer CSS — do not edit |
| `src/lib/framerBody.ts` | Full page HTML as string — edit for content changes |
| `src/components/FramerScripts.tsx` | Injects Framer animation scripts — include on every page |
| `src/components/Navbar.tsx` | Sticky navbar — reuse on all pages |
| `src/components/Footer.tsx` | Footer — reuse on all pages |
| `src/components/NodePageTemplate.tsx` | Copy-paste template for new pages |
| `src/archive/preserved_sections.html` | 328 archived Framer sections for reuse |
| `src/archive/CONTENT_STRATEGY.md` | NODE content map section by section |
| `src/archive/IMAGE_STRATEGY.md` | Image replacement guide with search terms |
