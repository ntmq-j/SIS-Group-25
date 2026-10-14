# Recess Design System

This document records the approved visual direction for Recess and the rules for extending it. Use it as the source of truth when creating or updating product screens. The landing page at `/` is the visual reference; the old `/prototype.html` review URL redirects there. Production screens should use the same identity while keeping their existing product behavior.

## Product and visual direction

Recess helps verified campus and workplace communities find small, low-pressure ways to connect. The interface should feel welcoming, clear, and grounded in real places. Lead with nearby people and activities, explain where and when a plan happens, and keep privacy cues easy to understand.

The approved visual direction is warm, map-forward, and editorial: a real interactive campus map, clear category markers, a restrained wordmark, confident headings, and generous breathing room. Avoid decorative stick-person scenes, generic dashboard decoration, or visual treatments that make Recess feel like a booking or enterprise analytics product.

## Brand tokens

| Token | Value | Use |
| --- | --- | --- |
| Orange | `#EA580C` | Primary brand accent, primary actions, and activity markers |
| Deep orange | `#C2410C` | Hover states and small orange text when stronger contrast is needed |
| Teal | `#0D9488` | Supporting trust, information, and verification cues |
| Yellow | `#EAB308` | Occasional highlight or category detail |
| Ink | `#191A18` | Headings and primary text |
| Muted | `#686A64` | Secondary text and metadata |
| Paper | `#F8F7F3` | Main page canvas |
| Surface | `#FFFFFF` | Cards, forms, menus, and map frames |
| Line | `rgba(25, 26, 24, 0.13)` | Fine borders and separators |

Use the shared CSS variables and Tailwind color tokens in `src/index.css`. The standalone landing preview has its own stylesheet in `src/landing-prototype.css`; keep its matching `--prototype-*` values aligned with the shared tokens. Use the warm neutral and slate scales already defined there instead of introducing another gray palette. Keep semantic success, warning, and error colors distinct from brand colors.

## Logo and typography

- Use the shared `BrandMark` component from `src/components/BrandMark.jsx` wherever the Recess logo appears.
- The wordmark is lowercase `recess`, set in a heavy sans-serif with tight tracking. Its orange dot has a small offset ink shadow. Do not substitute the former boxed `R` mark or create page-specific logo variants.
- Use the Inter/system sans-serif stack for interface text. It must remain readable when Inter is unavailable.
- Use bold, tightly tracked sans-serif headings. The landing hero may use the existing Georgia italic treatment for its orange accent phrase; keep serif text exceptional and brief.
- Keep interface copy direct, friendly, and low-pressure. Prefer concrete prompts such as “Find your people” and “See what is nearby.”
- Landing actions must lead to real product flows: “Sign in” opens the sign-in form, while “Join Recess” and “Find your people” open verified sign-up. Do not leave placeholder toast messages in reviewed landing actions.

## Layout and components

- Use paper for the page background, white for content surfaces, ink for primary text, and muted ink for metadata.
- Keep borders thin and warm. Use soft shadows sparingly to separate map and card surfaces without making the page feel heavy.
- Reuse existing button, chip, card, category, and map components before creating a new visual pattern. Primary actions use the brand orange; secondary actions should stay quiet and clearly subordinate. Keep navigation compact, use icons to aid scanning, and reserve strong fills for the primary action.
- Keep category labels and icons consistent between filters, event cards, event details, and map markers. Prefer the existing category definitions and map icon utilities over one-off colors or emoji treatments.
- The campus map is a core discovery surface. Use the existing Leaflet/OpenStreetMap implementation and activity markers. Preserve the privacy model: availability is shown at area level, and meetups use public places.
- Do not add sample events or presence data to signed-in production views. Sample content belongs only in the standalone landing review experience.

## Responsive behavior

- Build mobile-first and prevent horizontal scrolling at 320px and wider.
- At tablet widths, stack hero copy and the map rather than compressing the map into a narrow column.
- At phone widths, simplify navigation while preserving the primary action, make map controls usable by touch, and keep category labels legible.
- Keep cards, forms, and dialogs within the viewport. Allow long content and category chips to wrap or scroll within their own region.
- Check the approved landing page and at least one app screen at a narrow phone width (390px) and desktop width before considering a visual change complete.

## Accessibility and motion

- Use semantic headings, buttons, links, labels, and accessible names for icon-only controls.
- Preserve visible keyboard focus and make controls operable without a pointer.
- Do not use color as the only way to communicate activity type, status, or privacy information.
- Check text contrast, especially small orange text and white text on orange fills. Use deep orange or ink when the primary orange does not provide enough contrast.
- Keep motion subtle and optional. Respect `prefers-reduced-motion`; do not rely on animation to explain a feature.

## Keeping the system consistent

Before adding a new UI pattern, check this document and the shared brand component and tokens. Avoid hard-coded brand hex values in page components. If a brand token or visual rule intentionally changes, update this document and both stylesheet token sets so the app and standalone landing preview remain aligned. For UI changes, run `npm run lint` and `npm run build`, then review the affected screen at desktop and mobile sizes.
