import nodemailer from "nodemailer";

interface SendAlbumInvitationEmailInput {
  to: string;
  albumName: string;
  inviterName: string;
  inviteUrl: string;
  permission: string;
}

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT ?? "587");
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromAddress = process.env.EMAIL_FROM || "noreply@memoraa.app";

export async function sendAlbumInvitationEmail({
  to,
  albumName,
  inviterName,
  inviteUrl,
  permission,
}: SendAlbumInvitationEmailInput) {
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
    subject: `${inviterName} invited you to collaborate on ${albumName}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
        <h2 style="margin-bottom: 12px;">You’re invited to join ${albumName}</h2>
        <p>${inviterName} has invited you to collaborate on this album with <strong>${permission}</strong> access.</p>
        <p>Click the button below to review and accept the invitation.</p>
        <p style="margin: 20px 0;">
          <a href="${inviteUrl}" style="display: inline-block; padding: 12px 18px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Accept invitation
          </a>
        </p>
        <p>If the button doesn’t work, copy this link:</p>
        <p style="word-break: break-all; color: #374151;">${inviteUrl}</p>
      </div>
    `,
  });

  return { skipped: false, messageId: info.messageId };
}

interface SendDailyReminderEmailInput {
  to: string;
  userName: string;
  reminderUrl: string;
}

export async function sendDailyReminderEmail({
  to,
  userName,
  reminderUrl,
}: SendDailyReminderEmailInput) {
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
