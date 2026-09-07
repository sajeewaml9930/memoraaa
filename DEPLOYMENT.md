# Memoraa deployment guide

This guide deploys Memoraa on a Linux VM with PostgreSQL, Redis, Nginx, and a
long-running Node.js process. The same requirements apply when using Docker or
another hosting provider.

## Architecture requirements

Memoraa is not a serverless-only application. The production process must stay
running because it serves Next.js, Socket.IO, and the reminder scheduler from
`server.js`.

You need:

- Node.js 20 or newer
- PostgreSQL
- Redis
- A persistent filesystem for encrypted uploads, avatars, and wallpapers
- FFmpeg support is bundled through `ffmpeg-static` and `ffprobe-static`
- A domain name with HTTPS

Do not use an ephemeral filesystem for `LOCAL_STORAGE_DIR`. If the host can
replace the VM or container, mount a persistent disk or change the storage
implementation to object storage before deploying.

## 1. Prepare the server

On an Ubuntu server, install Node.js, PostgreSQL, Redis, and Nginx using your
provider's supported packages. Create a dedicated application user and clone
the repository, for example:

```bash
sudo adduser --system --group memoraa
sudo mkdir -p /opt/memoraa /var/lib/memoraa/uploads
sudo chown -R memoraa:memoraa /opt/memoraa /var/lib/memoraa
sudo -u memoraa git clone YOUR_REPOSITORY_URL /opt/memoraa
cd /opt/memoraa
npm ci
```

Create an empty PostgreSQL database and user. The current Prisma schema uses
the PostgreSQL provider; do not use the archived MySQL migrations.

## 2. Configure environment variables

Create `/opt/memoraa/.env` and set production values:

```env
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
HOSTNAME=your-domain.example

DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/memoraa?schema=public"
NEXTAUTH_URL="https://your-domain.example"
NEXTAUTH_SECRET="generate-a-long-random-secret"
ENCRYPTION_SALT="generate-a-long-random-salt"

LOCAL_STORAGE_DIR=/var/lib/memoraa/uploads
REDIS_URL="redis://127.0.0.1:6379"

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
EMAIL_FROM=noreply@your-domain.example
```

Generate secrets with a password manager or a command such as:

```bash
openssl rand -base64 48
```

Keep `NEXTAUTH_SECRET` and `ENCRYPTION_SALT` unchanged after users have begun
using the application. Changing them can invalidate sessions or make existing
encrypted data unreadable. Never commit `.env`.

## 3. Apply the database schema

From the application directory:

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma migrate status
```

For an existing database that already contains the PostgreSQL baseline, mark
the baseline as applied instead of running a reset:

```bash
npx prisma migrate resolve --applied 20260824000000_postgresql_baseline
```

Never run `npx prisma migrate reset` against production data.

## 4. Build and test the application

```bash
npm run lint
npm run build
```

Start the production server manually once to verify configuration:

```bash
npm start
```

The server listens on `127.0.0.1:3000` with the example settings. Verify that
the login page loads, registration email delivery works, uploads survive a
restart, and Socket.IO connections work before adding Nginx.

## 5. Run with systemd

Create `/etc/systemd/system/memoraa.service`:

```ini
[Unit]
Description=Memoraa
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=memoraa
Group=memoraa
WorkingDirectory=/opt/memoraa
EnvironmentFile=/opt/memoraa/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable it and inspect the logs:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now memoraa
sudo systemctl status memoraa
sudo journalctl -u memoraa -f
```

## 6. Configure Nginx and HTTPS

Create an Nginx site for the domain. The WebSocket headers are required for
real-time album updates and typing indicators.

```nginx
server {
    listen 80;
    server_name your-domain.example;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }
}
```

Enable the site, test Nginx, and obtain a certificate with Certbot or your
hosting provider's managed TLS service:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.example
```

After HTTPS is active, set `NEXTAUTH_URL` to the HTTPS URL, restart Memoraa,
and test sign-in again.

## 7. Backups and upgrades

Back up both the PostgreSQL database and `LOCAL_STORAGE_DIR`; backing up only
the database loses uploaded media. Before an upgrade:

```bash
sudo systemctl stop memoraa
sudo -u memoraa git pull
sudo -u memoraa npm ci
sudo -u memoraa npx prisma migrate deploy
sudo -u memoraa npm run build
sudo systemctl start memoraa
```

After an upgrade, check `systemctl status memoraa`, application logs, login,
uploads, media playback, email verification, and Socket.IO behavior.

## Hosting notes

- A VPS, Docker host, or platform that supports persistent Node processes is a
  good fit.
- A purely serverless deployment is not a drop-in fit because the custom server,
  Socket.IO connection, cron scheduler, Redis queues, and local uploads need
  persistent infrastructure.
- If deploying multiple application instances, move uploads to shared/object
  storage and add a Socket.IO Redis adapter. The current in-memory Socket.IO
  rooms and reminder scheduler assume one application process.
