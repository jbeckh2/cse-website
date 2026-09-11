# tools

Development helpers. Nothing here is published, and the site itself still has
no build step: everything in `public/` is served exactly as it is committed.

## build-preview.mjs

Packages the whole site into one self-contained `.html` file that can be
emailed to someone for review. They open it from their desktop, click through
every page, and see the real thing, with no server, no hosting, no link, and
no internet connection needed.

```sh
node tools/build-preview.mjs
```

That reads `public/` and writes `dist/callegari-solutions-preview.html`. Node
18 or newer, no packages to install.

### What ends up in the file

- every page in `public/*.html`, stored in an inert `<template>`
- `style.css` and `script.js`, inlined as they are
- images, inlined as `data:` URIs, one variant per responsive set
- Inter and Manrope, inlined as `data:` URIs, so the typography is right
  offline and does not depend on Google Fonts
- a small router that swaps pages when a site link is clicked and then runs
  `script.js` against the new markup, the same work a page load would do

Because the site's own script runs unchanged, the preview keeps the mobile
menu, the sticky header, the reveal-on-scroll, the services scroll spy, and
the contact form validation. Back and Forward work. Deep links such as
`services.html#funding` land on the same section at the same offset.

### What is deliberately not in it

- **Search engine metadata.** Titles are kept, but the per-page description,
  canonical, Open Graph and schema.org blocks are not, because none of it can
  be reviewed from a file. Check that on the staging or live site.
- **Contact form delivery.** The form validates and then opens the reviewer's
  own email application, which is what the shipped site does today. Nothing
  is sent anywhere from the preview.
- **One image variant per picture.** The widest variant under
  `--max-image-width` is used instead of the full responsive set. It is the
  file size that changes, never the layout, which comes from the CSS.
- **Printing.** Only the page on screen prints, not all of them.

Tell the reviewer it needs JavaScript, which every normal browser has on. The
file says so itself if it is turned off.

### Options

| Option | Default | What it does |
| --- | --- | --- |
| `--src <dir>` | `public` | Directory to read the site from |
| `--out <file>` | `dist/<name>-preview.html` | Where to write |
| `--name <slug>` | `callegari-solutions` | Basename for the default output |
| `--label <text>` | `PREVIEW COPY ...` | Corner badge text, `""` removes it |
| `--max-image-width <n>` | `1400` | Widest responsive variant to inline |
| `--no-fonts` | off | Link to Google Fonts instead of inlining them |

### Reviewing a branch

The tool only reads `--src`, so point it at a worktree to package a branch
without switching your own checkout:

```sh
git worktree add ../review redesign/callegari-solutions-playbook
node tools/build-preview.mjs --src ../review/public --out dist/review.html
git worktree remove ../review
```

### Checking a build

Open the file in a browser and click every nav link. Worth confirming: the
page heights match the real pages, the browser console is empty, and the
network tab shows no requests at all. A request leaving the file means
something did not get inlined.
