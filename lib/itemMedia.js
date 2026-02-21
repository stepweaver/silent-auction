/**
 * Returns true if the URL points to a PDF (by path/extension).
 * Used to decide whether to render an image or a PDF link/embed.
 */
export function isPdfUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /\.pdf(\?|$)/i.test(url);
}
