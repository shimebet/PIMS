-- CreateTable
CREATE TABLE `ClinicalNote` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `encounterId` VARCHAR(191) NOT NULL,
    `authorUserId` VARCHAR(191) NULL,
    `authorPractitionerId` VARCHAR(191) NULL,
    `noteType` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `content` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `signedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClinicalNote_patientId_idx`(`patientId`),
    INDEX `ClinicalNote_encounterId_idx`(`encounterId`),
    INDEX `ClinicalNote_authorUserId_idx`(`authorUserId`),
    INDEX `ClinicalNote_authorPractitionerId_idx`(`authorPractitionerId`),
    INDEX `ClinicalNote_noteType_idx`(`noteType`),
    INDEX `ClinicalNote_status_idx`(`status`),
    INDEX `ClinicalNote_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MedicationOrder` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `encounterId` VARCHAR(191) NOT NULL,
    `practitionerId` VARCHAR(191) NULL,
    `prescriptionNumber` VARCHAR(191) NOT NULL,
    `medicationCode` VARCHAR(191) NULL,
    `codeSystem` VARCHAR(191) NULL,
    `medicationName` VARCHAR(191) NOT NULL,
    `strength` VARCHAR(191) NULL,
    `dose` DECIMAL(65, 30) NULL,
    `doseUnit` VARCHAR(191) NULL,
    `route` VARCHAR(191) NULL,
    `frequency` VARCHAR(191) NULL,
    `durationDays` INTEGER NULL,
    `quantity` DECIMAL(65, 30) NULL,
    `instructions` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `prescribedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MedicationOrder_prescriptionNumber_key`(`prescriptionNumber`),
    INDEX `MedicationOrder_patientId_idx`(`patientId`),
    INDEX `MedicationOrder_encounterId_idx`(`encounterId`),
    INDEX `MedicationOrder_practitionerId_idx`(`practitionerId`),
    INDEX `MedicationOrder_medicationCode_idx`(`medicationCode`),
    INDEX `MedicationOrder_status_idx`(`status`),
    INDEX `MedicationOrder_prescribedAt_idx`(`prescribedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LabOrder` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `encounterId` VARCHAR(191) NOT NULL,
    `practitionerId` VARCHAR(191) NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'ROUTINE',
    `clinicalInfo` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ORDERED',
    `orderedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LabOrder_orderNumber_key`(`orderNumber`),
    INDEX `LabOrder_patientId_idx`(`patientId`),
    INDEX `LabOrder_encounterId_idx`(`encounterId`),
    INDEX `LabOrder_practitionerId_idx`(`practitionerId`),
    INDEX `LabOrder_status_idx`(`status`),
    INDEX `LabOrder_orderedAt_idx`(`orderedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LabOrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `labOrderId` VARCHAR(191) NOT NULL,
    `testCode` VARCHAR(191) NULL,
    `codeSystem` VARCHAR(191) NULL,
    `testName` VARCHAR(191) NOT NULL,
    `specimenType` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ORDERED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LabOrderItem_labOrderId_idx`(`labOrderId`),
    INDEX `LabOrderItem_testCode_idx`(`testCode`),
    INDEX `LabOrderItem_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LabResult` (
    `id` VARCHAR(191) NOT NULL,
    `labOrderItemId` VARCHAR(191) NOT NULL,
    `valueNumeric` DECIMAL(65, 30) NULL,
    `valueText` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,
    `referenceRangeLow` DECIMAL(65, 30) NULL,
    `referenceRangeHigh` DECIMAL(65, 30) NULL,
    `abnormalFlag` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'FINAL',
    `resultedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `verifiedByUserId` VARCHAR(191) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LabResult_labOrderItemId_key`(`labOrderItemId`),
    INDEX `LabResult_verifiedByUserId_idx`(`verifiedByUserId`),
    INDEX `LabResult_status_idx`(`status`),
    INDEX `LabResult_resultedAt_idx`(`resultedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RadiologyOrder` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `encounterId` VARCHAR(191) NOT NULL,
    `practitionerId` VARCHAR(191) NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `modality` VARCHAR(191) NOT NULL,
    `bodySite` VARCHAR(191) NULL,
    `studyDescription` VARCHAR(191) NOT NULL,
    `clinicalIndication` TEXT NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'ROUTINE',
    `status` VARCHAR(191) NOT NULL DEFAULT 'ORDERED',
    `orderedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RadiologyOrder_orderNumber_key`(`orderNumber`),
    INDEX `RadiologyOrder_patientId_idx`(`patientId`),
    INDEX `RadiologyOrder_encounterId_idx`(`encounterId`),
    INDEX `RadiologyOrder_practitionerId_idx`(`practitionerId`),
    INDEX `RadiologyOrder_modality_idx`(`modality`),
    INDEX `RadiologyOrder_status_idx`(`status`),
    INDEX `RadiologyOrder_orderedAt_idx`(`orderedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RadiologyResult` (
    `id` VARCHAR(191) NOT NULL,
    `radiologyOrderId` VARCHAR(191) NOT NULL,
    `findings` TEXT NULL,
    `impression` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'FINAL',
    `reportedByPractitionerId` VARCHAR(191) NULL,
    `reportedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RadiologyResult_radiologyOrderId_key`(`radiologyOrderId`),
    INDEX `RadiologyResult_reportedByPractitionerId_idx`(`reportedByPractitionerId`),
    INDEX `RadiologyResult_status_idx`(`status`),
    INDEX `RadiologyResult_reportedAt_idx`(`reportedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ClinicalNote` ADD CONSTRAINT `ClinicalNote_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClinicalNote` ADD CONSTRAINT `ClinicalNote_encounterId_fkey` FOREIGN KEY (`encounterId`) REFERENCES `Encounter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClinicalNote` ADD CONSTRAINT `ClinicalNote_authorUserId_fkey` FOREIGN KEY (`authorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClinicalNote` ADD CONSTRAINT `ClinicalNote_authorPractitionerId_fkey` FOREIGN KEY (`authorPractitionerId`) REFERENCES `Practitioner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicationOrder` ADD CONSTRAINT `MedicationOrder_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicationOrder` ADD CONSTRAINT `MedicationOrder_encounterId_fkey` FOREIGN KEY (`encounterId`) REFERENCES `Encounter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicationOrder` ADD CONSTRAINT `MedicationOrder_practitionerId_fkey` FOREIGN KEY (`practitionerId`) REFERENCES `Practitioner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LabOrder` ADD CONSTRAINT `LabOrder_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LabOrder` ADD CONSTRAINT `LabOrder_encounterId_fkey` FOREIGN KEY (`encounterId`) REFERENCES `Encounter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LabOrder` ADD CONSTRAINT `LabOrder_practitionerId_fkey` FOREIGN KEY (`practitionerId`) REFERENCES `Practitioner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LabOrderItem` ADD CONSTRAINT `LabOrderItem_labOrderId_fkey` FOREIGN KEY (`labOrderId`) REFERENCES `LabOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LabResult` ADD CONSTRAINT `LabResult_labOrderItemId_fkey` FOREIGN KEY (`labOrderItemId`) REFERENCES `LabOrderItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LabResult` ADD CONSTRAINT `LabResult_verifiedByUserId_fkey` FOREIGN KEY (`verifiedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RadiologyOrder` ADD CONSTRAINT `RadiologyOrder_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RadiologyOrder` ADD CONSTRAINT `RadiologyOrder_encounterId_fkey` FOREIGN KEY (`encounterId`) REFERENCES `Encounter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RadiologyOrder` ADD CONSTRAINT `RadiologyOrder_practitionerId_fkey` FOREIGN KEY (`practitionerId`) REFERENCES `Practitioner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RadiologyResult` ADD CONSTRAINT `RadiologyResult_radiologyOrderId_fkey` FOREIGN KEY (`radiologyOrderId`) REFERENCES `RadiologyOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RadiologyResult` ADD CONSTRAINT `RadiologyResult_reportedByPractitionerId_fkey` FOREIGN KEY (`reportedByPractitionerId`) REFERENCES `Practitioner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
