const { PrismaClient } = require("@prisma/client");
const nodemailer = require("nodemailer");

const prisma = new PrismaClient();

async function sendDailyReminderEmail({ to, userName, reminderUrl }) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT ?? "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromAddress = process.env.EMAIL_FROM || "noreply@memoraa.app";

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.info("Email delivery skipped: SMTP env vars not configured.");
    return {
      skipped: true,
      message: "Email delivery skipped because SMTP config is not set.",
    };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const info = await transporter.sendMail({
    from: `Memoraa <${fromAddress}>`,
    to,
    subject: "Memoraa Daily Reminder: Write your memory! 📝",
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
        <h2 style="margin-bottom: 12px;">Don't forget to write your memory for today! ✍️</h2>
        <p>Hi ${userName},</p>
        <p>It's time to capture your thoughts and memories from today! Every memory is precious and helps you cherish your journey.</p>
        <p style="margin: 20px 0;">
          <a href="${reminderUrl}" style="display: inline-block; padding: 12px 18px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Write a memory now
          </a>
        </p>
        <p>If the button doesn't work, copy this link:</p>
        <p style="word-break: break-all; color: #374151;">${reminderUrl}</p>
        <p style="margin-top: 20px; font-size: 0.9em; color: #6b7280;">
          You can manage your reminder settings in your profile settings anytime.
        </p>
      </div>
    `,
  });

  return { skipped: false, messageId: info.messageId };
}

async function processReminderJobs() {
  const result = { sentCount: 0, errors: [] };

  try {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

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

    for (const user of usersWithReminders) {
      try {
        if (!user.dailyReminderTime || !user.email) {
          continue;
        }

        const reminderHours = user.dailyReminderTime.getHours();
        const reminderMinutes = user.dailyReminderTime.getMinutes();

        const isTimeMatched = currentHours === reminderHours && currentMinutes === reminderMinutes;

        if (!isTimeMatched) {
          continue;
        }

        const lastReminderSent = user.lastReminderSent;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (lastReminderSent) {
          const lastReminderDate = new Date(lastReminderSent);
          lastReminderDate.setHours(0, 0, 0, 0);

          if (lastReminderDate.getTime() === today.getTime()) {
            continue;
          }
        }

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

        await prisma.notification.create({
          data: {
            userId: user.id,
            type: "reminder",
            message: "Don't forget to write your memory for today! ✍️",
            read: false,
          },
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { lastReminderSent: now },
        });

        result.sentCount += 1;
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

module.exports = { processReminderJobs };
