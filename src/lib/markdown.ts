/**
 * Simple markdown parser for chat messages.
 * Supports: **bold**, *italic*, `code`, [link](url), auto-URL linking.
 * Returns sanitized HTML string.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function parseMarkdown(text: string): string {
  let html = escapeHtml(text);

  // Code blocks (inline): `code`
  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-zinc-800 text-emerald-400 rounded text-[13px] font-mono">$1</code>');

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic: *text* (but not inside **)
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

  // Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline underline-offset-2">$1</a>'
  );

  // Auto-link URLs (not already inside href="...")
  html = html.replace(
    /(?<!href="|">)(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline underline-offset-2">$1</a>'
  );

  return html;
}
