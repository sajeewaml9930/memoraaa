export interface MentionMatch {
  id: number;
  username: string;
}

export function serializeMention(userId: number, username: string): string {
  return `@[${username}](${userId})`;
}

export function parseMentionUsers(content: string): MentionMatch[] {
  const matches: MentionMatch[] = [];
  const mentionPattern = /@\[([^\]]+)\]\((\d+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = mentionPattern.exec(content)) !== null) {
    const username = match[1]?.trim();
    const userId = Number(match[2]);

    if (!username || !Number.isFinite(userId) || userId <= 0) {
      continue;
    }

    matches.push({
      id: userId,
      username,
    });
  }

  return matches;
}

export function renderMentionSegments(content: string): Array<{ type: "text" | "mention"; value: string; userId?: number; username?: string }> {
  const segments: Array<{ type: "text" | "mention"; value: string; userId?: number; username?: string }> = [];
  const mentionPattern = /@\[([^\]]+)\]\((\d+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionPattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }

    const username = match[1]?.trim();
    const userId = Number(match[2]);

    if (username && Number.isFinite(userId) && userId > 0) {
      segments.push({
        type: "mention",
        value: `@${username}`,
        userId,
        username,
      });
    } else {
      segments.push({ type: "text", value: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }

  return segments;
}
