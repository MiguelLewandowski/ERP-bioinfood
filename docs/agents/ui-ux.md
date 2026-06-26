# Specialist: UI/UX

## Principles
- Clarity first — user never wonders what to do next
- Consistency — same pattern for same action everywhere
- Feedback always — loading, success, error for every action
- Mobile-first even for internal systems

## Rules
- shadcn/ui as base — never reinvent UI primitives
- Spacing: Tailwind scale only (4, 8, 12, 16, 24, 32, 48) — no arbitrary values
- One h1 per page, h2 for sections
- Interactive elements: hover, focus, disabled states always
- Forms: inline validation, not only on submit
- Empty states: message + call to action
- Destructive actions: always confirm
- Lists/tables: skeleton loader, not spinner

## Colors
- Use shadcn tokens: primary, secondary, muted, destructive
- Never hardcode hex — always Tailwind or shadcn tokens

## Navigation
- Current page highlighted in nav
- Breadcrumbs for pages deeper than 2 levels
- Back button on detail pages