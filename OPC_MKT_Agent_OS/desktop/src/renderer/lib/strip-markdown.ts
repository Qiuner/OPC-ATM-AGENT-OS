/**
 * Strip markdown formatting from text, producing clean plain text.
 * Used as a safety net for XHS and other platforms that don't support markdown.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')           // heading markers
    .replace(/\*\*(.+?)\*\*/g, '$1')       // bold
    .replace(/\*(.+?)\*/g, '$1')           // italic
    .replace(/~~(.+?)~~/g, '$1')           // strikethrough
    .replace(/`(.+?)`/g, '$1')             // inline code
    .replace(/^\s*[-*+]\s+/gm, '')         // unordered list markers
    .replace(/^\s*\d+\.\s+/gm, '')         // ordered list markers
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')    // links → text only
    .replace(/!\[.*?\]\(.+?\)/g, '')        // images
    .replace(/^>\s?/gm, '')                // blockquotes
    .replace(/---+/g, '')                  // horizontal rules
    .replace(/\n{3,}/g, '\n\n')            // collapse excess blank lines
    .trim()
}
