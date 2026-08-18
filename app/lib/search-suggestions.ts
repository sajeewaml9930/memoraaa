import prisma from "@/app/lib/prisma";

export const normalizeSearchQuery = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

export const recordPopularSearch = async (query: string) => {
  const normalized = normalizeSearchQuery(query);

  if (!normalized) {
    return;
  }

  try {
    await prisma.popularSearch.upsert({
      where: { query: normalized },
      update: {
        count: { increment: 1 },
        updatedAt: new Date(),
      },
      create: {
        query: normalized,
        count: 1,
      },
    });
  } catch (error) {
    console.error("Error recording popular search:", error);
  }
};
