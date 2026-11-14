-- AlterTable
ALTER TABLE `NotificationDelivery` ADD COLUMN `acknowledgedAt` DATETIME(3) NULL,
    ADD COLUMN `claimVersion` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `lockOwner` VARCHAR(100) NULL,
    ADD COLUMN `lockedUntil` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `NotificationDelivery_status_lockedUntil_idx` ON `NotificationDelivery`(`status`, `lockedUntil`);
