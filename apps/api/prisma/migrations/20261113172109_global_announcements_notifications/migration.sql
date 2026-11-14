-- AlterTable
ALTER TABLE `pendingemailregistration` ADD COLUMN `consentPolicyVersion` VARCHAR(40) NULL,
    ADD COLUMN `marketingEmailOptIn` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `marketingSmsOptIn` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `marketingWhatsappOptIn` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `phoneNumber` VARCHAR(20) NULL;

-- AlterTable
ALTER TABLE `subscription` ADD COLUMN `cancelAtPeriodEnd` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `cancelRequestedAt` DATETIME(3) NULL,
    ADD COLUMN `cancellationReason` VARCHAR(500) NULL,
    ADD COLUMN `cancelledAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `phoneNumber` VARCHAR(20) NULL;

-- CreateTable
CREATE TABLE `ConsentPolicy` (
    `id` VARCHAR(191) NOT NULL,
    `version` VARCHAR(40) NOT NULL,
    `title` VARCHAR(180) NOT NULL,
    `documentUrl` TEXT NULL,
    `contentHash` VARCHAR(64) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `effectiveAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ConsentPolicy_version_key`(`version`),
    INDEX `ConsentPolicy_isActive_effectiveAt_idx`(`isActive`, `effectiveAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingConsent` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `policyId` VARCHAR(191) NULL,
    `channel` ENUM('WEBSITE_BANNER', 'IN_APP', 'NOTIFICATION_BELL', 'EMAIL', 'MOBILE_PUSH', 'WEB_PUSH', 'WHATSAPP', 'SMS') NOT NULL,
    `purpose` ENUM('MARKETING', 'TRANSACTIONAL', 'SYSTEM') NOT NULL DEFAULT 'MARKETING',
    `granted` BOOLEAN NOT NULL DEFAULT false,
    `source` VARCHAR(80) NOT NULL,
    `policyVersion` VARCHAR(40) NOT NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `metadata` JSON NULL,

    INDEX `MarketingConsent_userId_channel_purpose_recordedAt_idx`(`userId`, `channel`, `purpose`, `recordedAt`),
    INDEX `MarketingConsent_channel_purpose_granted_idx`(`channel`, `purpose`, `granted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationPreference` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `channel` ENUM('WEBSITE_BANNER', 'IN_APP', 'NOTIFICATION_BELL', 'EMAIL', 'MOBILE_PUSH', 'WEB_PUSH', 'WHATSAPP', 'SMS') NOT NULL,
    `purpose` ENUM('MARKETING', 'TRANSACTIONAL', 'SYSTEM') NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NotificationPreference_userId_channel_purpose_key`(`userId`, `channel`, `purpose`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationProviderConfig` (
    `id` VARCHAR(191) NOT NULL,
    `channel` ENUM('WEBSITE_BANNER', 'IN_APP', 'NOTIFICATION_BELL', 'EMAIL', 'MOBILE_PUSH', 'WEB_PUSH', 'WHATSAPP', 'SMS') NOT NULL,
    `providerKey` VARCHAR(80) NOT NULL,
    `displayName` VARCHAR(120) NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT false,
    `isTestMode` BOOLEAN NOT NULL DEFAULT true,
    `credentialRef` VARCHAR(191) NULL,
    `settingsJson` JSON NULL,
    `lastCheckedAt` DATETIME(3) NULL,
    `lastCheckOk` BOOLEAN NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `NotificationProviderConfig_channel_isEnabled_idx`(`channel`, `isEnabled`),
    UNIQUE INDEX `NotificationProviderConfig_channel_providerKey_key`(`channel`, `providerKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `templateKey` VARCHAR(100) NOT NULL,
    `channel` ENUM('WEBSITE_BANNER', 'IN_APP', 'NOTIFICATION_BELL', 'EMAIL', 'MOBILE_PUSH', 'WEB_PUSH', 'WHATSAPP', 'SMS') NOT NULL,
    `purpose` ENUM('MARKETING', 'TRANSACTIONAL', 'SYSTEM') NOT NULL DEFAULT 'MARKETING',
    `providerConfigId` VARCHAR(191) NULL,
    `providerTemplateId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `parametersJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NotificationTemplate_templateKey_key`(`templateKey`),
    INDEX `NotificationTemplate_channel_purpose_isActive_idx`(`channel`, `purpose`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationTemplateTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(16) NOT NULL,
    `title` VARCHAR(220) NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NotificationTemplateTranslation_templateId_locale_key`(`templateId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AudienceSegment` (
    `id` VARCHAR(191) NOT NULL,
    `segmentKey` VARCHAR(100) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `rulesVersion` INTEGER NOT NULL DEFAULT 1,
    `rulesJson` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AudienceSegment_segmentKey_key`(`segmentKey`),
    INDEX `AudienceSegment_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Announcement` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `kind` ENUM('PROMOTION', 'COURSE_UPDATE', 'SUBSCRIPTION', 'MAINTENANCE', 'SECURITY', 'GENERAL') NOT NULL DEFAULT 'GENERAL',
    `purpose` ENUM('MARKETING', 'TRANSACTIONAL', 'SYSTEM') NOT NULL DEFAULT 'MARKETING',
    `status` ENUM('DRAFT', 'SCHEDULED', 'PUBLISHED', 'PAUSED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `priority` INTEGER NOT NULL DEFAULT 0,
    `isDismissible` BOOLEAN NOT NULL DEFAULT true,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `actionType` VARCHAR(40) NULL,
    `actionValue` TEXT NULL,
    `imageAssetId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Announcement_slug_key`(`slug`),
    INDEX `Announcement_status_startsAt_endsAt_idx`(`status`, `startsAt`, `endsAt`),
    INDEX `Announcement_kind_priority_idx`(`kind`, `priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnnouncementTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `announcementId` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(16) NOT NULL,
    `title` VARCHAR(220) NOT NULL,
    `message` TEXT NOT NULL,
    `actionLabel` VARCHAR(120) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AnnouncementTranslation_announcementId_locale_key`(`announcementId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnnouncementPlacement` (
    `id` VARCHAR(191) NOT NULL,
    `announcementId` VARCHAR(191) NOT NULL,
    `channel` ENUM('WEBSITE_BANNER', 'IN_APP', 'NOTIFICATION_BELL', 'EMAIL', 'MOBILE_PUSH', 'WEB_PUSH', 'WHATSAPP', 'SMS') NOT NULL,
    `placementKey` VARCHAR(100) NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `displayRulesJson` JSON NULL,

    INDEX `AnnouncementPlacement_channel_placementKey_isEnabled_idx`(`channel`, `placementKey`, `isEnabled`),
    UNIQUE INDEX `AnnouncementPlacement_announcementId_channel_placementKey_key`(`announcementId`, `channel`, `placementKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnnouncementTarget` (
    `id` VARCHAR(191) NOT NULL,
    `announcementId` VARCHAR(191) NOT NULL,
    `segmentId` VARCHAR(191) NOT NULL,
    `exclude` BOOLEAN NOT NULL DEFAULT false,

    INDEX `AnnouncementTarget_segmentId_exclude_idx`(`segmentId`, `exclude`),
    UNIQUE INDEX `AnnouncementTarget_announcementId_segmentId_key`(`announcementId`, `segmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnnouncementPromotion` (
    `id` VARCHAR(191) NOT NULL,
    `announcementId` VARCHAR(191) NOT NULL,
    `promoCodeId` VARCHAR(191) NOT NULL,

    INDEX `AnnouncementPromotion_promoCodeId_idx`(`promoCodeId`),
    UNIQUE INDEX `AnnouncementPromotion_announcementId_promoCodeId_key`(`announcementId`, `promoCodeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserNotification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `announcementId` VARCHAR(191) NOT NULL,
    `readAt` DATETIME(3) NULL,
    `dismissedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserNotification_userId_readAt_createdAt_idx`(`userId`, `readAt`, `createdAt`),
    UNIQUE INDEX `UserNotification_userId_announcementId_key`(`userId`, `announcementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PushDevice` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `channel` ENUM('WEBSITE_BANNER', 'IN_APP', 'NOTIFICATION_BELL', 'EMAIL', 'MOBILE_PUSH', 'WEB_PUSH', 'WHATSAPP', 'SMS') NOT NULL,
    `platform` VARCHAR(30) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `tokenCiphertext` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastSeenAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PushDevice_tokenHash_key`(`tokenHash`),
    INDEX `PushDevice_userId_channel_isActive_idx`(`userId`, `channel`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `announcementId` VARCHAR(191) NULL,
    `templateId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `providerConfigId` VARCHAR(191) NULL,
    `channel` ENUM('WEBSITE_BANNER', 'IN_APP', 'NOTIFICATION_BELL', 'EMAIL', 'MOBILE_PUSH', 'WEB_PUSH', 'WHATSAPP', 'SMS') NOT NULL,
    `purpose` ENUM('MARKETING', 'TRANSACTIONAL', 'SYSTEM') NOT NULL,
    `status` ENUM('QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED', 'CANCELLED') NOT NULL DEFAULT 'QUEUED',
    `dedupeKey` VARCHAR(191) NOT NULL,
    `recipientHash` VARCHAR(64) NULL,
    `providerMessageId` VARCHAR(191) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 3,
    `scheduledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `nextRetryAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `errorCode` VARCHAR(100) NULL,
    `errorMessage` TEXT NULL,
    `payloadJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NotificationDelivery_dedupeKey_key`(`dedupeKey`),
    INDEX `NotificationDelivery_status_scheduledAt_nextRetryAt_idx`(`status`, `scheduledAt`, `nextRetryAt`),
    INDEX `NotificationDelivery_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `NotificationDelivery_providerMessageId_idx`(`providerMessageId`),
    INDEX `NotificationDelivery_announcementId_channel_idx`(`announcementId`, `channel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnnouncementInteraction` (
    `id` VARCHAR(191) NOT NULL,
    `announcementId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `kind` ENUM('VIEW', 'CLICK', 'DISMISS') NOT NULL,
    `dedupeKey` VARCHAR(191) NULL,
    `contextJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AnnouncementInteraction_dedupeKey_key`(`dedupeKey`),
    INDEX `AnnouncementInteraction_announcementId_kind_createdAt_idx`(`announcementId`, `kind`, `createdAt`),
    INDEX `AnnouncementInteraction_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubscriptionCancellationRequest` (
    `id` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NOT NULL,
    `status` ENUM('REQUESTED', 'PROCESSING', 'CONFIRMED', 'FAILED') NOT NULL DEFAULT 'REQUESTED',
    `initiatedBy` VARCHAR(30) NOT NULL DEFAULT 'USER',
    `reason` VARCHAR(500) NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `providerReference` VARCHAR(191) NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmedAt` DATETIME(3) NULL,
    `errorCode` VARCHAR(100) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SubscriptionCancellationRequest_idempotencyKey_key`(`idempotencyKey`),
    INDEX `SubscriptionCancellationRequest_subscriptionId_status_reques_idx`(`subscriptionId`, `status`, `requestedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefundRequest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NULL,
    `status` ENUM('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PROCESSING', 'REFUNDED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'REQUESTED',
    `reason` TEXT NOT NULL,
    `adminNote` TEXT NULL,
    `amountMinor` BIGINT NOT NULL,
    `currency` VARCHAR(3) NOT NULL,
    `providerRefundId` VARCHAR(191) NULL,
    `reviewedByAdminId` VARCHAR(191) NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RefundRequest_userId_status_requestedAt_idx`(`userId`, `status`, `requestedAt`),
    INDEX `RefundRequest_paymentId_status_idx`(`paymentId`, `status`),
    INDEX `RefundRequest_subscriptionId_idx`(`subscriptionId`),
    INDEX `RefundRequest_providerRefundId_idx`(`providerRefundId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `User_phoneNumber_idx` ON `User`(`phoneNumber`);

-- AddForeignKey
ALTER TABLE `MarketingConsent` ADD CONSTRAINT `MarketingConsent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingConsent` ADD CONSTRAINT `MarketingConsent_policyId_fkey` FOREIGN KEY (`policyId`) REFERENCES `ConsentPolicy`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationPreference` ADD CONSTRAINT `NotificationPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationTemplate` ADD CONSTRAINT `NotificationTemplate_providerConfigId_fkey` FOREIGN KEY (`providerConfigId`) REFERENCES `NotificationProviderConfig`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationTemplateTranslation` ADD CONSTRAINT `NotificationTemplateTranslation_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `NotificationTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Announcement` ADD CONSTRAINT `Announcement_imageAssetId_fkey` FOREIGN KEY (`imageAssetId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnnouncementTranslation` ADD CONSTRAINT `AnnouncementTranslation_announcementId_fkey` FOREIGN KEY (`announcementId`) REFERENCES `Announcement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnnouncementPlacement` ADD CONSTRAINT `AnnouncementPlacement_announcementId_fkey` FOREIGN KEY (`announcementId`) REFERENCES `Announcement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnnouncementTarget` ADD CONSTRAINT `AnnouncementTarget_announcementId_fkey` FOREIGN KEY (`announcementId`) REFERENCES `Announcement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnnouncementTarget` ADD CONSTRAINT `AnnouncementTarget_segmentId_fkey` FOREIGN KEY (`segmentId`) REFERENCES `AudienceSegment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnnouncementPromotion` ADD CONSTRAINT `AnnouncementPromotion_announcementId_fkey` FOREIGN KEY (`announcementId`) REFERENCES `Announcement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnnouncementPromotion` ADD CONSTRAINT `AnnouncementPromotion_promoCodeId_fkey` FOREIGN KEY (`promoCodeId`) REFERENCES `PromoCode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserNotification` ADD CONSTRAINT `UserNotification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserNotification` ADD CONSTRAINT `UserNotification_announcementId_fkey` FOREIGN KEY (`announcementId`) REFERENCES `Announcement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PushDevice` ADD CONSTRAINT `PushDevice_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationDelivery` ADD CONSTRAINT `NotificationDelivery_announcementId_fkey` FOREIGN KEY (`announcementId`) REFERENCES `Announcement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationDelivery` ADD CONSTRAINT `NotificationDelivery_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `NotificationTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationDelivery` ADD CONSTRAINT `NotificationDelivery_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationDelivery` ADD CONSTRAINT `NotificationDelivery_providerConfigId_fkey` FOREIGN KEY (`providerConfigId`) REFERENCES `NotificationProviderConfig`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnnouncementInteraction` ADD CONSTRAINT `AnnouncementInteraction_announcementId_fkey` FOREIGN KEY (`announcementId`) REFERENCES `Announcement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnnouncementInteraction` ADD CONSTRAINT `AnnouncementInteraction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubscriptionCancellationRequest` ADD CONSTRAINT `SubscriptionCancellationRequest_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundRequest` ADD CONSTRAINT `RefundRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundRequest` ADD CONSTRAINT `RefundRequest_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `PaymentTransaction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundRequest` ADD CONSTRAINT `RefundRequest_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundRequest` ADD CONSTRAINT `RefundRequest_reviewedByAdminId_fkey` FOREIGN KEY (`reviewedByAdminId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
