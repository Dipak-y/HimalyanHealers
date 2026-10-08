document.addEventListener('DOMContentLoaded', function () {
  /* Keep the hero's pin distance matched to the trust-strip's real
     rendered height, so the sticky hero releases exactly when the
     strip has fully risen into place (no leftover gap beneath it). */
  (function () {
    var strip = document.querySelector('.trust-strip');
    if (!strip) return;
    var root = document.documentElement;

    function sync() {
      var h = Math.ceil(strip.getBoundingClientRect().height);
      if (h > 0) root.style.setProperty('--trust-strip-h', h + 'px');
    }

    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('load', sync); // fonts/images can still shift height after DOMContentLoaded

    if (window.ResizeObserver) {
      new ResizeObserver(sync).observe(strip);
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(sync);
    }
  })();

  /* Contact section (desktop 2-col layout only): the booking photo is shaped with a
     notch that wraps around the "Schedule Appointment" button, as in the reference.

     The notch is cut out of the photo itself with ONE clip-path, so every corner
     (top-left, the two corners of the left part, the inner curve, the top-right
     corner under the button, and the bottom corners) is rounded by the same path.
     Nothing is painted over the photo, so no square corner can show through.

     Layout rules (all measured from the button, so they hold at any screen width):
       - the photo's left part starts just above the top of the button (TOP_OVERLAP)
       - the notch bottom sits only a small gap (BTN_GAP) under the button
       - the message box height follows the form width (as in the reference)
       - if the contact details are tall, the button is pushed down so the photo never
         touches them */
  (function () {
    var grid = document.querySelector('.contact-grid');
    var info = document.querySelector('.contact-info');
    var form = document.querySelector('.booking-form');
    var media = document.querySelector('.contact-media');
    var frame = document.querySelector('.contact-media-frame');
    if (!grid || !info || !form || !media || !frame) return;
    var btn = form.querySelector('.btn-primary');
    var textarea = form.querySelector('textarea');
    if (!btn) return;

    var INFO_GAP = 32;    // minimum gap between the contact details and the top of the photo
    var TOP_OVERLAP = 12; // the photo's left part starts this far above the top of the button
    var BTN_GAP = 16;     // gap between the button and the photo edge under it
    var TEXTAREA_RATIO = 0.3; // message box height = form width x this (min 130px)
    var NOTCH_SIDE = 16;  // notch starts this far left of the form column
    var R = 24;           // photo corner radius (matches --radius-lg)
    var R_IN = 32;        // radius of the inner curve at the bottom-left of the notch

    function reset() {
      media.style.marginTop = '';
      frame.style.clipPath = '';
      if (textarea) textarea.style.minHeight = '';
    }

    // Layout-only vertical position: ignores the scroll-reveal translateY so the
    // numbers are the same before and after the reveal animation runs.
    function ty(el) {
      var t = getComputedStyle(el).transform;
      return t && t !== 'none' ? new DOMMatrix(t).m42 : 0;
    }
    function edgeIn(el, box, boxTop, edge) {
      return el.getBoundingClientRect()[edge] - ty(box) - boxTop;
    }

    function sync() {
      var columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
      if (columns < 2) { reset(); return; }

      var taH = textarea ? Math.max(130, Math.round(form.offsetWidth * TEXTAREA_RATIO)) : 0;
      if (textarea) textarea.style.minHeight = taH + 'px';

      var g = grid.getBoundingClientRect();
      var infoBottom = edgeIn(info, info, g.top, 'bottom');
      var btnTop = edgeIn(btn, form, g.top, 'top');
      var btnBottom = edgeIn(btn, form, g.top, 'bottom');

      var imageTop = btnTop - TOP_OVERLAP;
      var minTop = infoBottom + INFO_GAP;
      if (imageTop < minTop && textarea) {     // details are tall: push the button down
        var deficit = minTop - imageTop;
        textarea.style.minHeight = (taH + deficit) + 'px';
        btnTop += deficit;
        btnBottom += deficit;
        imageTop = minTop;
      }
      var notchBottom = btnBottom + BTN_GAP;

      var gridHeight = grid.offsetHeight;      // after the textarea has grown
      media.style.marginTop = (imageTop - gridHeight) + 'px';

      var W = frame.offsetWidth;
      var H = frame.offsetHeight;
      var notchH = notchBottom - imageTop;                 // notch height inside the photo
      var notchLeft = form.getBoundingClientRect().left - g.left - NOTCH_SIDE;
      notchLeft = Math.max(R * 2 + R_IN, Math.min(notchLeft, W - (R + R_IN + 40)));
      if (notchH < R + R_IN) { frame.style.clipPath = ''; return; }

      frame.style.clipPath = 'path("' + [
        'M', R, 0,
        'H', notchLeft - R,
        'A', R, R, 0, 0, 1, notchLeft, R,              // rounded corner: top-right of the left part
        'V', notchH - R_IN,
        'A', R_IN, R_IN, 0, 0, 0, notchLeft + R_IN, notchH, // inner curve around the button
        'H', W - R,
        'A', R, R, 0, 0, 1, W, notchH + R,             // rounded corner: photo top-right under the button
        'V', H - R,
        'A', R, R, 0, 0, 1, W - R, H,
        'H', R,
        'A', R, R, 0, 0, 1, 0, H - R,
        'V', R,
        'A', R, R, 0, 0, 1, R, 0,
        'Z'
      ].join(' ') + '")';
    }

    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('load', sync);
    if (window.ResizeObserver) {
      new ResizeObserver(sync).observe(grid);
      new ResizeObserver(sync).observe(frame);
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(sync);
    }
  })();

  /* Testimonials: repeat each row's items so it can drift endlessly without a jump */
  (function () {
    var rows = document.querySelectorAll('.tm-row');
    if (!rows.length) return;
    var SPEED = 40; // px per second

    function build(row) {
      var track = row.querySelector('.tm-track');
      if (!track) return;
      // reset to the original items only
      Array.prototype.slice.call(track.querySelectorAll('[data-clone]')).forEach(function (n) { n.remove(); });
      var originals = Array.prototype.slice.call(track.children);
      var first = originals[0];
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      var shift = originals.reduce(function (w, el) { return w + el.offsetWidth + gap; }, 0);
      if (!shift) return;
      var need = window.innerWidth * 2 + shift * 2, copies = 0;
      while (track.scrollWidth < need && copies < 12) {
        originals.forEach(function (el) {
          var c = el.cloneNode(true);
          c.setAttribute('data-clone', '');
          c.setAttribute('aria-hidden', 'true');
          track.appendChild(c);
        });
        copies++;
      }
      track.style.setProperty('--tm-shift', shift + 'px');
      track.style.setProperty('--tm-dur', (shift / SPEED) + 's');
      track.classList.add('is-running');
    }

    function buildAll() { rows.forEach(build); }
    buildAll();
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(buildAll, 200); });
    window.addEventListener('load', buildAll);
  })();

  /* Keep the fixed header compact while scrolling. The nav-solid class
     adds a light background after the hero leaves view for contrast. */
  var header = document.querySelector('.site-header');
  function onScroll() {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    header.classList.toggle('nav-solid', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll);
  onScroll();

  /* Keep the nav pill solid after scrolling starts, including while the
     pinned hero remains visible. */
  (function () {
    var hero = document.querySelector('.hero');
    if (!hero || !window.IntersectionObserver) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        header.classList.toggle('nav-solid', window.scrollY > 40 || !entry.isIntersecting);
      });
    }, { threshold: 0, rootMargin: '-90px 0px 0px 0px' });
    io.observe(hero);
  })();

  /* Membership (#wellness) section: turns white only while it's the
     section in view, transparent otherwise. Nav bar stays untouched. */
  (function () {
    var wellness = document.getElementById('wellness');
    if (!wellness || !window.IntersectionObserver) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        wellness.classList.toggle('section-in-view', entry.isIntersecting);
      });
    }, { threshold: 0, rootMargin: '-96px 0px -40% 0px' });
    io.observe(wellness);
  })();

  /* Mobile nav drawer */
  var toggle = document.querySelector('.nav-toggle');
  var mobileNav = document.querySelector('.mobile-nav');
  var mobileClose = document.querySelector('.mobile-nav-close');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', function () { mobileNav.classList.add('open'); });
    mobileClose.addEventListener('click', function () { mobileNav.classList.remove('open'); });
    mobileNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { mobileNav.classList.remove('open'); });
    });
  }

  /* Active nav link on scroll */
  var sections = document.querySelectorAll('section[id]');
  var navLinks = document.querySelectorAll('.nav-links a');
  function setActive() {
    var scrollPos = window.scrollY + 140;
    sections.forEach(function (sec) {
      if (scrollPos >= sec.offsetTop && scrollPos < sec.offsetTop + sec.offsetHeight) {
        navLinks.forEach(function (l) { l.classList.remove('active'); });
        var match = document.querySelector('.nav-links a[href="#' + sec.id + '"]');
        if (match) match.classList.add('active');
      }
    });
  }
  window.addEventListener('scroll', setActive);

  /* Simple carousels: treatments, therapists, hero indicators */
  function setupDots(dotsSelector, itemsCount, onSelect) {
    var dots = document.querySelectorAll(dotsSelector + ' span');
    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        dots.forEach(function (d) { d.classList.remove('active'); });
        dot.classList.add('active');
        if (onSelect) onSelect(i);
      });
    });
  }
  setupDots('.hero-indicators', 3);

  /* Services slider: 3 cards visible on desktop (2 tablet, 1 phone). The middle visible
     card is highlighted (dark) as you slide. Swipe / drag (the row follows your finger or mouse), dots and the keyboard all work. */
  (function () {
    var carousel = document.querySelector('.treatments-carousel');
    var dotsWrap = document.querySelector('.carousel-dots[data-group="treatments"]');
    if (!carousel || !dotsWrap) return;
    var cards = Array.prototype.slice.call(carousel.querySelectorAll('.treatment-card'));
    var page = 0, pages = 1, perView = 3;

    function readPerView() {
      return parseInt(getComputedStyle(carousel).getPropertyValue('--per-view'), 10) || 3;
    }
    function go(n) {
      page = Math.max(0, Math.min(n, pages - 1));
      carousel.style.setProperty('--page', page);
      var mid = page + Math.floor((perView - 1) / 2);
      Array.prototype.forEach.call(dotsWrap.children, function (d, i) {
        if (i === page) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
      });
      cards.forEach(function (card, i) {
        var visible = i >= page && i < page + perView;
        if (visible) { card.removeAttribute('inert'); card.removeAttribute('aria-hidden'); }
        else { card.setAttribute('inert', ''); card.setAttribute('aria-hidden', 'true'); }
        var on = i === mid;
        card.classList.toggle('featured', on);
        var btn = card.querySelector('.btn');
        if (btn) { btn.classList.toggle('btn-light', on); btn.classList.toggle('btn-outline', !on); }
      });
    }
    function build() {
      perView = readPerView();
      pages = Math.max(1, cards.length - perView + 1);
      dotsWrap.innerHTML = '';
      for (var i = 0; i < pages; i++) {
        (function (i) {
          var b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', 'Show treatments ' + (i + 1) + (perView > 1 ? ' to ' + (i + perView) : ''));
          b.addEventListener('click', function () { go(i); });
          dotsWrap.appendChild(b);
        })(i);
      }
      go(page);
    }
    /* The row follows your finger / mouse while you drag, then snaps to the nearest card */
    var startX = null, pid = null, dx = 0, dragging = false, dragged = false;
    function stepPx() { return cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : carousel.offsetWidth; }

    // Stop the browser's own drag-and-drop (links / images) and text selection from
    // stealing the mouse drag; clicks on "Book Now" still work.
    carousel.addEventListener('mousedown', function (e) { if (e.button === 0) e.preventDefault(); });
    carousel.addEventListener('dragstart', function (e) { e.preventDefault(); });
    Array.prototype.forEach.call(carousel.querySelectorAll('img, a'), function (el) { el.setAttribute('draggable', 'false'); });

    carousel.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      startX = e.clientX; pid = e.pointerId; dx = 0; dragging = false; dragged = false;
    });
    window.addEventListener('pointermove', function (e) {
      if (startX === null) return;
      dx = e.clientX - startX;
      if (!dragging && Math.abs(dx) > 6) {
        dragging = true;
        carousel.classList.add('is-dragging');
        try { carousel.setPointerCapture(pid); } catch (err) {}   // keep receiving moves even if the pointer leaves the row
      }
      if (!dragging) return;
      var atEdge = (page === 0 && dx > 0) || (page === pages - 1 && dx < 0);
      carousel.style.setProperty('--drag', (atEdge ? dx * 0.3 : dx) + 'px');   // resist at the ends
    });
    function endDrag() {
      if (startX === null) return;
      var moved = dx, wasDragging = dragging;
      startX = null; dragging = false;
      carousel.classList.remove('is-dragging');
      carousel.style.setProperty('--drag', '0px');
      try { carousel.releasePointerCapture(pid); } catch (err) {}
      if (!wasDragging) return;
      dragged = true;
      var n = Math.round(-moved / stepPx());
      if (n === 0 && Math.abs(moved) > 30) n = moved < 0 ? 1 : -1;
      go(page + Math.max(-perView, Math.min(perView, n)));
    }
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    carousel.addEventListener('click', function (e) {   // a drag must not trigger "Book Now"
      if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; }
    }, true);

    /* Trackpad two-finger swipe / shift + mouse wheel: one card per gesture */
    var wheelAcc = 0, wheelBusy = false, wheelTimer = null;
    carousel.addEventListener('wheel', function (e) {
      var ax = Math.abs(e.deltaX), ay = Math.abs(e.deltaY);
      var horizontal = ax > ay || (e.shiftKey && ay > 0);
      if (!horizontal) return;                       // normal vertical scrolling passes through
      e.preventDefault();
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(function () { wheelAcc = 0; wheelBusy = false; }, 140);
      if (wheelBusy) return;
      wheelAcc += ax > ay ? e.deltaX : e.deltaY;
      if (Math.abs(wheelAcc) > 40) { go(page + (wheelAcc > 0 ? 1 : -1)); wheelBusy = true; }
    }, { passive: false });

    /* Keyboard: focus the row and use the left / right arrow keys */
    carousel.tabIndex = 0;
    carousel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(page + 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { go(page - 1); e.preventDefault(); }
    });

    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(build, 120); });
    build();
  })();

  /* Therapists carousel: 2 cards per slide on desktop, 1 on tablet/mobile */
  (function () {
    var carousel = document.querySelector('.therapist-carousel');
    var dotsWrap = document.querySelector('.therapist-dots');
    if (!carousel || !dotsWrap) return;
    var cards = Array.prototype.slice.call(carousel.querySelectorAll('.therapist-card'));
    var mq = window.matchMedia('(max-width: 1024px)');
    var page = 0, pages = 1, perView = 2, timer = null;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function go(n) {
      page = Math.max(0, Math.min(n, pages - 1));
      carousel.style.setProperty('--page', page);
      Array.prototype.forEach.call(dotsWrap.children, function (d, i) {
        if (i === page) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
      });
      cards.forEach(function (card, i) {
        var visible = i >= page * perView && i < (page + 1) * perView;
        if (visible) { card.removeAttribute('inert'); card.removeAttribute('aria-hidden'); }
        else { card.setAttribute('inert', ''); card.setAttribute('aria-hidden', 'true'); }
      });
    }
    function build() {
      perView = mq.matches ? 1 : 2;
      pages = Math.ceil(cards.length / perView);
      dotsWrap.innerHTML = '';
      dotsWrap.style.display = pages > 1 ? '' : 'none';
      for (var i = 0; i < pages; i++) {
        (function (i) {
          var b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', 'Show therapists ' + (i * perView + 1) + (perView > 1 ? ' and ' + Math.min((i + 1) * perView, cards.length) : ''));
          b.addEventListener('click', function () { go(i); restart(); });
          dotsWrap.appendChild(b);
        })(i);
      }
      go(Math.min(page, pages - 1));
    }
    function restart() {
      clearInterval(timer);
      if (reduceMotion || pages < 2) return;
      timer = setInterval(function () { go(page + 1 >= pages ? 0 : page + 1); }, 7000);
    }
    ['mouseenter', 'focusin'].forEach(function (ev) { carousel.addEventListener(ev, function () { clearInterval(timer); }); });
    ['mouseleave', 'focusout'].forEach(function (ev) { carousel.addEventListener(ev, restart); });

    /* Swipe on touch screens */
    var startX = null;
    carousel.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) { go(page + (dx < 0 ? 1 : -1)); restart(); }
      startX = null;
    });

    if (mq.addEventListener) mq.addEventListener('change', build); else mq.addListener(build);
    build();
    restart();
  })();

  /* Pricing monthly/yearly toggle */
  var priceToggle = document.querySelector('.toggle-switch');
  var amounts = document.querySelectorAll('.price-tag .amount');
  var periods = document.querySelectorAll('.price-tag .period');
  if (priceToggle) {
    priceToggle.addEventListener('click', function () {
      var isYearly = priceToggle.classList.toggle('yearly');
      amounts.forEach(function (el, i) {
        el.textContent = 'Rs ' + el.getAttribute(isYearly ? 'data-yearly' : 'data-monthly');
      });
      periods.forEach(function (el) {
        el.textContent = isYearly ? '/year' : '/month';
      });
    });
  }

  /* Scroll reveal animation */
  var revealEls = document.querySelectorAll('.reveal');
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(function (el) { observer.observe(el); });

  /* Counter animation for trust numbers */
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var counted = false;
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !counted) {
          counted = true;
          var start = 0;
          var duration = 900;
          var startTime = null;
          function step(ts) {
            if (!startTime) startTime = ts;
            var progress = Math.min((ts - startTime) / duration, 1);
            el.textContent = Math.floor(progress * target).toLocaleString() + (el.dataset.suffix || '');
            if (progress < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        }
      });
    }, { threshold: 0.4 });
    counterObserver.observe(el);
  });

  /* Basic client-side form validation for booking form */
  var bookingForm = document.querySelector('.booking-form');
  if (bookingForm) {
    bookingForm.addEventListener('submit', function (e) {
      var required = bookingForm.querySelectorAll('[required]');
      var valid = true;
      required.forEach(function (field) {
        if (!field.value.trim()) {
          valid = false;
          field.style.borderColor = '#C0503C';
        } else {
          field.style.borderColor = '';
        }
      });
      if (!valid) e.preventDefault();
    });
  }
});
