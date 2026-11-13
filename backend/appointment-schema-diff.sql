-- CreateTable
CREATE TABLE `Appointment` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `facilityId` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NULL,
    `practitionerId` VARCHAR(191) NULL,
    `appointmentNumber` VARCHAR(191) NOT NULL,
    `appointmentType` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NULL,
    `scheduledStart` DATETIME(3) NOT NULL,
    `scheduledEnd` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SCHEDULED',
    `notes` TEXT NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Appointment_appointmentNumber_key`(`appointmentNumber`),
    INDEX `Appointment_patientId_idx`(`patientId`),
    INDEX `Appointment_facilityId_idx`(`facilityId`),
    INDEX `Appointment_departmentId_idx`(`departmentId`),
    INDEX `Appointment_practitionerId_idx`(`practitionerId`),
    INDEX `Appointment_scheduledStart_idx`(`scheduledStart`),
    INDEX `Appointment_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QueueEntry` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `facilityId` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NULL,
    `encounterId` VARCHAR(191) NULL,
    `queueNumber` VARCHAR(191) NOT NULL,
    `queueType` VARCHAR(191) NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'NORMAL',
    `status` VARCHAR(191) NOT NULL DEFAULT 'WAITING',
    `checkedInAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `calledAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `QueueEntry_patientId_idx`(`patientId`),
    INDEX `QueueEntry_facilityId_idx`(`facilityId`),
    INDEX `QueueEntry_departmentId_idx`(`departmentId`),
    INDEX `QueueEntry_encounterId_idx`(`encounterId`),
    INDEX `QueueEntry_status_idx`(`status`),
    INDEX `QueueEntry_checkedInAt_idx`(`checkedInAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TriageAssessment` (
    `id` VARCHAR(191) NOT NULL,
    `queueEntryId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `encounterId` VARCHAR(191) NULL,
    `triagedByUserId` VARCHAR(191) NULL,
    `chiefComplaint` TEXT NULL,
    `acuityLevel` VARCHAR(191) NULL,
    `priority` VARCHAR(191) NULL,
    `painScore` INTEGER NULL,
    `notes` TEXT NULL,
    `triagedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TriageAssessment_queueEntryId_key`(`queueEntryId`),
    INDEX `TriageAssessment_patientId_idx`(`patientId`),
    INDEX `TriageAssessment_encounterId_idx`(`encounterId`),
    INDEX `TriageAssessment_triagedByUserId_idx`(`triagedByUserId`),
    INDEX `TriageAssessment_acuityLevel_idx`(`acuityLevel`),
    INDEX `TriageAssessment_triagedAt_idx`(`triagedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ward` (
    `id` VARCHAR(191) NOT NULL,
    `facilityId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `wardType` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Ward_facilityId_idx`(`facilityId`),
    INDEX `Ward_status_idx`(`status`),
    UNIQUE INDEX `Ward_facilityId_code_key`(`facilityId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bed` (
    `id` VARCHAR(191) NOT NULL,
    `wardId` VARCHAR(191) NOT NULL,
    `bedNumber` VARCHAR(191) NOT NULL,
    `bedType` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'AVAILABLE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Bed_wardId_idx`(`wardId`),
    INDEX `Bed_status_idx`(`status`),
    UNIQUE INDEX `Bed_wardId_bedNumber_key`(`wardId`, `bedNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Admission` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `encounterId` VARCHAR(191) NULL,
    `facilityId` VARCHAR(191) NOT NULL,
    `wardId` VARCHAR(191) NOT NULL,
    `bedId` VARCHAR(191) NULL,
    `admissionNumber` VARCHAR(191) NOT NULL,
    `admissionType` VARCHAR(191) NULL,
    `reason` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ADMITTED',
    `admittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dischargedAt` DATETIME(3) NULL,
    `admittedByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Admission_admissionNumber_key`(`admissionNumber`),
    INDEX `Admission_patientId_idx`(`patientId`),
    INDEX `Admission_encounterId_idx`(`encounterId`),
    INDEX `Admission_facilityId_idx`(`facilityId`),
    INDEX `Admission_wardId_idx`(`wardId`),
    INDEX `Admission_bedId_idx`(`bedId`),
    INDEX `Admission_status_idx`(`status`),
    INDEX `Admission_admittedAt_idx`(`admittedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PatientTransfer` (
    `id` VARCHAR(191) NOT NULL,
    `admissionId` VARCHAR(191) NOT NULL,
    `fromWardId` VARCHAR(191) NULL,
    `toWardId` VARCHAR(191) NOT NULL,
    `fromBedId` VARCHAR(191) NULL,
    `toBedId` VARCHAR(191) NULL,
    `reason` TEXT NULL,
    `transferredByUserId` VARCHAR(191) NULL,
    `transferredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PatientTransfer_admissionId_idx`(`admissionId`),
    INDEX `PatientTransfer_fromWardId_idx`(`fromWardId`),
    INDEX `PatientTransfer_toWardId_idx`(`toWardId`),
    INDEX `PatientTransfer_fromBedId_idx`(`fromBedId`),
    INDEX `PatientTransfer_toBedId_idx`(`toBedId`),
    INDEX `PatientTransfer_transferredAt_idx`(`transferredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DischargeSummary` (
    `id` VARCHAR(191) NOT NULL,
    `admissionId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `dischargeType` VARCHAR(191) NULL,
    `finalDiagnosis` TEXT NULL,
    `hospitalCourse` TEXT NULL,
    `conditionAtDischarge` VARCHAR(191) NULL,
    `dischargeInstructions` TEXT NULL,
    `followUpInstructions` TEXT NULL,
    `dischargedByUserId` VARCHAR(191) NULL,
    `dischargedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DischargeSummary_admissionId_key`(`admissionId`),
    INDEX `DischargeSummary_patientId_idx`(`patientId`),
    INDEX `DischargeSummary_dischargedByUserId_idx`(`dischargedByUserId`),
    INDEX `DischargeSummary_dischargedAt_idx`(`dischargedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `Facility`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_practitionerId_fkey` FOREIGN KEY (`practitionerId`) REFERENCES `Practitioner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QueueEntry` ADD CONSTRAINT `QueueEntry_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QueueEntry` ADD CONSTRAINT `QueueEntry_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `Facility`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QueueEntry` ADD CONSTRAINT `QueueEntry_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QueueEntry` ADD CONSTRAINT `QueueEntry_encounterId_fkey` FOREIGN KEY (`encounterId`) REFERENCES `Encounter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TriageAssessment` ADD CONSTRAINT `TriageAssessment_queueEntryId_fkey` FOREIGN KEY (`queueEntryId`) REFERENCES `QueueEntry`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TriageAssessment` ADD CONSTRAINT `TriageAssessment_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TriageAssessment` ADD CONSTRAINT `TriageAssessment_encounterId_fkey` FOREIGN KEY (`encounterId`) REFERENCES `Encounter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TriageAssessment` ADD CONSTRAINT `TriageAssessment_triagedByUserId_fkey` FOREIGN KEY (`triagedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ward` ADD CONSTRAINT `Ward_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `Facility`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bed` ADD CONSTRAINT `Bed_wardId_fkey` FOREIGN KEY (`wardId`) REFERENCES `Ward`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Admission` ADD CONSTRAINT `Admission_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Admission` ADD CONSTRAINT `Admission_encounterId_fkey` FOREIGN KEY (`encounterId`) REFERENCES `Encounter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Admission` ADD CONSTRAINT `Admission_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `Facility`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Admission` ADD CONSTRAINT `Admission_wardId_fkey` FOREIGN KEY (`wardId`) REFERENCES `Ward`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Admission` ADD CONSTRAINT `Admission_bedId_fkey` FOREIGN KEY (`bedId`) REFERENCES `Bed`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Admission` ADD CONSTRAINT `Admission_admittedByUserId_fkey` FOREIGN KEY (`admittedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatientTransfer` ADD CONSTRAINT `PatientTransfer_admissionId_fkey` FOREIGN KEY (`admissionId`) REFERENCES `Admission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatientTransfer` ADD CONSTRAINT `PatientTransfer_fromWardId_fkey` FOREIGN KEY (`fromWardId`) REFERENCES `Ward`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatientTransfer` ADD CONSTRAINT `PatientTransfer_toWardId_fkey` FOREIGN KEY (`toWardId`) REFERENCES `Ward`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatientTransfer` ADD CONSTRAINT `PatientTransfer_fromBedId_fkey` FOREIGN KEY (`fromBedId`) REFERENCES `Bed`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatientTransfer` ADD CONSTRAINT `PatientTransfer_toBedId_fkey` FOREIGN KEY (`toBedId`) REFERENCES `Bed`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatientTransfer` ADD CONSTRAINT `PatientTransfer_transferredByUserId_fkey` FOREIGN KEY (`transferredByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DischargeSummary` ADD CONSTRAINT `DischargeSummary_admissionId_fkey` FOREIGN KEY (`admissionId`) REFERENCES `Admission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DischargeSummary` ADD CONSTRAINT `DischargeSummary_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DischargeSummary` ADD CONSTRAINT `DischargeSummary_dischargedByUserId_fkey` FOREIGN KEY (`dischargedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
