# Callegari Solutions website redesign: handover notes

These notes cover the decisions a future editor cannot infer from the markup alone: where each
image came from and what was done to it, how the contact form works today and how to move it to
a hosted endpoint, where an analytics tag belongs, which image files ship unreferenced and why,
and the three places where the playbook contradicts itself along with how each was resolved.

No placeholders remain in the markup. One supplied image was rejected as AI generated, see
section 1d, and the homepage hero is still generic stock worth replacing, see section 1c.

Deployable web root: `public/`. GitLab Pages publishes that directory as the site root, so
every file inside it is fetchable at `https://callegarisolutions.com/<path>` whether or not a
page links to it. Anything that should not be public must not live under `public/`.

## 1. Image status

All filenames follow `<subject-or-use>-<width>.<ext>` so the purpose is readable from the
filename alone.

### 1a. Portrait of Dr. Jay Callegari: DONE

Live on both pages that call for it. The monogram placeholder is gone from the markup.

| Location | Markup |
|---|---|
| `public/index.html` | `<picture>` in `.portrait-frame`, section 7 credibility block |
| `public/about.html` | `<picture>` in `.portrait-frame`, "Why this matters to clients" |

| File | Dimensions | Size |
|---|---|---|
| `dr-jay-callegari-portrait-820.webp` / `.jpg` | 820x1025 | 61 / 109 KB |
| `dr-jay-callegari-portrait-480.webp` / `.jpg` | 480x600 | 21 / 39 KB |
| `dr-jay-callegari-portrait-360.webp` / `.jpg` | 360x450 | 11 / 22 KB |

Served through `<picture>` with a WebP source, JPEG fallback, and `srcset` at three widths.
The 820 tier covers 2x displays. Also referenced as `image` in the `Person` JSON-LD on About.

**What was done to the photograph, stated plainly.**

The client supplied a 600x600 original, then an upscaled 1024x1024 version. The 1024 version is
the source for the shipped assets. Two things are worth recording:

1. *The upscale is faithful.* It was checked rather than assumed. Comparing the two at matched
   resolution, low frequency content, which is where facial geometry lives, differs by a mean of
   1.7 out of 255, and the difference inside the face is smaller than the difference in the blank
   backdrop. The added energy sits entirely in the high frequency band. In plain terms: the
   upscaler added texture, it did not change his face. Framing is byte-identical between the two.
   The texture it added is nonetheless synthesised rather than photographed.
2. *The backdrop was extended.* The original framing left only 28px of headroom, which reads as
   cramped in a 4:5 frame. The flat studio backdrop was continued upward by 75 rows following its
   measured luminance gradient with matched grain, and the same amount was trimmed from the bottom
   of the jacket. The face, body and clothing are untouched. Extending a seamless backdrop is
   routine retouching and is not what the brief means when it rules out AI generated portraits,
   which is about synthesising a likeness.

A true photographic original at 1500px or larger would still be preferable to an upscale. If one
turns up, regenerate at the same 4:5 crop and keep the filenames; no markup change is needed.

### 1b. Louisiana project photograph: DONE

Live in the 16:9 figure on the expansion page. The placeholder panel is gone.

| File | Dimensions | Size |
|---|---|---|
| `louisiana-river-industrial-corridor-1920.webp` / `.jpg` | 1920x1080 | 225 / 341 KB |
| `louisiana-river-industrial-corridor-1180.webp` / `.jpg` | 1180x664 | 117 / 160 KB |
| `louisiana-river-industrial-corridor-760.webp` / `.jpg` | 760x428 | 57 / 74 KB |

An aerial of a river industrial corridor: petrochemical plant and tank farm alongside a rail
yard, tankers and towboats at dock, river bridge in the distance. It carries the exact argument
the page makes, that Louisiana projects sit where industry, transportation, government and the
workforce meet.

Checked for authenticity before publishing, at high magnification across the tanker
superstructure, refinery columns, tank farm, rail yard and bridge trusses. Structures are
physically coherent, perspective is consistent, and repeating elements vary naturally. No
generation artefacts were found. Note that this establishes the absence of obvious artefacts,
not provenance: **confirm the licence before launch** if it came from a stock library.

### 1c. Homepage hero: STILL GENERIC, worth replacing

