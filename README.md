# GradRight Counselor — marketplace prototype

Inter-only HTML/CSS. GradRight is a **counselor marketplace**: counselors get listed &amp; recommended; students browse profiles and pay a connect fee.

## Two sides

| Side | Start |
|------|--------|
| Counselor desktop | `index.html` (OTP → onboard → setup → listing) |
| Student marketplace | `marketplace.html` → `counselor-public.html` |

## Shared shell (navigation)

App pages use one sidebar component:

- `js/shell.js` — single nav + counselor chip (verified status from `data-verified`)
- Each page: `<aside id="app-sidebar">` + `<body data-page="…" data-verified="…">`
- Page keeps only its own topbar title/actions + content

Edit nav once in `js/shell.js` — it updates every screen.

## Marketplace idea

- Student browse: `marketplace.html`  
- Counselor sees the same card under **Profile → Student preview** (not a separate nav item)  
- Only verified counselors appear in browse & recommendations  
