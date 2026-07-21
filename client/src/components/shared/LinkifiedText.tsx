import { Link } from 'react-router-dom';

// One capturing group covering either an @mention or a URL, so String.split
// alternates [plainText, token, plainText, token, ...].
const TOKEN_RE = /(@[a-zA-Z0-9_]+|https?:\/\/\S+)/g;
const TRAILING_PUNCTUATION_RE = /[.,!?;:)\]]+$/;

interface Props {
  text: string;
}

// shadcn's --primary theme var is neutral (near-black/white), not a color —
// mention/link tokens need their own explicit accent to read as clickable.
const LINK_CLASS = 'text-[#208AEF] hover:underline';

// Renders text as-is except for @mentions and bare URLs, which become links.
// Any @word is linked regardless of whether the account exists (same
// behavior as X) — checking existence per-token client-side would mean a
// lookup per mention on every render, which isn't worth it for a cosmetic link.
export function LinkifiedText({ text }: Props) {
  const parts = text.split(TOKEN_RE);

  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;

        if (part.startsWith('@')) {
          return (
            <Link key={i} to={`/u/${part.slice(1)}`} className={LINK_CLASS} onClick={(e) => e.stopPropagation()}>
              {part}
            </Link>
          );
        }

        const trailingMatch = part.match(TRAILING_PUNCTUATION_RE);
        const trailing = trailingMatch ? trailingMatch[0] : '';
        const url = trailing ? part.slice(0, -trailing.length) : part;

        return (
          <span key={i}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS}
              onClick={(e) => e.stopPropagation()}
            >
              {url}
            </a>
            {trailing}
          </span>
        );
      })}
    </>
  );
}
