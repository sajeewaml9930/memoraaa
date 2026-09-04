# PostgreSQL Migration

## 1. Configure PostgreSQL

Create an empty PostgreSQL database and set `DATABASE_URL` in `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
```

URL-encode reserved characters in `USER` or `PASSWORD` (for example, `@` becomes `%40`).

## 2. Install and validate

```bash
npm install --legacy-peer-deps
npx prisma generate
npx prisma validate
```

The project uses `pg`, Prisma Client `5.22.0`, and the PostgreSQL provider in `schema.prisma`.

## 3. Apply the schema

The existing migration files were generated for MySQL and must not be deployed to PostgreSQL. Preserve them outside `prisma/migrations` as a MySQL archive, leaving only the PostgreSQL baseline migration in that directory. Then run:

```bash
npx prisma migrate deploy
```

For a database that already contains the imported schema, mark the baseline as applied instead:

```bash
npx prisma migrate resolve --applied 20260824000000_postgresql_baseline
```

Never run `migrate reset` on a database containing production data.

## 4. Transfer data

For a repeatable migration, use `pgloader` against the empty PostgreSQL database. It converts MySQL tables and data while preserving IDs:

```bash
pgloader mysql://USER:PASSWORD@HOST:3306/DATABASE postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

Alternatively, export/import each table with a script that preserves the existing primary-key values. After importing, reset every serial sequence to the current maximum ID:

```sql
SELECT setval(pg_get_serial_sequence('"User"', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "User";
```

Repeat that statement for each table with an auto-increment `id` column.

## 5. Verify

```bash
npx prisma migrate status
npm run lint
npm run build
```

Exercise authentication, memories, albums, search, notifications, uploads, Socket.IO, and background reminders. PostgreSQL uses case-sensitive quoted table names for the generated baseline, so do not alter table names during import.
