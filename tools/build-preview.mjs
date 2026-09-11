#!/usr/bin/env node
/* =========================================================================
   BUILD PREVIEW
   Packages the whole static site into ONE self-contained .html file that can
   be emailed to a reviewer. No dependencies, no install step, Node 18+.

       node tools/build-preview.mjs
       node tools/build-preview.mjs --src public --out dist/preview.html

   What ends up in the file:
     - every page in public/*.html, each stored in an inert <template>
     - style.css and script.js inlined as they are written
     - images inlined as data: URIs, one variant per responsive set
     - the web fonts inlined as data: URIs, so the file also works offline
     - a small router that swaps pages when a site link is clicked, then
       re-runs the site's own script against the new markup

   The site itself is not changed and needs no build step. This tool only
   reads from --src; nothing it does affects what gets published.

   Options:
     --src <dir>              source directory            (default: public)
     --out <file>             output file  (default: dist/<name>-preview.html)
     --name <slug>            basename used by the default --out
     --label <text>           text in the corner badge, "" removes the badge
     --max-image-width <n>    widest responsive variant to inline (default 1400)
     --no-fonts               link to Google Fonts instead of inlining them
     --help
   ========================================================================= */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

/* ---------------------------------------------------------------------
   Arguments
   --------------------------------------------------------------------- */

const args = process.argv.slice(2);

function flag(name, fallback) {
    const i = args.indexOf('--' + name);
    return i === -1 || i === args.length - 1 ? fallback : args[i + 1];
}

if (args.includes('--help') || args.includes('-h')) {
    console.log(await readFile(new URL(import.meta.url), 'utf8').then(
        (text) => text.slice(text.indexOf('/* ='), text.indexOf('========= */') + 12)
    ));
    process.exit(0);
}

const SRC = path.resolve(flag('src', 'public'));
const NAME = flag('name', 'callegari-solutions');
const OUT = path.resolve(flag('out', path.join('dist', NAME + '-preview.html')));
const LABEL = flag('label', 'PREVIEW COPY · draft for review, not published');
const MAX_IMAGE_WIDTH = Number(flag('max-image-width', '1400'));
const INLINE_FONTS = !args.includes('--no-fonts');

if (!existsSync(SRC)) {
    console.error('Source directory not found: ' + SRC);
    process.exit(1);
}

/* ---------------------------------------------------------------------
   Small helpers
   --------------------------------------------------------------------- */

const MIME = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2'
};

/* Assets are inlined as a token first and resolved once every page has been
   read. A file used on one page is written straight into that page; a file
   used on several is carried once in a store the router reads from, so a
   shared logo or hero is not paid for per page. */
const inlined = new Map();   // asset path -> token
const assets = new Map();    // token -> data URI
const PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
let assetBytes = 0;