Not a placeholder, so nothing looks broken, but it is the weakest visual on the site and it is
the first thing every visitor sees.

`home-hero-720.*` and `home-hero-480.*` are a stock photograph of anonymous glass office towers
inherited from the old site. No people and no identifiable location, so it breaks no rule, but it
says nothing about Louisiana or about this firm.

Wanted: an authentic Louisiana industrial, infrastructure, development or project-execution
photograph, 4:5 or wider, at least 1200x1500. Drop it in and the crop, WebP conversion, `srcset`
and alt text follow the same pattern as the two above.

### 1d. Rejected: swamp pipeline construction image

A vertical image of pipeline construction in a cypress swamp was supplied for the hero slot and
**was not used.** It is AI generated, not a photograph. The evidence is specific and visible at
2x magnification:

* The foreground excavator's boom-to-bucket linkage is malformed; the hydraulic components do not
  connect in any physically possible arrangement.
* The lattice crane boom has irregular, non-repeating cell geometry. Real lattice booms are
  perfectly regular. A second boom behind it terminates in nothing.
* The mid-distance workers have smeared faces, merged hard hats and indistinct hands, and in
  places two workers' legs fuse together.
* The laid pipe changes diameter along its run.

Publishing it would violate the brief twice over: section 3 rules out generic AI imagery, and
section 10 asks for real professional photography. On a professional services site selling
judgement about real projects, a fabricated photograph of a project is a material
misrepresentation rather than a style problem. The file is not in the repository.

## 2. Contact form: how it works and how to switch endpoints

GitLab Pages is a purely static host with no server side form processing, and the brief ruled
out buying a form platform or embedding a third party form. The form therefore ships in
mailto mode.

The form element lives in `public/contact.html`:

```html
<form class="form" id="intake-form" data-endpoint="" action="mailto:jay@callegarisolutions.com" method="post" enctype="text/plain" novalidate>
```

`public/script.js` reads the `data-endpoint` attribute on submit and branches:

* **`data-endpoint` empty (the shipped default).** The script validates the fields, then
  composes a `mailto:jay@callegarisolutions.com` link with the subject
  `Project inquiry: <selected topic>` and a body containing every field, and navigates to it.
  The `.form-status` region then explains that the visitor's email application is opening and
  repeats the direct email address and phone number as a fallback, because mailto fails
  silently for anyone browsing without a configured mail client. The plain `action` and
  `method` attributes on the form are a no JavaScript backstop only.
* **`data-endpoint` set to a URL.** The script POSTs a `FormData` payload to that URL with
  `Accept: application/json` and reports success or failure in `.form-status`. No page
  navigation, no mail client involved.

**Switching to a hosted endpoint is a one attribute change.** Sign up for a free static form
service, then set the attribute:

```html
<form class="form" id="intake-form" data-endpoint="https://your-endpoint.example/f/abc123" ...>
```

No other markup or script change is required. Keep the `action` and `method` attributes as the
no JavaScript fallback. After switching, submit one test inquiry and confirm it arrives.

Email address and phone number stay visible and clickable in the left column of the contact
page regardless of which mode the form is in. That is deliberate: it is the path that always
works.

## 3. Analytics

**No analytics or tracking snippet ships with this site today.** No measurement account exists
yet, and shipping an unconfigured tracker would send traffic to nowhere while still adding a
third party request and a cookie disclosure obligation.

Each of the five pages carries a single labelled placeholder comment immediately before the
closing `</head>` tag:

```html
<!-- ANALYTICS PLACEHOLDER
     No analytics tag ships with this site because no measurement account
     exists yet. When a Google Analytics 4 property is created, paste the
     two GA4 tag lines here, on every page, and nowhere else.
     See REDESIGN-NOTES.md. Do not paste an unconfigured tracker. -->
```

To enable analytics later:

1. Create a Google Analytics 4 property and copy the two line gtag.js snippet.
2. Paste it at the placeholder comment in all five pages: `index.html`, `about.html`,
   `services.html`, `louisiana-economic-development-consulting.html`, `contact.html`.
   Do not paste it anywhere else, and do not add a second analytics product alongside it.
