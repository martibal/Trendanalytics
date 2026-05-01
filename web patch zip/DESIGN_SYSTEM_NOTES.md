# Urd Atlas visual architecture

This patch adds a central visual design layer so future visual changes can be made in one place instead of repeated in every page file.

## Main file

Edit this file first when changing the site-wide visual system:

```txt
src/components/site/UrdDesignSystem.tsx
```

It contains:

- `urd` class tokens
- `UrdDesignRoot`
- `PageShell`
- `PageHero`
- `SectionCard`
- `InfoCard`
- `InlineCode`
- `ActionLink`
- `PlainLink`
- `SimpleTable`

## CSS variables

The shared colors live in:

```txt
src/app/globals.css
```

Look for:

```css
/* Urd Atlas central visual architecture */
```

Change variables such as:

```css
--ua-bg-page
--ua-surface
--ua-surface-soft
--ua-border
--ua-text-primary
--ua-text-secondary
--ua-text-muted
```

## Compatibility shims

These files are intentionally small re-exports so pages can import simple components while all styling remains centralized:

```txt
src/components/site/PageHero.tsx
src/components/site/PageShell.tsx
src/components/site/SectionCard.tsx
src/components/site/InfoCard.tsx
src/components/site/InlineCode.tsx
src/components/site/PageActions.tsx
```

## Refactor pattern for any page

Before:

```tsx
<main className="mx-auto max-w-6xl px-6 py-10">
  <header className="...">...</header>
  <section className="...">...</section>
</main>
```

After:

```tsx
import { PageShell, PageHero, SectionCard } from "@/components/site/UrdDesignSystem";

<PageShell>
  <PageHero eyebrow="..." title="..." summary="..." />
  <div className="grid gap-6">
    <SectionCard title="...">...</SectionCard>
  </div>
</PageShell>
```

## What was changed in this patch

- Added central design system components.
- Added design CSS variables in `globals.css`.
- Wrapped app content in `UrdDesignRoot` from `layout.tsx`.
- Rebuilt `src/app/methodology/_components.tsx` so all methodology subpages inherit the same visual system without editing each page.