function isLocalAsset(url) {
    if (!url) return false;
    if (/^(https?:|data:|mailto:|tel:|#|\/\/)/i.test(url)) return false;
    return MIME[path.extname(url.split('?')[0]).toLowerCase()] !== undefined;
}

async function dataUri(url) {
    const clean = url.split('?')[0].split('#')[0];
    if (inlined.has(clean)) return inlined.get(clean);

    const file = path.join(SRC, clean);
    if (!existsSync(file)) {
        console.warn('  ! missing asset, left as a relative link: ' + clean);
        inlined.set(clean, null);
        return null;
    }

    const buffer = await readFile(file);
    const mime = MIME[path.extname(clean).toLowerCase()];
    const token = '__ASSET' + assets.size + '__';

    assets.set(token, 'data:' + mime + ';base64,' + buffer.toString('base64'));
    assetBytes += buffer.length;
    inlined.set(clean, token);
    return token;
}

/* Attributes of a single tag, as a plain object. The markup here is hand
   written and well formed, which is why a parser is not needed. */
function readAttrs(tag) {
    const out = {};
    const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let match;
    let first = true;

    while ((match = pattern.exec(tag)) !== null) {
        if (first) { first = false; continue; }        // the tag name itself
        out[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
    }
    return out;
}

function writeAttrs(attrs) {
    return Object.entries(attrs)
        .map(([key, value]) => (value === '' ? ' ' + key : ' ' + key + '="' + value + '"'))
        .join('');
}

/* "a.webp 480w, b.webp 960w" -> [{url, width}], widest last. */
function readSrcset(value) {
    if (!value) return [];
    return value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
            const bits = part.split(/\s+/);
            const descriptor = bits[1] || '';
            const width = /^(\d+)w$/.test(descriptor) ? Number(descriptor.slice(0, -1)) : 0;
            return { url: bits[0], width };
        })
        .sort((a, b) => a.width - b.width);
}

/* One variant per image: the widest that stays under the cap, preferring
   WebP where the page offers it. Which variant a browser would have picked
   changes the file size, never the layout, which is set in CSS. */
function pickVariant(candidates) {
    if (!candidates.length) return null;
    const capped = candidates.filter((c) => !c.width || c.width <= MAX_IMAGE_WIDTH);
    const pool = capped.length ? capped : [candidates[0]];
    return pool[pool.length - 1].url;
}

/* Plain text, such as the badge label, on its way into markup. */
function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* Markup lifted out of a page is escaped already: a title reading
   "Consulting &amp; Strategy" only needs its quotes dealt with before it
   goes into an attribute. Escaping it again would show the entity itself. */
function escapeAttr(markup) {
    return markup.replace(/"/g, '&quot;');
}

function kb(bytes) {
    return (bytes / 1024).toFixed(0).padStart(5) + ' KB';
}

/* ---------------------------------------------------------------------
   Page discovery, in the order the site's own navigation lists them
   --------------------------------------------------------------------- */

const files = (await readdir(SRC)).filter((f) => f.endsWith('.html')).sort();

if (!files.includes('index.html')) {
    console.error('No index.html in ' + SRC);
    process.exit(1);
}

const indexHtml = await readFile(path.join(SRC, 'index.html'), 'utf8');
const navOrder = [];
const navBlock = indexHtml.match(/<nav\b[\s\S]*?<\/nav>/i);

if (navBlock) {
    for (const match of navBlock[0].matchAll(/href="([^"#]+\.html)[^"]*"/gi)) {
        if (files.includes(match[1]) && !navOrder.includes(match[1])) navOrder.push(match[1]);
    }
}

const pageFiles = ['index.html']
    .concat(navOrder.filter((f) => f !== 'index.html'))
    .concat(files.filter((f) => f !== 'index.html' && !navOrder.includes(f)));

const keyOf = (file) => (file === 'index.html' ? 'home' : file.replace(/\.html$/, ''));

/* ---------------------------------------------------------------------
   Per page: pull out the title and the body, then inline and rewrite
   --------------------------------------------------------------------- */

async function collapsePictures(html) {
    const blocks = [...html.matchAll(/<picture\b[^>]*>([\s\S]*?)<\/picture>/gi)];

    for (const block of blocks) {
        const inner = block[1];
        const imgTag = inner.match(/<img\b[^>]*>/i);
        if (!imgTag) continue;

        const attrs = readAttrs(imgTag[0]);
        const modern = [];
        const classic = [];

        for (const source of inner.matchAll(/<source\b[^>]*>/gi)) {
            const sourceAttrs = readAttrs(source[0]);
            const list = /webp|avif/i.test(sourceAttrs.type || '') ? modern : classic;
            list.push(...readSrcset(sourceAttrs.srcset));
        }

        const chosen =
            pickVariant(modern) ||
            pickVariant(classic) ||
            pickVariant(readSrcset(attrs.srcset)) ||
            attrs.src;

        const uri = isLocalAsset(chosen) ? await dataUri(chosen) : null;

        delete attrs.srcset;
        delete attrs.sizes;
        attrs.src = uri || chosen;

        const tag = '<img' + writeAttrs(attrs) + '>';
        html = html.replace(block[0], () => tag);
    }

    /* Images that carry a srcset without a <picture> around them. */
    const loose = [...html.matchAll(/<img\b[^>]*\bsrcset=[^>]*>/gi)];

    for (const found of loose) {
        const attrs = readAttrs(found[0]);
        const chosen = pickVariant(readSrcset(attrs.srcset)) || attrs.src;
        const uri = isLocalAsset(chosen) ? await dataUri(chosen) : null;

        delete attrs.srcset;
        delete attrs.sizes;
        attrs.src = uri || chosen;

        const tag = '<img' + writeAttrs(attrs) + '>';
        html = html.replace(found[0], () => tag);
    }

    return html;
}

/* Everything still pointing at a file on disk: single images, the favicon,
   anything an attribute references by relative path. */
async function inlineAssets(html) {
    const refs = [...html.matchAll(/\b(src|href|poster|content)="([^"]+)"/gi)];

    for (const ref of refs) {
        if (!isLocalAsset(ref[2])) continue;
        const uri = await dataUri(ref[2]);
        if (uri) html = html.replace(ref[0], () => ref[1] + '="' + uri + '"');
    }

    return html;
}

/* index.html -> #!home, services.html#funding -> #!services!funding.
   The "!" prefix keeps router hashes apart from the site's own in-page
   anchors, which the services page writes as plain #section links. */
function rewriteLinks(html) {
    return html.replace(/href="([^"]+\.html)(#([^"]*))?"/gi, (whole, file, _hash, fragment) => {
        if (!pageFiles.includes(file)) return whole;
        return 'href="#!' + keyOf(file) + (fragment ? '!' + fragment : '') + '"';
    });
}

const pages = [];

for (const file of pageFiles) {
    const raw = await readFile(path.join(SRC, file), 'utf8');
    const body = raw.match(/<body([^>]*)>([\s\S]*)<\/body>/i);

    if (!body) {
        console.warn('  ! no <body> found, skipping ' + file);
        continue;
    }

    let markup = body[2]
        .replace(/<script\b[^>]*\bsrc="[^"]*"[^>]*>\s*<\/script>/gi, '')   // re-run by the router
        .trim();

    markup = await collapsePictures(markup);
    markup = await inlineAssets(markup);
    markup = rewriteLinks(markup);

    const title = (raw.match(/<title>([\s\S]*?)<\/title>/i) || [, file])[1].trim();

    pages.push({
        file,
        key: keyOf(file),
        title,
        bodyAttrs: readAttrs('<body' + body[1] + '>'),
        markup
    });

    console.log('  page  ' + file.padEnd(46) + kb(Buffer.byteLength(markup)));
}

/* ---------------------------------------------------------------------
   Resolve the asset tokens now that every page has been read
   --------------------------------------------------------------------- */

const shared = new Map();

for (const [token, uri] of assets) {
    const used = pages.filter((page) => page.markup.includes(token)).length;

    for (const page of pages) {
        if (!page.markup.includes(token)) continue;

        /* Used on more than one page: leave a reference for the router and
           carry the bytes once. Anything else is written straight in. */
        if (used > 1) {
            const id = token.slice(2, -2);

            shared.set(id, uri);
            page.markup = page.markup.replaceAll(
                'src="' + token + '"',
                'src="' + PLACEHOLDER + '" data-preview-src="' + id + '"'
            );
        }

        page.markup = page.markup.replaceAll(token, () => uri);
    }
}

/* ---------------------------------------------------------------------
   Stylesheet, fonts, script
   --------------------------------------------------------------------- */

const css = await readFile(path.join(SRC, 'style.css'), 'utf8');

/* An inline script ends at the first literal </script, wherever it sits, so
   the sequence is backslash escaped. "<\/script" means the same thing to
   JavaScript inside a string, a regular expression or a comment, which is
   everywhere it can legitimately appear. */
const js = (await readFile(path.join(SRC, 'script.js'), 'utf8')).replace(/<\/script/gi, '<\\/script');

/* The font <link> the pages carry, so the same faces get inlined. */
const fontHref = (indexHtml.match(/href="(https:\/\/fonts\.googleapis\.com\/css2[^"]*)"/i) || [])[1];
let fontCss = '';
let fontBytes = 0;

if (fontHref && INLINE_FONTS) {
    try {
        const href = fontHref.replace(/&amp;/g, '&');
        const response = await fetch(href, {
            headers: {
                /* Without a modern UA the API answers with TrueType, which is
                   several times the size of the WOFF2 every current browser
                   understands. */
                'user-agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) throw new Error('HTTP ' + response.status);

        const sheet = await response.text();

        /* Google returns one @font-face per subset, each preceded by a
           comment naming it. Only the Latin subsets are worth carrying. */
        const faces = [...sheet.matchAll(/\/\*\s*([a-z-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/gi)]
            .filter((face) => face[1] === 'latin' || face[1] === 'latin-ext')
            .map((face) => face[2]);

        /* Inter and Manrope are variable fonts, so every weight the site asks
           for points at the same file. Embedding each block as it stands
           would carry that file once per weight. Blocks sharing a file are
           folded into one @font-face covering the range instead. */
        const groups = new Map();

        for (const face of faces) {
            const url = (face.match(/url\((https:\/\/[^)]+\.woff2)\)/i) || [])[1];
            if (!url) continue;

            const weight = Number((face.match(/font-weight:\s*(\d+)/i) || [, '400'])[1]);
            const group = groups.get(url) || { face, low: weight, high: weight };

            group.low = Math.min(group.low, weight);
            group.high = Math.max(group.high, weight);
            groups.set(url, group);
        }

        for (const [url, group] of groups) {
            const font = Buffer.from(await (await fetch(url)).arrayBuffer());
            fontBytes += font.length;

            fontCss += group.face
                .replace(/font-weight:\s*\d+/i, 'font-weight: ' + (group.low === group.high
                    ? group.low
                    : group.low + ' ' + group.high))
                .replace(
                    /url\(https:\/\/[^)]+\.woff2\)/i,
                    'url(data:font/woff2;base64,' + font.toString('base64') + ')'
                ) + '\n';
        }

        console.log('  fonts ' + String(groups.size + ' files').padEnd(46) + kb(fontBytes));
    } catch (error) {
        console.warn('  ! could not inline the web fonts (' + error.message + ')');
        console.warn('    the file will pull them from Google Fonts when online');
        fontCss = '';
    }
}

const fontLink = fontCss || !fontHref
    ? ''
    : '\n    <link rel="stylesheet" href="' + fontHref + '">';

/* ---------------------------------------------------------------------
   Assemble
   --------------------------------------------------------------------- */

const badge = LABEL
    ? `    <div id="preview-badge" data-preview-keep hidden>
        <span>${escapeHtml(LABEL)}</span>
        <button type="button" id="preview-badge-close" aria-label="Hide this notice">&times;</button>
    </div>
`
    : '';

/* Images that appear on more than one page, carried once. JSON cannot end a
   script block, and base64 has no character that needs escaping here. */
const store = shared.size
    ? '    <script type="application/json" id="preview-assets" data-preview-keep>' +
      JSON.stringify(Object.fromEntries(shared)) +
      '</script>\n'
    : '';

const templates = pages
    .map(
        (page) => `    <template data-preview-keep data-page="${page.key}" data-title="${escapeAttr(
            page.title
        )}" data-body-class="${page.bodyAttrs.class || ''}">
${page.markup}
    </template>`
    )
    .join('\n');

const out = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pages[0].title}</title>
<meta name="robots" content="noindex,nofollow">${fontLink}
<script>document.documentElement.classList.add('js');</script>

<!-- =====================================================================
     SINGLE FILE PREVIEW
     Built from the site source by tools/build-preview.mjs. Every page,
     style, script, image and font lives in this one file, so it can be
     emailed and opened straight from the desktop with no server and no
     internet connection. It is a review copy: search engines are told to
     ignore it, and nothing here is what gets published.
     ===================================================================== -->

<style>
${fontCss}</style>

<style>
${css}</style>

<style>
/* The preview badge. Fixed, out of the layout, and never printed, so the
   design underneath is reviewed exactly as it was built. */
#preview-badge {
    position: fixed;
    left: 16px;
    bottom: 16px;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: calc(100vw - 32px);
    padding: 9px 10px 9px 14px;
    border-radius: 999px;
    background: rgba(18, 35, 59, .94);
    color: #fff;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
    letter-spacing: .04em;
    line-height: 1.3;
    box-shadow: 0 6px 24px rgba(0, 0, 0, .28);
}

#preview-badge[hidden] { display: none; }

#preview-badge-close {
    flex: none;
    width: 22px;
    height: 22px;
    border: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, .16);
    color: inherit;
    font-size: 15px;
    line-height: 1;
    cursor: pointer;
}

