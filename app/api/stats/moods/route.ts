import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { MOOD_META, type MoodValue, normalizeMood } from "@/app/lib/moods";

const MOOD_SCORES: Record<MoodValue, number> = Object.fromEntries(
  Object.entries(MOOD_META).map(([key, meta]) => [key as MoodValue, meta.score])
) as Record<MoodValue, number>;

export async function GET() {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const memories = await prisma.memory.findMany({
      where: {
        userId,
        mood: { not: null },
      },
      select: {
        mood: true,
        memoryDate: true,
      },
    });

    const cleaned: Array<{ mood: MoodValue; date: Date }> = memories.flatMap((memory) => {
      const mood = normalizeMood(memory.mood);
      if (!mood) {
        return [];
      }

      return [{ mood, date: new Date(memory.memoryDate) }];
    });

    const distributionMap = new Map<MoodValue, number>();
    const timelineMap = new Map<string, { scoreTotal: number; count: number; moods: Partial<Record<MoodValue, number>> }>();

    for (const entry of cleaned) {
      distributionMap.set(entry.mood, (distributionMap.get(entry.mood) ?? 0) + 1);

      const dateKey = new Date(entry.date).toISOString().slice(0, 10);
      const current = timelineMap.get(dateKey) ?? { scoreTotal: 0, count: 0, moods: {} };

      current.scoreTotal += MOOD_SCORES[entry.mood] ?? 3;
      current.count += 1;
      current.moods[entry.mood] = (current.moods[entry.mood] ?? 0) + 1;
      timelineMap.set(dateKey, current);
    }

    const distribution = Array.from(distributionMap.entries())
      .map(([mood, count]) => {
        const meta = MOOD_META[mood as keyof typeof MOOD_META];
        return {
          mood,
          count,
          percentage: cleaned.length === 0 ? 0 : Number(((count / cleaned.length) * 100).toFixed(1)),
          emoji: meta?.emoji ?? "✨",
          label: meta?.label ?? mood,
        };
      })
      .sort((a, b) => b.count - a.count || a.mood.localeCompare(b.mood));

    const timeline = Array.from(timelineMap.entries())
      .map(([date, data]) => {
        const dominantMood = (Object.entries(data.moods).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null) as MoodValue | null;
        return {
          date,
          averageScore: data.count === 0 ? 0 : Number((data.scoreTotal / data.count).toFixed(1)),
          dominantMood,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const mostCommon = distribution[0] ?? null;
    const totalWithMood = cleaned.length;

    const dateKeys = Array.from(new Set(cleaned.map(({ date }) => new Date(date).toISOString().slice(0, 10)))).sort();
    let longestAnyStreak = 0;
    let currentAnyStreak = 0;
    let previousDate: Date | null = null;

    for (const dateKey of dateKeys) {
      const currentDate = new Date(`${dateKey}T00:00:00.000Z`);
      if (!previousDate) {
        currentAnyStreak = 1;
      } else {
        const diffDays = Math.round((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
        currentAnyStreak = diffDays === 1 ? currentAnyStreak + 1 : 1;
      }

      longestAnyStreak = Math.max(longestAnyStreak, currentAnyStreak);
      previousDate = currentDate;
    }

    const positiveDates = new Map<string, boolean>();
    for (const [dateKey, data] of timelineMap.entries()) {
      const dominantMood = (Object.entries(data.moods).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null) as MoodValue | null;
      positiveDates.set(dateKey, !!dominantMood && (MOOD_META[dominantMood]?.positive ?? false));
    }

    const positiveDateKeys = Array.from(positiveDates.entries())
      .filter(([, isPositive]) => isPositive)
      .map(([dateKey]) => dateKey)
      .sort();

    let longestPositiveStreak = 0;
    let currentPositiveStreak = 0;
    let previousPositiveDate: Date | null = null;

    for (const dateKey of positiveDateKeys) {
      const currentDate = new Date(`${dateKey}T00:00:00.000Z`);
      if (!previousPositiveDate) {
        currentPositiveStreak = 1;
      } else {
        const diffDays = Math.round((currentDate.getTime() - previousPositiveDate.getTime()) / (1000 * 60 * 60 * 24));
        currentPositiveStreak = diffDays === 1 ? currentPositiveStreak + 1 : 1;
      }

      longestPositiveStreak = Math.max(longestPositiveStreak, currentPositiveStreak);
      previousPositiveDate = currentDate;
    }

    return NextResponse.json({
      success: true,
      data: {
        distribution,
        timeline,
        totalWithMood,
        streak: {
          longestAnyStreak,
          longestPositiveStreak,
        },
        summary: {
          mostCommonMood: mostCommon
            ? {
                mood: mostCommon.mood,
                emoji: mostCommon.emoji,
                label: mostCommon.label,
                percentage: mostCommon.percentage,
              }
            : null,
          totalMoodsTracked: totalWithMood,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching mood stats:", error);
    return NextResponse.json({ error: "Failed to load mood statistics" }, { status: 500 });
  }
}
