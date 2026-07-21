const ACTIVE_MENTION_RE = /(?:^|\s)@([a-zA-Z0-9_]*)$/;

// Returns the partial username being typed right before the cursor (without
// the '@'), or null if the cursor isn't inside an active @mention token.
export function getActiveMentionQuery(text: string, cursor: number): string | null {
  const upToCursor = text.slice(0, cursor);
  const match = upToCursor.match(ACTIVE_MENTION_RE);
  return match ? match[1] : null;
}

export function insertMention(
  text: string,
  cursor: number,
  username: string
): { text: string; cursor: number } {
  const upToCursor = text.slice(0, cursor);
  const match = upToCursor.match(ACTIVE_MENTION_RE);
  if (!match) return { text, cursor };

  const start = cursor - match[1].length - 1;
  const before = text.slice(0, start);
  const after = text.slice(cursor);
  const inserted = `@${username} `;

  return { text: before + inserted + after, cursor: (before + inserted).length };
}