3. The brief asks for click tracking on email, phone, LinkedIn, the Discuss Your Project CTA,
   and the Louisiana Expansion CTA. In GA4 these are configurable as events in the property
   interface without further code changes, so prefer that over hand written event handlers.

## 4. Google Search Console

This step is not recorded anywhere else in the repository, so it lives here. It cannot be
completed from the codebase alone; it needs access to the live domain and a Google account.

After the redesign goes live:

1. Add `callegarisolutions.com` as a property in Google Search Console and complete domain
   verification, normally by adding the DNS TXT record Search Console supplies to the domain's
   DNS settings.
2. Submit the sitemap: `https://callegarisolutions.com/sitemap.xml`.
3. Use the URL Inspection tool on
   `https://callegarisolutions.com/louisiana-economic-development-consulting.html` and confirm
   it reports as indexable. This page is new in the redesign and is the primary organic search
   target, so verify it specifically rather than assuming the sitemap covered it.
4. Check the Coverage and Page Indexing reports about a week after launch for anything
   excluded unexpectedly.

`public/robots.txt` allows all crawlers on all paths and points to the sitemap. It blocks
nothing, which is intended. `public/sitemap.xml` lists all five pages, with the homepage as
the bare domain `https://callegarisolutions.com/` to match its canonical tag. If a page is
ever added, renamed, or removed, update `sitemap.xml` in the same commit and resubmit.

## 5. Unreferenced files in the published directory

`public/images/` still holds stock imagery inherited from the old site. Because Pages publishes
the whole directory, unreferenced files still resolve at their URLs and still count against the
deployed size. None of them are referenced by any page, and none were deleted: keeping them
makes the branding decisions cheap to reverse.

| File | Status | Note |
|---|---|---|
| `CSE-logo.png` | unreferenced, kept | The retired mark. The header is now a typographic wordmark because the playbook forbids CSE as the primary header brand. Kept so that decision is one edit to undo. |
| `ai-solutions-bg.png` | unreferenced, kept | Generic AI imagery, ruled out by the visual guardrails. |
| `about-collaboration.jpg` | unreferenced, kept | Anonymous people at laptops, ruled out by the same guardrails. |
| `services-hero.jpg` | unreferenced, kept | An identifiable New York City street. Wrong region for a Louisiana firm. |
| `about-hero.jpg` | unreferenced, kept | Empty office corridor, no people. Discouraged rather than prohibited. |
| `home-hero.jpg` | unreferenced, kept | Superseded by the pre-cropped variants below. |

Deleting the six of them would save roughly 2 MB per deploy. That is a decision for the client,
not the build, so nothing was removed.

Files actually in use:

* `home-hero-720.webp` / `.jpg` and `home-hero-480.webp` / `.jpg`: the homepage hero, navy
  graded in CSS, served through `<picture>` with `srcset`. Pre-cropped to the 4:5 frame they
  render in, which is why the original `home-hero.jpg` is no longer referenced: it was a 3:2
  image losing 47 percent of its width to `object-fit: cover`. Largest variant is 124 KB
  against the playbook's 250 to 350 KB hero budget.
* `dr-jay-callegari-portrait-*`: the portrait, see section 1a.
* `louisiana-river-industrial-corridor-*`: the expansion page figure, see section 1b.
* `og-cover.png`: the 1200x630 social sharing card, referenced by the Open Graph and Twitter
  card tags on all five pages.

## 6. Image provenance

Recorded because a build pass correctly refused to publish the portrait without it, and because
one supplied image turned out to be AI generated. Every image on the site should have a
traceable answer to "where did this come from".

All of these were supplied by the client directly in the working session on 10 September 2026.
None were downloaded from LinkedIn, a search engine, or any other source by the build.

| Image | Supplied as | Verified | Status |
|---|---|---|---|
| Portrait of Dr. Callegari | 600x600, then a 1024x1024 upscale, confirmed by the client as "a portrait of Jay Callegari" | Upscale checked against the original: facial geometry unchanged, added detail is texture only | live |
| Louisiana river industrial corridor | 2000x1116 | Inspected at high magnification, no generation artefacts | live |
| Swamp pipeline construction | 928x1152 | Inspected at high magnification, multiple generation artefacts | **rejected, see 1d** |
| `home-hero.jpg`, `about-hero.jpg`, `services-hero.jpg`, `about-collaboration.jpg`, `ai-solutions-bg.png` | inherited from the previous site | not verified | see section 5 |

