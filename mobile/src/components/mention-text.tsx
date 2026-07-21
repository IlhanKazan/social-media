import { useRouter } from 'expo-router';
import { Linking, Text } from 'react-native';

// One capturing group covering either an @mention or a URL, so String.split
// alternates [plainText, token, plainText, token, ...].
const TOKEN_RE = /(@[a-zA-Z0-9_]+|https?:\/\/\S+)/g;
const TRAILING_PUNCTUATION_RE = /[.,!?;:)\]]+$/;

interface Props {
  text: string;
  className?: string;
  mentionClassName?: string;
  numberOfLines?: number;
}

// Renders text as-is except for @mentions (navigate to profile) and bare
// URLs (open externally). Any @word is linked regardless of whether the
// account exists (same behavior as X) — no per-token existence check.
export function MentionText({ text, className, mentionClassName = 'text-[#208AEF]', numberOfLines }: Props) {
  const router = useRouter();
  const parts = text.split(TOKEN_RE);

  return (
    <Text className={className} numberOfLines={numberOfLines}>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;

        if (part.startsWith('@')) {
          return (
            <Text key={i} className={mentionClassName} onPress={() => router.push(`/user/${part.slice(1)}`)}>
              {part}
            </Text>
          );
        }

        const trailingMatch = part.match(TRAILING_PUNCTUATION_RE);
        const trailing = trailingMatch ? trailingMatch[0] : '';
        const url = trailing ? part.slice(0, -trailing.length) : part;

        return (
          <Text key={i}>
            <Text className={mentionClassName} onPress={() => void Linking.openURL(url)}>
              {url}
            </Text>
            {trailing}
          </Text>
        );
      })}
    </Text>
  );
}
