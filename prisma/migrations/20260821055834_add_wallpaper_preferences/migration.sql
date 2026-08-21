/*
  Warnings:

  - You are about to drop the column `chat_wallpaper` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user` DROP COLUMN `chat_wallpaper`,
    ADD COLUMN `wallpaper_image_path` VARCHAR(500) NULL,
    ADD COLUMN `wallpaper_type` VARCHAR(20) NOT NULL DEFAULT 'default',
    ADD COLUMN `wallpaper_value` VARCHAR(120) NULL;
