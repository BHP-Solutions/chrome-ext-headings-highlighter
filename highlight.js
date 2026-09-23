(() => {
  // Clicking the extension again turns the highlights off
  if (window.__headingHighlighterCleanup) {
    window.__headingHighlighterCleanup();
    return;
  }

  document.getElementById('heading-debug-overlay')?.remove();

  // The overlay is absolutely positioned and spans the whole document (not
  // position: fixed), so full-page screenshot tools that scroll and stitch –
  // and hide fixed elements after the first frame – still capture it.
  const overlay = document.createElement('div');
  overlay.id = 'heading-debug-overlay';

  Object.assign(overlay.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    background: 'rgba(0, 0, 0, 0.55)',
    backdropFilter: 'grayscale(1)',
    WebkitBackdropFilter: 'grayscale(1)',
    pointerEvents: 'none',
    zIndex: '2147483647'
  });

  // Appended to <html> rather than <body>, so a positioned <body> can't offset it
  document.documentElement.appendChild(overlay);

  function isFixedOffscreen(el, rect) {
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      if (getComputedStyle(node).position === 'fixed') {
        return rect.bottom <= 0 || rect.top >= window.innerHeight ||
          rect.right <= 0 || rect.left >= window.innerWidth;
      }
    }
    return false;
  }

  function highlightHeadings() {
    // Measure the document without the overlay inflating it
    overlay.style.display = 'none';
    const root = document.documentElement;
    const docWidth = Math.max(root.scrollWidth, document.body.scrollWidth);
    const docHeight = Math.max(root.scrollHeight, document.body.scrollHeight);
    overlay.style.display = '';
    overlay.style.width = `${docWidth}px`;
    overlay.style.height = `${docHeight}px`;

    // Remove old highlights
    overlay.querySelectorAll('.heading-highlight').forEach(el => el.remove());

    document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(heading => {
      // Skip headings hidden by display/visibility/opacity on themselves or
      // any ancestor (e.g. closed modals)
      if (!heading.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return;

      const rect = heading.getBoundingClientRect();
      // Skip screen-reader-only headings (visually hidden via 1px clipping)
      if (rect.width <= 1 || rect.height <= 1) return;
      // Skip headings in fixed elements parked off-screen (e.g. a dismissed
      // cookie banner slid out via bottom: -150%)
      if (isFixedOffscreen(heading, rect)) return;

      const level = heading.tagName;

      const box = document.createElement('div');
      box.className = 'heading-highlight';

      Object.assign(box.style, {
        position: 'absolute',
        left: `${rect.left + window.scrollX}px`,
        top: `${rect.top + window.scrollY}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        outline: '2px solid #00ff00',
        background: 'rgba(0, 255, 0, 0.12)',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        color: '#00ff00',
        zIndex: '1'
      });

      const label = document.createElement('span');
      label.textContent = level;

      Object.assign(label.style, {
        position: 'absolute',
        top: '0',
        right: '0',
        padding: '2px 5px',
        background: '#000',
        color: '#00ff00',
        font: 'bold 11px/1.2 monospace'
      });

      box.appendChild(label);
      overlay.appendChild(box);
    });
  }

  // Batch updates to one per frame
  let frame = 0;
  function scheduleUpdate() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      highlightHeadings();
    });
  }

  highlightHeadings();

  // Re-align on resize, on scrolling inside inner scroll containers, and when
  // the page grows (e.g. lazy-loaded content revealed while a screenshot scrolls)
  window.addEventListener('resize', scheduleUpdate);
  document.addEventListener('scroll', scheduleUpdate, { capture: true, passive: true });
  const resizeObserver = new ResizeObserver(scheduleUpdate);
  resizeObserver.observe(document.body);

  // Re-check visibility when the page shows/hides things (e.g. a modal opens),
  // ignoring our own overlay's changes to avoid an update loop
  const mutationObserver = new MutationObserver(mutations => {
    if (mutations.some(m => !overlay.contains(m.target) && m.target !== overlay.parentNode)) {
      scheduleUpdate();
    }
  });
  mutationObserver.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'open', 'aria-hidden']
  });

  // Fade-in animations finish without a DOM change, so re-check afterwards
  document.addEventListener('transitionend', scheduleUpdate, true);
  document.addEventListener('animationend', scheduleUpdate, true);

  window.__headingHighlighterCleanup = () => {
    window.removeEventListener('resize', scheduleUpdate);
    document.removeEventListener('scroll', scheduleUpdate, { capture: true });
    document.removeEventListener('transitionend', scheduleUpdate, true);
    document.removeEventListener('animationend', scheduleUpdate, true);
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    cancelAnimationFrame(frame);
    overlay.remove();
    delete window.__headingHighlighterCleanup;
  };
})();
