/**
 * Injects a lightweight click-interceptor script into a generated HTML string
 * before it's turned into a blob URL for the preview iframe.
 *
 * Without this, clicking any  href="#"  link inside the iframe navigates to
 * blob:https://…#  (the blob URL plus a fragment), which opens a broken page.
 *
 * The script:
 *  - Prevents navigation for empty / hash-only / blob: hrefs
 *  - Opens real http/https links in a new browser tab instead of navigating
 *    the iframe (which would replace the preview)
 */
export function injectLinkGuard(html: string): string {
  const guard = `<script>
(function(){
  document.addEventListener('click', function(e){
    var el = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!el) return;
    var href = el.getAttribute('href') || '';
    // Never navigate to blob: URLs or empty/hash-only hrefs
    if (!href || href === '#' || /^blob:/i.test(href) || /^#/.test(href)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Open external links in a new tab instead of replacing the iframe
    if (/^https?:\/\//i.test(href)) {
      e.preventDefault();
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  }, true);
})();
</script>`;

  // Prefer injecting just before </body> so all DOM is ready
  if (html.includes('</body>')) {
    return html.replace('</body>', guard + '\n</body>');
  }
  // Fallback: append at end
  return html + '\n' + guard;
}
