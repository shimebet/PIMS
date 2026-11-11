-- CreateTable
CREATE TABLE `Encounter` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `facilityId` VARCHAR(191) NOT NULL,
    `practitionerId` VARCHAR(191) NULL,
    `encounterNumber` VARCHAR(191) NOT NULL,
    `encounterType` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'IN_PROGRESS',
    `reasonForVisit` VARCHAR(191) NULL,
    `chiefComplaint` VARCHAR(191) NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Encounter_encounterNumber_key`(`encounterNumber`),
    INDEX `Encounter_patientId_idx`(`patientId`),
    INDEX `Encounter_facilityId_idx`(`facilityId`),
    INDEX `Encounter_practitionerId_idx`(`practitionerId`),
    INDEX `Encounter_encounterType_idx`(`encounterType`),
    INDEX `Encounter_status_idx`(`status`),
    INDEX `Encounter_startedAt_idx`(`startedAt`),
    INDEX `Encounter_patientId_startedAt_idx`(`patientId`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Observation` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `encounterId` VARCHAR(191) NOT NULL,
    `recordedByUserId` VARCHAR(191) NULL,
    `category` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `valueNumeric` DECIMAL(65, 30) NULL,
    `valueText` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,
    `referenceRangeLow` DECIMAL(65, 30) NULL,
    `referenceRangeHigh` DECIMAL(65, 30) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'FINAL',
    `observedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Observation_patientId_idx`(`patientId`),
    INDEX `Observation_encounterId_idx`(`encounterId`),
    INDEX `Observation_recordedByUserId_idx`(`recordedByUserId`),
    INDEX `Observation_category_idx`(`category`),
    INDEX `Observation_code_idx`(`code`),
    INDEX `Observation_observedAt_idx`(`observedAt`),
    INDEX `Observation_patientId_observedAt_idx`(`patientId`, `observedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Diagnosis` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `encounterId` VARCHAR(191) NOT NULL,
    `practitionerId` VARCHAR(191) NULL,
    `code` VARCHAR(191) NULL,
    `codeSystem` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `diagnosisType` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `onsetAt` DATETIME(3) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Diagnosis_patientId_idx`(`patientId`),
    INDEX `Diagnosis_encounterId_idx`(`encounterId`),
    INDEX `Diagnosis_practitionerId_idx`(`practitionerId`),
    INDEX `Diagnosis_code_idx`(`code`),
    INDEX `Diagnosis_codeSystem_idx`(`codeSystem`),
    INDEX `Diagnosis_status_idx`(`status`),
    INDEX `Diagnosis_patientId_status_idx`(`patientId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Allergy` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `substance` VARCHAR(191) NOT NULL,
    `allergyType` VARCHAR(191) NULL,
    `criticality` VARCHAR(191) NULL,
    `clinicalStatus` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `reaction` VARCHAR(191) NULL,
    `severity` VARCHAR(191) NULL,
    `onsetAt` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Allergy_patientId_idx`(`patientId`),
    INDEX `Allergy_clinicalStatus_idx`(`clinicalStatus`),
    INDEX `Allergy_patientId_clinicalStatus_idx`(`patientId`, `clinicalStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Encounter` ADD CONSTRAINT `Encounter_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Encounter` ADD CONSTRAINT `Encounter_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `Facility`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Encounter` ADD CONSTRAINT `Encounter_practitionerId_fkey` FOREIGN KEY (`practitionerId`) REFERENCES `Practitioner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Observation` ADD CONSTRAINT `Observation_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Observation` ADD CONSTRAINT `Observation_encounterId_fkey` FOREIGN KEY (`encounterId`) REFERENCES `Encounter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Observation` ADD CONSTRAINT `Observation_recordedByUserId_fkey` FOREIGN KEY (`recordedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Diagnosis` ADD CONSTRAINT `Diagnosis_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Diagnosis` ADD CONSTRAINT `Diagnosis_encounterId_fkey` FOREIGN KEY (`encounterId`) REFERENCES `Encounter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Diagnosis` ADD CONSTRAINT `Diagnosis_practitionerId_fkey` FOREIGN KEY (`practitionerId`) REFERENCES `Practitioner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Allergy` ADD CONSTRAINT `Allergy_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