Two things still worth chasing:

1. **Licensing.** Provenance in this repository means "the client handed it over", not "the
   client owns it". Before launch, confirm the Louisiana aerial is licensed for commercial use
   if it came from a stock library.
2. **A true photographic original of the portrait.** The shipped assets derive from an upscale.
   It is faithful, but a real 1500px-plus export would be better. See section 1a.

## 7. Conventions worth preserving

* All styling lives in `public/style.css`. No `<style>` blocks in pages and no inline `style`
  attributes on content. The one permitted exception is a custom property passthrough such as
  `style="--i:2"`.
* All behaviour lives in `public/script.js`.
* Internal links keep the `.html` extension, matching the existing hosting setup.
* No long dashes anywhere in the copy. Use commas, colons, periods, or a plain hyphen.
* The public brand is Callegari Solutions. The legal entity, Callegari & Son Enterprises, LLC,
  appears only in the footer legal line and in the structured data `legalName` field.
* Exactly one `<h1>` per page, headings descend without skipping levels, and every `<img>`
  carries `width`, `height`, and real alt text.

## 8. Where the playbook contradicts itself, and what was built

Three places where two instructions in the playbook cannot both be satisfied. Each was resolved
deliberately and is flagged here so the call can be overridden.

### 8a. Hero H1 size against the hero column width

Section 3 specifies `H1 desktop: clamp(46px, 5vw, 72px)`. Section 5 specifies a two column hero
with the copy at "approximately 58%" and the image at "approximately 42%", and a three line
headline whose longest line is `MOVING PROJECTS FORWARD.` at 24 characters.

Those cannot coexist. Measured in the browser at a 1440px viewport, with the 1180px container
and a 58 percent copy column, the copy column is 647px wide. That line sets at:

| Font size | Line width | Fits 647px? |
|---|---|---|
| 42.4px (shipped) | 628px | yes, 97 percent of the column |
| 46px (playbook floor) | 681px | no, overflows by 34px |
| 72px (playbook ceiling) | 1066px | no, overflows by 419px |

Reaching even the 46px floor requires widening the copy column to about 61 percent, which
breaks the 58/42 split, and it lands flush against the edge with no tolerance for a font
fallback. The shipped build holds the 58/42 split and the three line structure, and sets the
type to the largest size the column allows. The result reads as restrained editorial typography,
which is what section 3 asks for elsewhere ("restrained and authoritative rather than flashy").

To prioritise the type size instead, widen `.hero__grid` toward 63/37 in `public/style.css` and
raise the `clamp()` on `.hero h1`. Do not raise the size without widening the column, or the
brand statement will wrap to four lines.

### 8b. Body text floor against the specified label sizes

Section 15 says no text below 16px for normal body copy. Section 3 and the component spec then
call for eyebrow labels at 12.5px, proof strip items at 13px, form hints at 13px and captions at
14px. These were read as fine print and labels rather than body copy, which is the standard
reading of the WCAG guidance the rule comes from. All actual paragraph and list body copy is
16px or larger at every breakpoint. The footer legal line is 13px.

### 8c. Google Search Console and analytics

Section 21 lists both as quality gates, and neither can be satisfied from a repository: both
require the client's own Google account. Everything the repo can contribute is in place. See
sections 3 and 4.

## 9. Known deviations from the component spec

* Brass `#B68B43` fails WCAG AA for text on light backgrounds at 3.1:1. Brass text on white or
  ivory uses `--accent-dark` `#8D6A31` instead, at 4.95:1. Brass is still used at full strength
  for rules, borders, and small labels on navy, where it measures 5.09:1.
* `--muted` `#667386` measures 4.42:1 on ivory, marginally under AA. Muted body copy uses
  `--muted-strong` `#5B6879` instead.
* Form control borders use `--line-strong` `#7C8794` rather than the decorative `--line`
  hairline, to meet the 3:1 non-text contrast requirement for interactive controls.
* The oversized section numerals are decorative, carry `aria-hidden="true"`, and deliberately
  sit below 3:1. The adjacent heading carries the meaning.
