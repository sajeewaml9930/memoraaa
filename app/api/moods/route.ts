import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";

const DEFAULT_MOODS = [
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
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);

    const memories = await prisma.memory.findMany({
      where: {
        userId,
        isArchived: false,
        mood: {
          not: null,
        },
      },
      select: {
        mood: true,
      },
    });

    const distinctMoods = Array.from(
      new Set(
        memories
          .map((memory) => memory.mood)
          .filter((mood): mood is string => Boolean(mood && mood.trim()))
          .map((mood) => mood.trim().toLowerCase())
      )
    ).sort();

    const moods = [...distinctMoods, ...DEFAULT_MOODS].filter(
      (mood, index, list) => list.indexOf(mood) === index && mood.trim().length > 0
    );

    return NextResponse.json({ success: true, data: moods });
  } catch (error) {
    console.error("Error fetching moods:", error);
    return NextResponse.json({ error: "Failed to fetch moods" }, { status: 500 });
  }
}
