-- CreateTable
CREATE TABLE `WebAdPlacement` (
    `id` VARCHAR(191) NOT NULL,
    `siteKey` VARCHAR(80) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WebAdPlacement_siteKey_isActive_idx`(`siteKey`, `isActive`),
    UNIQUE INDEX `WebAdPlacement_siteKey_key_key`(`siteKey`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WebAdCampaign` (
    `id` VARCHAR(191) NOT NULL,
    `placementId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `kind` ENUM('LOCAL_IMAGE', 'ADSENSE', 'GAM') NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `mediaAssetId` VARCHAR(191) NULL,
    `destinationUrl` TEXT NULL,
    `altText` VARCHAR(300) NULL,
    `providerClient` VARCHAR(150) NULL,
    `providerSlot` VARCHAR(200) NULL,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `weight` INTEGER NOT NULL DEFAULT 1,
    `languageCode` VARCHAR(16) NULL,
    `pagePrefix` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WebAdCampaign_placementId_status_priority_idx`(`placementId`, `status`, `priority`),
    INDEX `WebAdCampaign_startsAt_endsAt_idx`(`startsAt`, `endsAt`),
    INDEX `WebAdCampaign_languageCode_idx`(`languageCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WebAdEvent` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `tokenId` VARCHAR(64) NOT NULL,
    `kind` ENUM('IMPRESSION', 'CLICK') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WebAdEvent_campaignId_kind_createdAt_idx`(`campaignId`, `kind`, `createdAt`),
    INDEX `WebAdEvent_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `WebAdEvent_campaignId_tokenId_kind_key`(`campaignId`, `tokenId`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WebAdCampaign` ADD CONSTRAINT `WebAdCampaign_placementId_fkey` FOREIGN KEY (`placementId`) REFERENCES `WebAdPlacement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WebAdEvent` ADD CONSTRAINT `WebAdEvent_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `WebAdCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

