export const MOOD_OPTIONS = [
  "happy",
  "sad",
  "excited",
  "angry",
  "anxious",
  "grateful",
  "neutral",
  "tired",
  "loved",
  "hopeful",
  "calm",
  "nostalgic",
  "reflective",
] as const;

export type MoodValue = (typeof MOOD_OPTIONS)[number];

export const MOOD_META: Record<MoodValue, { label: string; emoji: string; score: number; positive: boolean }> = {
  happy: { label: "Happy", emoji: "😊", score: 5, positive: true },
  sad: { label: "Sad", emoji: "😢", score: 2, positive: false },
  excited: { label: "Excited", emoji: "🤩", score: 5, positive: true },
  angry: { label: "Angry", emoji: "😡", score: 1, positive: false },
  anxious: { label: "Anxious", emoji: "😰", score: 2, positive: false },
  grateful: { label: "Grateful", emoji: "🙏", score: 5, positive: true },
  neutral: { label: "Neutral", emoji: "😐", score: 3, positive: false },
  tired: { label: "Tired", emoji: "😴", score: 2, positive: false },
  loved: { label: "Loved", emoji: "❤️", score: 5, positive: true },
  hopeful: { label: "Hopeful", emoji: "🤗", score: 4, positive: true },
  calm: { label: "Calm", emoji: "😌", score: 4, positive: true },
  nostalgic: { label: "Nostalgic", emoji: "🕰️", score: 3, positive: false },
  reflective: { label: "Reflective", emoji: "💭", score: 3, positive: false },
};

export const MOOD_EMOJI_MAP = Object.fromEntries(
  Object.entries(MOOD_META).map(([key, value]) => [key, value.emoji])
) as Record<MoodValue, string>;

export function normalizeMood(value?: string | null): MoodValue | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return MOOD_OPTIONS.includes(normalized as MoodValue) ? (normalized as MoodValue) : null;
}

export function getMoodDisplay(value?: string | null): { mood: MoodValue; emoji: string; label: string; score: number; positive: boolean } | null {
  const mood = normalizeMood(value);
  if (!mood) {
    return null;
  }

  return {
    mood,
    ...MOOD_META[mood],
  };
}

export function getMoodScore(value?: string | null): number {
  const mood = normalizeMood(value);
  if (!mood) {
    return 0;
  }

  return MOOD_META[mood].score;
}
