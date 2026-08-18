(async () => {
  const { createServer } = await import("node:http");
  const { parse } = await import("node:url");
  const next = await import("next");
  const { default: cron } = await import("node-cron");
  const { Server } = await import("socket.io");

  const port = Number.parseInt(process.env.PORT || "3000", 10);
  const dev = process.env.NODE_ENV !== "production";
  const bindHost = process.env.HOST || "0.0.0.0";
  const publicHost = process.env.HOSTNAME || (dev ? "localhost" : "api.domain.org");

  const app = next.default({ dev, hostname: publicHost, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || "/", true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  globalThis.memoraaSocket = io;

  const typingUsersByAlbum = new Map();

  io.on("connection", (socket) => {
    socket.on("join_album", (albumId) => {
      if (!albumId) {
        return;
      }
      socket.join(`album:${albumId}`);
    });

    socket.on("leave_album", (albumId) => {
      if (!albumId) {
        return;
      }

      const normalizedAlbumId = Number(albumId);
      const typingUsers = typingUsersByAlbum.get(normalizedAlbumId);
      if (typingUsers) {
        typingUsers.delete(Number(socket.handshake.query?.userId ?? 0));
        if (typingUsers.size === 0) {
          typingUsersByAlbum.delete(normalizedAlbumId);
        }
      }

      socket.leave(`album:${normalizedAlbumId}`);
    });

    socket.on("typing", (payload) => {
      if (!payload || !payload.albumId || !payload.userId) {
        return;
      }

      const albumId = Number(payload.albumId);
      const userId = Number(payload.userId);
      const userName = typeof payload.userName === "string" && payload.userName.trim() ? payload.userName.trim() : "Someone";

      if (!Number.isFinite(albumId) || !Number.isFinite(userId)) {
        return;
      }

      const roomName = `album:${albumId}`;
      const nextTypingUsers = typingUsersByAlbum.get(albumId) ?? new Map();
      nextTypingUsers.set(userId, { userId, userName });
      typingUsersByAlbum.set(albumId, nextTypingUsers);

      socket.to(roomName).emit("typing", {
        albumId,
        userId,
        userName,
      });
    });

    socket.on("stopped_typing", (payload) => {
      if (!payload || !payload.albumId || !payload.userId) {
        return;
      }

      const albumId = Number(payload.albumId);
      const userId = Number(payload.userId);
      if (!Number.isFinite(albumId) || !Number.isFinite(userId)) {
        return;
      }

      const roomName = `album:${albumId}`;
      const currentTypingUsers = typingUsersByAlbum.get(albumId);
      if (currentTypingUsers) {
        currentTypingUsers.delete(userId);
        if (currentTypingUsers.size === 0) {
          typingUsersByAlbum.delete(albumId);
        }
      }

      socket.to(roomName).emit("stopped_typing", {
        albumId,
        userId,
      });
    });
  });

  const { expireStories } = await import("./workers/expire-stories.js");
  const { processReminderJobs } = await import("./workers/reminder-worker.js");

  try {
    const result = await expireStories();
    if (result.deletedCount > 0) {
      console.log(`Expired ${result.deletedCount} story stories.`);
    }
  } catch (error) {
    console.warn("Startup story expiry check skipped:", error.message || error);
  }

  // Process reminders on startup (in case the server just restarted near a reminder time)
  try {
    const reminderResult = await processReminderJobs();
    if (reminderResult.sentCount > 0) {
      console.log(`Processed ${reminderResult.sentCount} reminder notifications.`);
    }
  } catch (error) {
    console.warn("Startup reminder job skipped:", error.message || error);
  }

  cron.schedule("0 * * * *", async () => {
    try {
      const result = await expireStories();
      if (result.deletedCount > 0) {
        console.log(`Expired ${result.deletedCount} story stories.`);
      }
    } catch (error) {
      console.error("Story expiry job failed:", error);
    }
  });

  // Run reminder job every minute to catch reminders at the exact time
  cron.schedule("* * * * *", async () => {
    try {
      const reminderResult = await processReminderJobs();
      if (reminderResult.sentCount > 0) {
        console.log(`Processed ${reminderResult.sentCount} reminder notifications.`);
      }
      if (reminderResult.errors.length > 0) {
        console.warn("Reminder job errors:", reminderResult.errors);
      }
    } catch (error) {
      console.error("Reminder job failed:", error);
    }
  });

  server.listen(port, bindHost, () => {
    console.log(
      `> Server listening at http://${publicHost}:${port} as ${
        dev ? "development" : process.env.NODE_ENV || "production"
      }`
    );
  });
})().catch((error) => {
  console.error("Failed to start server");
  console.error(error);
  process.exit(1);
});
