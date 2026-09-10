/* =========================================================================
   CALLEGARI SOLUTIONS
   Single site script. Vanilla JavaScript, no dependencies, no build step.
   Loaded once per page with <script src="script.js" defer></script>.

   Every feature below is optional. If the elements it needs are not on the
   page it does nothing at all, because all five pages share this one file.

   Features:
     1  html.js flag
     2  Mobile navigation drawer
     3  Sticky header state
     4  Reveal on scroll
     5  Services page anchor navigation
     6  Contact intake form
     7  Footer year
   ========================================================================= */

(function () {

    /* ---------------------------------------------------------------------
       1  html.js flag
       This is the first statement in the file. The stylesheet hides .reveal
       elements only inside an html.js guard, so a visitor without JavaScript
       always sees the full page.
       --------------------------------------------------------------------- */

    document.documentElement.classList.add('js');

    var NAV_BREAKPOINT = 980;
    var STICKY_OFFSET = 24;
    var CONTACT_EMAIL = 'jay@callegarisolutions.com';
    var CONTACT_PHONE = '(318) 481-6505';
    var MAILTO_MAX = 1900;

    var reduceMotion = false;

    if (window.matchMedia) {
        reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /* Small helpers ----------------------------------------------------- */

    function qs(selector, scope) {
        return (scope || document).querySelector(selector);
    }

    function qsa(selector, scope) {
        return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
    }

    function on(target, type, handler, options) {
        if (target && target.addEventListener) {
            target.addEventListener(type, handler, options);
        }
    }

    function rafThrottle(fn) {
        var queued = false;
        return function () {
            if (queued) {
                return;
            }
            queued = true;
            window.requestAnimationFrame(function () {
                queued = false;
                fn();
            });
        };
    }


    /* ---------------------------------------------------------------------
       2  Mobile navigation drawer
       Breakpoint 980px. The toggle owns aria-expanded and aria-controls.
       Escape closes the drawer, a link click closes it, the body scroll is
       locked while it is open, and everything resets when the viewport
       crosses the breakpoint.
       --------------------------------------------------------------------- */

    function initNav() {
        var toggle = qs('.nav-toggle');

        if (!toggle) {
            return;
        }

        var controls = toggle.getAttribute('aria-controls');
        var nav = controls ? document.getElementById(controls) : null;

        if (!nav) {
            nav = qs('.nav');
        }

        if (!nav) {
            return;
        }

        if (!nav.id) {
            nav.id = 'site-nav';
        }

        toggle.setAttribute('aria-controls', nav.id);
        toggle.setAttribute('aria-expanded', 'false');

        function isOpen() {
            return nav.classList.contains('is-open');
        }

        function openNav() {
            nav.classList.add('is-open');
            document.body.classList.add('nav-open');
            toggle.setAttribute('aria-expanded', 'true');
        }

        function closeNav(returnFocus) {
            if (!isOpen() && !document.body.classList.contains('nav-open')) {
                return;
            }
            nav.classList.remove('is-open');
            document.body.classList.remove('nav-open');
            toggle.setAttribute('aria-expanded', 'false');
            if (returnFocus === true) {
                toggle.focus();
            }
        }

        on(toggle, 'click', function (event) {
            event.preventDefault();
            if (isOpen()) {
                closeNav(false);
            } else {
                openNav();
            }
        });

        /* A link inside the drawer closes it, including in page anchors. */
        on(nav, 'click', function (event) {
            var link = event.target.closest ? event.target.closest('a') : null;
            if (link && nav.contains(link)) {
                closeNav(false);
            }
        });

        on(document, 'keydown', function (event) {
            if ((event.key === 'Escape' || event.key === 'Esc') && isOpen()) {
                closeNav(true);
            }
        });

        /* Reset cleanly when the viewport crosses the breakpoint. */
        if (window.matchMedia) {
            var wide = window.matchMedia('(min-width: ' + NAV_BREAKPOINT + 'px)');
            var onBreakpoint = function (event) {
                if (event.matches) {
                    closeNav(false);
                }
            };

            if (typeof wide.addEventListener === 'function') {
                wide.addEventListener('change', onBreakpoint);
            } else if (typeof wide.addListener === 'function') {
                wide.addListener(onBreakpoint);
            }
        } else {
            on(window, 'resize', rafThrottle(function () {
                if (window.innerWidth >= NAV_BREAKPOINT) {
                    closeNav(false);
                }
            }));
        }
    }


    /* ---------------------------------------------------------------------
       3  Sticky header state
       Adds .is-stuck once the page has scrolled past a small threshold.
       Passive listener, throttled with requestAnimationFrame.
       --------------------------------------------------------------------- */

    function initStickyHeader() {
        var header = qs('.site-header');

        if (!header) {
            return;
        }

        var update = rafThrottle(function () {
            var y = window.pageYOffset || document.documentElement.scrollTop || 0;
            if (y > STICKY_OFFSET) {
                header.classList.add('is-stuck');
            } else {
                header.classList.remove('is-stuck');
            }
        });

        on(window, 'scroll', update, { passive: true });
        update();
    }


    /* ---------------------------------------------------------------------
       4  Reveal on scroll
       Bails out completely when reduced motion is requested or when
       IntersectionObserver is missing, and never leaves content hidden.
       Elements already on screen are shown in this same task, so there is
       no flash of hidden content on first paint.
       --------------------------------------------------------------------- */

    function initReveal() {
        var items = qsa('.reveal');

        if (!items.length) {
            return;
        }

        function showAll() {
            for (var i = 0; i < items.length; i++) {
                items[i].classList.add('is-visible');
            }
        }

        if (reduceMotion || !('IntersectionObserver' in window)) {
            showAll();
            return;
        }

        var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        var pending = [];

        for (var i = 0; i < items.length; i++) {
            var rect = items[i].getBoundingClientRect();
            if (rect.top < viewportHeight * 0.92 && rect.bottom > 0) {
                items[i].classList.add('is-visible');
            } else {
                pending.push(items[i]);
            }
        }

        if (!pending.length) {
            return;
        }

        var observer = new IntersectionObserver(function (entries, obs) {
            for (var j = 0; j < entries.length; j++) {
                if (entries[j].isIntersecting) {
                    entries[j].target.classList.add('is-visible');
                    obs.unobserve(entries[j].target);
                }
            }
        }, {
            root: null,
            rootMargin: '0px 0px -8% 0px',
            threshold: 0.08
        });

        for (var k = 0; k < pending.length; k++) {
            observer.observe(pending[k]);
        }

        /* Backstop. Late loading images can shift the layout, and a visitor
           can land on a deep link before the observer is wired up. On load,
           reveal anything that has ended up on screen and is still hidden. */
        on(window, 'load', function () {
            var height = window.innerHeight || document.documentElement.clientHeight;

            for (var m = 0; m < pending.length; m++) {
                if (pending[m].classList.contains('is-visible')) {
                    continue;
                }
                var box = pending[m].getBoundingClientRect();
                if (box.top < height && box.bottom > 0) {
                    pending[m].classList.add('is-visible');
                    observer.unobserve(pending[m]);
                }
            }
        });
    }


    /* ---------------------------------------------------------------------
       5  Services page anchor navigation
       Highlights the .anchor-nav link whose section is currently in view.
       Silently does nothing when there is no .anchor-nav on the page.
       --------------------------------------------------------------------- */

    function initAnchorNav() {
        var anchorNav = qs('.anchor-nav');

        if (!anchorNav) {
            return;
        }

        var links = qsa('a[href^="#"]', anchorNav);

        if (!links.length) {
            return;
        }

        var targets = [];

        for (var i = 0; i < links.length; i++) {
            var id = links[i].getAttribute('href').slice(1);
            if (!id) {
                continue;
            }
            var section = document.getElementById(id);
            if (section) {
                targets.push({ link: links[i], section: section });
            }
        }

        if (!targets.length) {
            return;
        }

        var current = null;
        var smoothSupported = 'scrollBehavior' in document.documentElement.style;

        /* The row scrolls horizontally under 1100px, so the marked link can sit
           outside the visible strip. Find the ancestor that really scrolls: a
           plain wrapper can report an overflowing scrollWidth while ignoring
           scrollLeft, so the overflow value has to be checked as well. */
        var scroller = (function () {
            var node = targets[0].link.parentNode;

            while (node && node.nodeType === 1) {
                var overflowX = window.getComputedStyle
                    ? window.getComputedStyle(node).overflowX
                    : '';

                if (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay') {
                    return node;
                }
                if (node === anchorNav) {
                    return null;
                }
                node = node.parentNode;
            }

            return null;
        }());

        /* Bring the active link into the visible part of the scrolling row so
           the brass underline is never marking something off screen. Above the
           wrap breakpoint the row fits, so there is nothing to scroll. */
        function revealLink(link) {
            if (!scroller || scroller.scrollWidth - scroller.clientWidth <= 4) {
                return;
            }

            var box = link.getBoundingClientRect();
            var frame = scroller.getBoundingClientRect();
            var gutter = 24;
            var delta = 0;

            if (box.left < frame.left + gutter) {
                delta = box.left - frame.left - gutter;
            } else if (box.right > frame.right - gutter) {
                delta = box.right - frame.right + gutter;
            }

            if (!delta) {
                return;
            }

            var left = scroller.scrollLeft + delta;

            if (smoothSupported && !reduceMotion && typeof scroller.scrollTo === 'function') {
                scroller.scrollTo({ left: left, behavior: 'smooth' });
            } else {
                scroller.scrollLeft = left;
            }
        }

        function setActive(entry) {
            if (entry === current) {
                return;
            }
            current = entry;
            for (var j = 0; j < targets.length; j++) {
                var isActive = targets[j] === entry;
                targets[j].link.classList.toggle('is-active', isActive);
                if (isActive) {
                    targets[j].link.setAttribute('aria-current', 'true');
                } else {
                    targets[j].link.removeAttribute('aria-current');
                }
            }
            if (entry) {
                revealLink(entry.link);
            }
        }

        var update = rafThrottle(function () {
            var header = qs('.site-header');
            var offset = (header ? header.offsetHeight : 0) + anchorNav.offsetHeight + 16;
            var found = null;

            for (var j = 0; j < targets.length; j++) {
                if (targets[j].section.getBoundingClientRect().top - offset <= 0) {
                    found = targets[j];
                }
            }

            /* Near the very bottom of the page, favour the last section. */
            var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
            var docHeight = document.documentElement.scrollHeight;
            var viewport = window.innerHeight || document.documentElement.clientHeight;

            if (scrollY + viewport >= docHeight - 4) {
                found = targets[targets.length - 1];
            }

            setActive(found);
        });

        on(window, 'scroll', update, { passive: true });
        on(window, 'resize', update, { passive: true });
        update();
    }


    /* ---------------------------------------------------------------------
       6  Contact intake form
       Validates in JavaScript, marks invalid controls with aria-invalid and
       an inline message, then either posts to data-endpoint or composes a
       mailto message. Results are announced in #form-status.
       --------------------------------------------------------------------- */

    var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function initForm() {
        var form = qs('#intake-form') || qs('form.form');

        if (!form) {
            return;
        }

        var status = document.getElementById('form-status') || qs('.form-status', form);
        var submitButton = qs('[type="submit"]', form);
        var controls = qsa('input, select, textarea', form).filter(function (control) {
            return control.type !== 'hidden' && control.type !== 'submit';
        });

        function fieldOf(control) {
            return control.closest ? control.closest('.field') : control.parentNode;
        }

        function labelTextOf(control) {
            var field = fieldOf(control);
            var label = null;

            if (control.id) {
                label = qs('label[for="' + control.id + '"]', form);
            }
            if (!label && field) {
                label = qs('label', field);
            }
            if (!label) {
                return control.name || 'Field';
            }

            return label.textContent
                .replace(/\s+/g, ' ')
                .replace(/\*/g, '')
                .replace(/[:?]\s*$/, '')
                .trim();
        }

        function errorNodeFor(control) {
            var field = fieldOf(control);

            if (!field) {
                return null;
            }

            var node = qs('.field__error', field);

            if (!node) {
                node = document.createElement('p');
                node.className = 'field__error';
                node.id = (control.id || control.name || 'field') + '-error';
                field.appendChild(node);
            }

            return node;
        }

        function describedBy(control, errorId, add) {
            var value = control.getAttribute('aria-describedby') || '';
            var parts = value.split(/\s+/).filter(function (part) {
                return part && part !== errorId;
            });

            if (add) {
                parts.push(errorId);
            }

            if (parts.length) {
                control.setAttribute('aria-describedby', parts.join(' '));
            } else {
                control.removeAttribute('aria-describedby');
            }
        }

        /* Scoped to the control's own .field. Never fall back to searching the
           whole document, or a control placed outside a .field would clear an
           unrelated field's message. */
        function clearError(control) {
            var field = fieldOf(control);

            control.removeAttribute('aria-invalid');

            if (!field) {
                return;
            }

            field.classList.remove('is-invalid');

            var node = qs('.field__error', field);

            if (node) {
                node.textContent = '';
                describedBy(control, node.id, false);
            }
        }

        function showError(control, message) {
            var field = fieldOf(control);
            var node = errorNodeFor(control);

            control.setAttribute('aria-invalid', 'true');

            if (field) {
                field.classList.add('is-invalid');
            }
            if (node) {
                node.textContent = message;
                describedBy(control, node.id, true);
            }
        }

        function isRequired(control) {
            return control.hasAttribute('required') || control.hasAttribute('data-required');
        }

        /* Messages stay short because they are rendered directly under the
           field they belong to and are wired up with aria-describedby, so a
           screen reader already reads the label first. */
        function validate() {
            var invalid = [];

            for (var i = 0; i < controls.length; i++) {
                var control = controls[i];
                var value = (control.value || '').trim();
                var message = '';

                if (isRequired(control) && !value) {
                    message = control.tagName === 'SELECT'
                        ? 'Please choose an option.'
                        : 'This field is required.';
                } else if (value && control.type === 'email' && !EMAIL_PATTERN.test(value)) {
                    message = 'Please enter a valid email address, for example name@company.com.';
                }

                if (message) {
                    showError(control, message);
                    invalid.push(control);
                } else {
                    clearError(control);
                }
            }

            return invalid;
        }

        function setStatus(message, kind) {
            if (!status) {
                return;
            }
            status.classList.remove('is-error', 'is-ok');
            if (kind) {
                status.classList.add(kind);
            }
            status.textContent = message;
        }

        function collect() {
            var rows = [];

            for (var i = 0; i < controls.length; i++) {
                var control = controls[i];
                var value = (control.value || '').trim();

                if (!value) {
                    continue;
                }

                rows.push({ label: labelTextOf(control), value: value, control: control });
            }

            return rows;
        }

        function topicOf(rows) {
            var select = qs('select', form);

            if (select && select.value) {
                var option = select.options[select.selectedIndex];
                return (option && option.text ? option.text : select.value).trim();
            }

            for (var i = 0; i < rows.length; i++) {
                if (rows[i].control.tagName === 'SELECT') {
                    return rows[i].value;
                }
            }

            return 'General inquiry';
        }

        /* Returns { url: string, trimmed: boolean }. The caller has to know
           whether anything was cut so it can say so in the status message. */
        function buildMailto(rows) {
            var subject = 'Project inquiry: ' + topicOf(rows);
            var signature = 'Sent from the contact form at callegarisolutions.com';
            var notice = '[This message was shortened to fit in an email. Full details available on request.]';
            var lines = [];

            for (var i = 0; i < rows.length; i++) {
                lines.push(rows[i].label + ': ' + rows[i].value);
            }

            var detail = lines.join('\r\n');
            var trimmed = false;

            function compose(text) {
                return 'mailto:' + CONTACT_EMAIL +
                    '?subject=' + encodeURIComponent(subject) +
                    '&body=' + encodeURIComponent(text);
            }

            function assemble() {
                return trimmed
                    ? detail + '\r\n\r\n' + notice + '\r\n' + signature
                    : detail + '\r\n\r\n' + signature;
            }

            var url = compose(assemble());

            /* Some mail clients truncate very long mailto links, so trim the
               message body rather than losing the contact details. The notice
               is part of the body being measured, so the loop still converges. */
            while (url.length > MAILTO_MAX && detail.length > 200) {
                detail = detail.slice(0, detail.length - 120);
                trimmed = true;
                url = compose(assemble());
            }

            return { url: url, trimmed: trimmed };
        }

        /* Guards against a second submit while a request is in flight.
           aria-disabled alone does not stop a submit button being activated,
           and the real disabled attribute would move focus away from the
           button mid request, so the flag does the blocking. */
        var sending = false;

        function busy(state) {
            sending = state === true;

            if (!submitButton) {
                return;
            }
            if (state) {
                submitButton.setAttribute('aria-disabled', 'true');
                submitButton.setAttribute('data-busy', 'true');
            } else {
                submitButton.removeAttribute('aria-disabled');
                submitButton.removeAttribute('data-busy');
            }
        }

        /* Clear a field's error as soon as the visitor corrects it. */
        for (var c = 0; c < controls.length; c++) {
            (function (control) {
                var handler = function () {
                    if (control.getAttribute('aria-invalid') === 'true') {
                        var value = (control.value || '').trim();
                        if (value && !(control.type === 'email' && !EMAIL_PATTERN.test(value))) {
                            clearError(control);
                        }
                    }
                };
                on(control, 'input', handler);
                on(control, 'change', handler);
            }(controls[c]));
        }

        on(form, 'submit', function (event) {
            event.preventDefault();

            if (sending) {
                return;
            }

            var invalid = validate();

            if (invalid.length) {
                var names = [];

                for (var v = 0; v < invalid.length; v++) {
                    names.push(labelTextOf(invalid[v]));
                }

                setStatus(
                    (invalid.length === 1
                        ? 'One field still needs attention: '
                        : invalid.length + ' fields still need attention: ') + names.join(', ') + '.',
                    'is-error'
                );
                invalid[0].focus();
                return;
            }

            var rows = collect();
            var endpoint = (form.getAttribute('data-endpoint') || '').trim();

            if (endpoint && typeof window.fetch === 'function') {
                busy(true);
                setStatus('Sending your message.', null);

                window.fetch(endpoint, {
                    method: 'POST',
                    body: new FormData(form),
                    headers: { 'Accept': 'application/json' }
                }).then(function (response) {
                    busy(false);
                    if (response && response.ok) {
                        form.reset();
                        for (var i = 0; i < controls.length; i++) {
                            clearError(controls[i]);
                        }
                        setStatus(
                            'Thank you. Your message has been sent. ' +
                            'For anything urgent, call ' + CONTACT_PHONE + '.',
                            'is-ok'
                        );
                    } else {
                        setStatus(
                            'The message could not be sent. Please email ' + CONTACT_EMAIL +
                            ' or call ' + CONTACT_PHONE + '.',
                            'is-error'
                        );
                    }
                }).catch(function () {
                    busy(false);
                    setStatus(
                        'The message could not be sent. Please email ' + CONTACT_EMAIL +
                        ' or call ' + CONTACT_PHONE + '.',
                        'is-error'
                    );
                });

                return;
            }

            /* Shipped default: no endpoint, so hand the message to the
               visitor's own email application. */
            var mail = buildMailto(rows);

            setStatus(
                'Your email application is opening with your message ready to send. ' +
                (mail.trimmed
                    ? 'The message was long, so the end of it was shortened to fit in an email link. Please check it before sending. '
                    : '') +
                'If nothing opens, email ' + CONTACT_EMAIL + ' or call ' + CONTACT_PHONE + '.',
                'is-ok'
            );

            window.location.href = mail.url;
        });
    }


    /* ---------------------------------------------------------------------
       7  Footer year
       Optional. Fills any [data-year] element with the current year.
       The shipped footer uses a fixed legal line, so this normally no-ops.
       --------------------------------------------------------------------- */

    function initYear() {
        var nodes = qsa('[data-year]');

        for (var i = 0; i < nodes.length; i++) {
            nodes[i].textContent = String(new Date().getFullYear());
        }
    }


    /* ---------------------------------------------------------------------
       Start
       --------------------------------------------------------------------- */

    function start() {
        initNav();
        initStickyHeader();
        initReveal();
        initAnchorNav();
        initForm();
        initYear();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

}());
