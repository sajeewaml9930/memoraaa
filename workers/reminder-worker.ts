import prisma from "@/app/lib/prisma";
import { sendDailyReminderEmail } from "@/app/lib/email";

interface ReminderResult {
  sentCount: number;
  errors: string[];
}

export async function processReminderJobs(): Promise<ReminderResult> {
  const result: ReminderResult = { sentCount: 0, errors: [] };

  try {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    // Get all users with reminders enabled and a reminder time set
    const usersWithReminders = await prisma.user.findMany({
      where: {
        dailyReminderEnabled: true,
        dailyReminderTime: { not: null },
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        dailyReminderTime: true,
        lastReminderSent: true,
        timezone: true,
      },
    });

    if (usersWithReminders.length === 0) {
      return result;
    }

    // Process each user
    for (const user of usersWithReminders) {
      try {
        if (!user.dailyReminderTime || !user.email) {
          continue;
        }

        const reminderHours = user.dailyReminderTime.getHours();
        const reminderMinutes = user.dailyReminderTime.getMinutes();

        // Check if current time matches reminder time (within the current minute)
        const isTimeMatched = currentHours === reminderHours && currentMinutes === reminderMinutes;

        if (!isTimeMatched) {
          continue;
        }

        // Check if reminder was already sent today
        const lastReminderSent = user.lastReminderSent;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (lastReminderSent) {
          const lastReminderDate = new Date(lastReminderSent);
          lastReminderDate.setHours(0, 0, 0, 0);

          if (lastReminderDate.getTime() === today.getTime()) {
            // Already sent today, skip
            continue;
          }
        }

        // Send email reminder
        const reminderUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/albums`;
        const userName = user.fullName || user.username || "there";

        const emailResult = await sendDailyReminderEmail({
          to: user.email,
          userName,
          reminderUrl,
        });

        if (emailResult.skipped) {
          console.warn(`Reminder email skipped for user ${user.id}`);
          continue;
        }

        // Create in-app notification
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: "reminder",
            message: "Don't forget to write your memory for today! ✍️",
            read: false,
          },
        });

        // Update lastReminderSent
        await prisma.user.update({
          where: { id: user.id },
          data: { lastReminderSent: now },
        });

        result.sentCount++;
      } catch (userError) {
        const errorMsg = userError instanceof Error ? userError.message : String(userError);
        result.errors.push(`User ${user.id}: ${errorMsg}`);
        console.error(`Failed to process reminder for user ${user.id}:`, userError);
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.errors.push(`General error: ${errorMsg}`);
    console.error("Reminder job failed:", error);
  }

  return result;
}
