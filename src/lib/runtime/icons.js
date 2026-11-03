import markup from '@/design-system/icon-markup.json';
/** Workflow-generated controls use the same Lucide SVGs as React components.
 * No icon font, remote asset request, or runtime React root is required. */
export function mountWorkflowIcons() {
  const fill = (element) => {
    if (!element.matches?.('span.app-icon') || element.querySelector('svg')) return;
    const name = element.textContent.trim();
    if (!name) return;
    element.dataset.iconName = name;
    if (!markup[name]) element.dataset.iconMissing = name;
    element.innerHTML = markup[name] || markup.help;
  };
  const scan = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.parentElement) fill(node.parentElement);
      return;
    }
    fill(node);
    node.querySelectorAll?.('span.app-icon').forEach(fill);
  };
  scan(document);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') scan(record.target);
      else {
        fill(record.target);
        record.addedNodes.forEach(scan);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  return () => observer.disconnect();
}
