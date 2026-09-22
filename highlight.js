(() => {
  // Clicking the extension again turns the highlights off
  if (window.__headingHighlighterCleanup) {
    window.__headingHighlighterCleanup();
    return;
  }

  document.getElementById('heading-debug-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'heading-debug-overlay';

  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0, 0, 0, 0.55)',
    backdropFilter: 'grayscale(1)',
    WebkitBackdropFilter: 'grayscale(1)',
    pointerEvents: 'none',
    zIndex: '2147483647'
  });

  document.body.appendChild(overlay);

  function highlightHeadings() {
    // Remove old highlights
    overlay.querySelectorAll('.heading-highlight').forEach(el => el.remove());

    document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(heading => {
      const rect = heading.getBoundingClientRect();
      const level = heading.tagName;

      const box = document.createElement('div');
      box.className = 'heading-highlight';

      Object.assign(box.style, {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
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

  highlightHeadings();

  // Keep highlights aligned while scrolling/resizing
  window.addEventListener('scroll', highlightHeadings, { passive: true });
  window.addEventListener('resize', highlightHeadings);

  window.__headingHighlighterCleanup = () => {
    window.removeEventListener('scroll', highlightHeadings);
    window.removeEventListener('resize', highlightHeadings);
    overlay.remove();
    delete window.__headingHighlighterCleanup;
  };
})();
