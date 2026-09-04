/*
  Warnings:

  - You are about to drop the column `expires_at` on the `memories` table. All the data in the column will be lost.
  - You are about to drop the column `is_story` on the `memories` table. All the data in the column will be lost.
  - You are about to drop the `story_views` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `story_views` DROP FOREIGN KEY `story_views_memory_id_fkey`;

-- DropForeignKey
ALTER TABLE `story_views` DROP FOREIGN KEY `story_views_user_id_fkey`;

-- AlterTable
ALTER TABLE `memories` DROP COLUMN `expires_at`,
    DROP COLUMN `is_story`;

-- DropTable
DROP TABLE `story_views`;
