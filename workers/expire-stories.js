const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function expireStories() {
  const now = new Date();

  try {
    const expiredStories = await prisma.memory.findMany({
      where: {
        isStory: true,
        expiresAt: { lt: now },
      },
      select: { id: true },
    });

    if (!expiredStories.length) {
      return { deletedCount: 0 };
    }

    const ids = expiredStories.map((story) => story.id);

    await prisma.storyView.deleteMany({
      where: { memoryId: { in: ids } },
    });

    await prisma.memory.deleteMany({
      where: { id: { in: ids } },
    });

    return { deletedCount: ids.length };
  } catch (error) {
    console.warn("Story expiry job skipped because the database is unavailable:", error.message || error);
    return { deletedCount: 0 };
  }
}

module.exports = { expireStories };
