# HTB Machine Writeups — Swad Mustasin Khan

A dark, terminal-styled site for publishing **retired** Hack The Box machine writeups, built with
[Astro](https://astro.build). Active machines are listed as *owned* with their writeups locked until
retirement — keeping the site compliant with HTB's content policy.

---

## ⚠️ The one rule

**Only publish writeups for RETIRED machines.** Publishing solutions for active/seasonal machines
violates Hack The Box's Terms of Service. Every writeup is gated by a `status` field:

| `status`  | What happens on the site                                             |
|-----------|----------------------------------------------------------------------|
| `active`  | Card shows a 🔒 lock; the page shows "writeup locked". Body hidden.   |
| `retired` | Full writeup body + proof image are published.                       |

New machines default to `active`. Flip to `retired` **only after you confirm on HTB** that the
machine is officially retired (not just "expired").

---

## Add a new machine (2 steps)

**1. Create the writeup file** — from the project folder:

```bash
npm run new "Cicada"
# or with options:
npm run new "Cicada" -- --os Windows --difficulty Easy
```

This creates `src/content/machines/cicada.md` (locked by default). Open it and fill in the sections.

**2. Add your proof screenshot** — drop the image in `public/proof/`, named to match:

```
public/proof/cicada.png
```

The frontmatter already points at `/proof/cicada.png`. Redact the flag in the screenshot if you
prefer — the writeup is about the method, not the flag.

**When the machine retires:** change `status: active` → `status: retired` in the file. Done — it
publishes on the next build.

> You can also skip the script and copy `src/content/machines/example-writeup.md` by hand.
> Delete that example file once your first real writeup is live.

---

## Run it locally

```bash
npm install      # first time only
npm run dev      # preview at http://localhost:4321
npm run build    # production build into dist/
```

---

## Deploy (Vercel)

1. Push this folder to a new GitHub repo (e.g. `htb-writeups`).
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import that repo.
3. Vercel auto-detects Astro. Framework preset: **Astro**. Click **Deploy**.
4. Update `site` in `astro.config.mjs` to your live URL, and the profile/portfolio links in
   `src/components/Header.astro` + `src/components/Footer.astro`.

After that, every `git push` redeploys automatically.

---

## Where things live

```
src/content/machines/   ← one .md file per machine (your writeups)
src/content/config.ts   ← the schema + the retired/active policy gate
public/proof/           ← proof screenshots
src/pages/index.astro   ← homepage grid
src/pages/machines/     ← the writeup page template
src/components/         ← header, footer, cards, info box
src/styles/global.css   ← the dark terminal theme
new-machine.mjs         ← the "npm run new" scaffolder
```

To edit the site's identity (name, links, HTB profile URL), search the repo for `TODO(Swad)`.
