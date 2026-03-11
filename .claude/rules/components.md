---
paths:
  - "components/**/*.tsx"
  - "components/**/*.ts"
---

# Component Rules

@COMPONENTS.md

## Structure

- `"use client"` directive required for any component using hooks, state, or interactivity (first line, before imports)
- Server components by default (no directive needed)
- Import order: React/Next hooks, then Next.js utilities, then `cn` from `@/lib/utils`, then Lucide icons, then auth/hooks, then components, then local types
- Props: explicitly defined TypeScript interfaces above component function
- Exports: named exports (`export function ComponentName`), not default exports
- File naming: kebab-case (`aircraft-detail-modal.tsx`)
- Helper functions defined inside component file, above the component

## Design System

- **Dark theme default** with navy palette (navy-950 #000000 through navy-100 #e0e0e0)
- Signal colors: signal-1 through signal-5 (muted palette)
- Accents: accent-cyan (#06b6d4), accent-amber (#f59e0b), accent-emerald (#10b981), accent-rose (#f43f5e)
- **No emojis in UI**
- Fonts: IBM Plex Mono (mono) + IBM Plex Sans (sans)

## Typography Patterns

- **Section labels**: `text-[10px] font-mono uppercase tracking-wider text-navy-400`
- **Status badges**: `text-[9px] font-mono uppercase tracking-wider`
- **Metric values**: `text-[10px] font-mono` or `font-mono text-[11px]`
- **Titles/headers**: `text-lg font-bold uppercase tracking-widest` or `text-[11px] font-semibold tracking-[0.12em]`
- **Body text**: `text-xs` or `text-sm` with navy palette colors

## Styling Patterns

- Use `cn()` from `@/lib/utils` for conditional classes (never inline ternaries in className)
- Borders: transparent navy with opacity (`border-navy-700/40`, `border-navy-600/50`)
- Layout: flexbox primary (`flex flex-col items-center justify-between`), grid for dashboards
- Responsive: `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3`
- Tailwind utilities only, no inline styles or custom CSS classes

## State & Data Patterns

- State: `useState` for primitives, `useRef` for DOM refs/mutable values/intervals
- Data fetching: direct `fetch()` calls in `useEffect` or `useCallback` (no SWR/React Query)
- Polling: `useRef` for interval, clear on unmount
- Event cleanup: all `useEffect` event listeners properly removed in cleanup
- Memoization: `useCallback` for event handlers passed as props
- Icons: Lucide React (named imports)
- Modals: Radix Dialog with proper overlay/content structure

## Layout

- Sidebar: fixed w-48 left, hidden on `/`, `/landing`, `/research/*`, `/register`, `/login`
- Platform pages: wrap content in `PageContainer` (adds ml-48 + title)
- Public pages: use `PublicNav` + `PublicFooter` layout components

## Existing Primitives (check before creating new ones)

- `components/ui/` - Button, Card, Badge, Input, Select, Dialog, etc. (Radix-based)
- `components/layout/sidebar.tsx` - Main navigation
- `components/layout/page-container.tsx` - Standard page wrapper

## Anti-patterns

- No creating components that duplicate existing ui/ primitives
- No native browser dialogs (alert, confirm, prompt)
- No inline styles for layout
- No external state libraries (Pinia, Redux, Zustand)
- No Options API patterns (this is React, not Vue)