#preview-badge-close:hover { background: rgba(255, 255, 255, .3); }

/* Small enough on a phone to stay on one line and off the buttons. */
@media (max-width: 560px) {
    #preview-badge {
        left: 8px;
        bottom: 8px;
        padding: 6px 7px 6px 11px;
        font-size: 10.5px;
        letter-spacing: .02em;
    }

    #preview-badge-close { width: 19px; height: 19px; font-size: 13px; }
}

@media print { #preview-badge { display: none; } }
</style>
</head>
<body>
<noscript>
    <div style="max-width:38em;margin:14vh auto;padding:0 24px;font:16px/1.6 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#12233B">
        <h1 style="font-size:22px">This preview needs JavaScript</h1>
        <p>The whole site is packed into this one file, and a small script puts each
        page on screen. Turn JavaScript on for local files, or open the file in a
        different browser, and the site will appear.</p>
    </div>
</noscript>

${badge}${store}
${templates}

<script data-preview-keep>
/* =====================================================================
   PREVIEW ROUTER
   Holds the pages that the templates above carry, swaps one into the
   document when a site link is clicked, then runs the site's own script
   against the new markup exactly as a real page load would.
   ===================================================================== */
(function () {
    'use strict';

    var addWindowListener = window.addEventListener.bind(window);
    var addDocumentListener = document.addEventListener.bind(document);

    /* Each page gets its own listener scope. The site script attaches
       scroll, resize and keydown handlers to window and document; without
       this they would pile up, one set per page viewed, all pointing at
       markup that is no longer in the document. */
    var scope = null;

    function scopeListeners(target) {
        var native = target.addEventListener.bind(target);

        target.addEventListener = function (type, handler, options) {
            var settings = options && typeof options === 'object'
                ? Object.assign({}, options)
                : { capture: !!options };

            if (scope) settings.signal = scope.signal;
            return native(type, handler, settings);
        };
    }

    scopeListeners(window);
    scopeListeners(document);

    var storeNode = document.getElementById('preview-assets');
    var store = storeNode ? JSON.parse(storeNode.textContent) : {};

    var pages = {};
    var order = [];

    Array.prototype.forEach.call(document.querySelectorAll('template[data-page]'), function (node) {
        pages[node.dataset.page] = node;
        order.push(node.dataset.page);
    });

    function parseHash(hash) {
        var match = /^#!([^!]+)(?:!(.*))?$/.exec(hash || '');
        if (!match || !pages[match[1]]) return null;
        return { page: match[1], anchor: match[2] || '' };
    }

    function show(key, anchor) {
        var template = pages[key];
        if (!template) return;

        if (scope) scope.abort();
        scope = new AbortController();

        document.title = template.dataset.title;
        document.body.className = template.dataset.bodyClass || '';

        /* body.children is live, so it has to be copied before anything in
           it is removed. What stays is the badge, the templates and this
           script; what goes is the page that was on screen. */
        var keep = [];

        Array.prototype.slice.call(document.body.children).forEach(function (node) {
            if (node.hasAttribute('data-preview-keep')) keep.push(node);
            else node.remove();
        });

        var markup = template.content.cloneNode(true);

        /* Images shared with another page are stored once. Point them at the
           real bytes before the markup is on screen, never after. */
        Array.prototype.forEach.call(markup.querySelectorAll('[data-preview-src]'), function (img) {
            var uri = store[img.getAttribute('data-preview-src')];
            if (uri) img.setAttribute('src', uri);
        });

        document.body.insertBefore(markup, keep[0] || null);

        /* The site script is an IIFE that reads the document as it runs, so
           calling it again is the same work a fresh page load would do. */
        runSiteScript();

        var target = anchor && document.getElementById(anchor);

        if (target) target.scrollIntoView();
        else window.scrollTo(0, 0);
    }

    /* Site links were rewritten to #!page hashes at build time, so the
       browser's own hash handling drives navigation, and Back and Forward
       work the way a reviewer expects. */
    addWindowListener('hashchange', function () {
        var route = parseHash(location.hash);
        if (route) show(route.page, route.anchor);
    });

    addDocumentListener('click', function (event) {
        var link = event.target.closest && event.target.closest('a[href^="#!"]');
        if (!link) return;

        var route = parseHash(link.getAttribute('href'));
        if (!route) return;

        /* Clicking the page you are already on should still take you to the
           top, or to the section named in the link. */
        if (location.hash === link.getAttribute('href')) {
            event.preventDefault();
            show(route.page, route.anchor);
        }
    });

    var badge = document.getElementById('preview-badge');

    if (badge) {
        badge.hidden = false;
        document.getElementById('preview-badge-close').addEventListener('click', function () {
            badge.hidden = true;
        });
    }

    var start = parseHash(location.hash) || { page: order[0], anchor: '' };
    show(start.page, start.anchor);
}());

/* =====================================================================
   SITE SCRIPT
   public/script.js as it ships, wrapped in a function so the router can
   run it again after it swaps in a different page. The only edit is a
   backslash added inside the closing script tag written in its header
   comment, which an inline script cannot carry as it stands.
   ===================================================================== */
function runSiteScript() {
${js}
}
</script>
</body>
</html>
`;

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, out, 'utf8');

const total = Buffer.byteLength(out);

console.log('  css   ' + ''.padEnd(46) + kb(Buffer.byteLength(css)));
console.log('  js    ' + ''.padEnd(46) + kb(Buffer.byteLength(js)));
console.log('  media ' + String(inlined.size + ' files').padEnd(46) + kb(assetBytes));
console.log('');
console.log('  ' + pages.length + ' pages -> ' + path.relative(process.cwd(), OUT) + '  (' + kb(total).trim() + ')');
