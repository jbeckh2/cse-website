# Callegari Solutions website redesign: handover notes

These notes cover the decisions a future editor cannot infer from the markup alone: which
placeholder is still waiting on a real client asset, how the contact form works today and how
to move it to a hosted endpoint, where an analytics tag belongs, which image files ship
unreferenced and why, and the three places where the playbook contradicts itself along with how
each was resolved.

Deployable web root: `public/`. GitLab Pages publishes that directory as the site root, so
every file inside it is fetchable at `https://callegarisolutions.com/<path>` whether or not a
page links to it. Anything that should not be public must not live under `public/`.

## 1. Image status

### 1a. Portrait of Dr. Jay Callegari: DONE

The client supplied the portrait during the build. It is live on both pages that call for it,
and the monogram placeholder has been removed from the markup.

| Location | Markup |
|---|---|
| `public/index.html` | `<picture>` inside `.portrait-frame`, section 7 credibility block |
| `public/about.html` | `<picture>` inside `.portrait-frame`, "Why this matters to clients" |

Files in `public/images/`:

| File | Dimensions | Size |
|---|---|---|
| `jay-callegari.webp` | 480x600 | 20.7 KB |
| `jay-callegari.jpg` | 480x600 | 44.6 KB |
| `jay-callegari-360.webp` | 360x450 | 10.1 KB |
| `jay-callegari-360.jpg` | 360x450 | 25.5 KB |

Served through `<picture>` with a WebP source, a JPEG fallback, and `srcset` at two widths.
Also referenced as `image` in the `Person` JSON-LD on the About page.

**What was done to the photograph, stated plainly.** The source was 600x600. Two changes were
made, neither of which touches the subject:

1. The studio backdrop was extended upward by 44 rows, continuing the measured luminance
   gradient of the existing backdrop and matching its grain. The original framing left only
   28px of headroom, which reads as cramped in a 4:5 frame.
2. 44 rows were trimmed from the bottom of the jacket, and the width was cropped to 4:5
   centred on the head.

The face, body and clothing are untouched original pixels. Extending a flat seamless backdrop
is a routine, non-deceptive retouching operation and is not what the brief means when it rules
out AI generated portraits, which is about synthesising a person's likeness. Recorded here so
the edit is on the record rather than discovered later.

**One open item: resolution.** 600px is all the supplied source had, so the largest asset is
480x600 and renders at roughly 1x in its slot. It is correct but will look slightly soft on a
high DPI screen. If the photographer's original exists at 1500px or larger, regenerate from it
with `documentation/` scripts or any image tool, keeping the same 4:5 crop and filenames. No
markup change is needed.

### 1b. Louisiana project photograph: STILL PENDING

Rendered as the editorial panel placeholder: `.figure-wide` wrapping `.figure-placeholder`.

| Location | Comment |
|---|---|
| `public/louisiana-economic-development-consulting.html` | `<!-- SWAP: replace with a real photograph of a Louisiana industrial, infrastructure, manufacturing or development project. See REDESIGN-NOTES.md -->` |

The replacement must actually be Louisiana. Do not substitute a photograph of somewhere else,
and do not use a staged meeting or anonymous people at laptops. The frame is 16:9. Same
`<img>` attribute requirements as the portrait, and delete the `SWAP` comment once done.

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
* `jay-callegari*`: the portrait, see section 1a.
* `og-cover.png`: the 1200x630 social sharing card, referenced by the Open Graph and Twitter
  card tags on all five pages.

## 6. Portrait provenance

Recorded because a build pass correctly refused to publish the portrait without it.

The photograph was supplied by the client directly in the working session on 10 September 2026,
with the confirmation "That is a portrait of Jay Callegari", and the 4:5 crop was confirmed by
the client in the same session. It was not downloaded from LinkedIn or any other source. The
editing performed on it is itemised in section 1a.

The one caveat worth carrying forward is resolution, not authenticity: the supplied file was
600x600, which is smaller than an original studio export would normally be, so a higher
resolution original is still worth requesting. See section 1a.

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
