-- Add invite-specific notification payload fields.
ALTER TABLE `notifications`
  ADD COLUMN `content` TEXT NULL,
  ADD COLUMN `link` VARCHAR(500) NULL;
