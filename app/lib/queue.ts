import Queue from "bull";
import Redis from "redis";

// Create Redis client
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Create queues
export const mediaQueue = new Queue("media-processing", redisUrl);
export const tagQueue = new Queue("ai-tagging", redisUrl);
export const backupQueue = new Queue("backup", redisUrl);
export const emailQueue = new Queue("email", redisUrl);
export const cleanupQueue = new Queue("cleanup", redisUrl);

/**
 * Add a media processing job to the queue
 */
export async function enqueueMediaProcessing(
  memoryId: number,
  filePath: string,
  mediaType: string,
  userId: number
) {
  await mediaQueue.add(
    {
      memoryId,
      filePath,
      mediaType,
      userId,
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: true,
    }
  );
}

/**
 * Add an AI tagging job to the queue
 */
export async function enqueueAITagging(
  memoryId: number,
  filePath: string,
  userId: number
) {
  await tagQueue.add(
    {
      memoryId,
      filePath,
      userId,
    },
    {
      attempts: 2,
      removeOnComplete: true,
    }
  );
}

/**
 * Add a backup job to the queue
 */
export async function enqueueBackup(
  userId: number,
  backupJobId: number
) {
  await backupQueue.add(
    {
      userId,
      backupJobId,
    },
    {
      attempts: 2,
      removeOnComplete: true,
    }
  );
}

/**
 * Add an email job to the queue
 */
export async function enqueueEmail(
  to: string,
  subject: string,
  template: string,
  data: Record<string, any>
) {
  await emailQueue.add(
    {
      to,
      subject,
      template,
      data,
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    }
  );
}

/**
 * Add a cleanup job to the queue
 */
export async function enqueueCleanup() {
  await cleanupQueue.add(
    {},
    {
      repeat: {
        cron: "0 2 * * *", // Run at 2 AM daily
      },
    }
  );
}

/**
 * Process media queue
 */
export async function processMediaQueue(
  handler: (job: any) => Promise<void>
) {
  mediaQueue.process(10, handler); // 10 concurrent jobs
}

/**
 * Process tag queue
 */
export async function processTagQueue(
  handler: (job: any) => Promise<void>
) {
  tagQueue.process(5, handler); // 5 concurrent jobs
}

/**
 * Process backup queue
 */
export async function processBackupQueue(
  handler: (job: any) => Promise<void>
) {
  backupQueue.process(2, handler); // 2 concurrent jobs (backups are resource-intensive)
}

/**
 * Process email queue
 */
export async function processEmailQueue(
  handler: (job: any) => Promise<void>
) {
  emailQueue.process(10, handler); // 10 concurrent jobs
}

/**
 * Process cleanup queue
 */
export async function processCleanupQueue(
  handler: (job: any) => Promise<void>
) {
  cleanupQueue.process(1, handler); // 1 job at a time
}

/**
 * Close all queues
 */
export async function closeQueues() {
  await Promise.all([
    mediaQueue.close(),
    tagQueue.close(),
    backupQueue.close(),
    emailQueue.close(),
    cleanupQueue.close(),
  ]);
}
