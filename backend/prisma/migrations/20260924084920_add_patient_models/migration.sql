-- CreateTable
CREATE TABLE `Patient` (
    `id` VARCHAR(191) NOT NULL,
    `patientNumber` VARCHAR(191) NOT NULL,
    `medicalRecordNumber` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `middleName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `birthDateEstimated` BOOLEAN NOT NULL DEFAULT false,
    `sexAtBirth` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `bloodGroup` VARCHAR(191) NULL,
    `maritalStatus` VARCHAR(191) NULL,
    `nationality` VARCHAR(191) NULL,
    `preferredLanguage` VARCHAR(191) NULL,
    `occupation` VARCHAR(191) NULL,
    `photoUrl` VARCHAR(191) NULL,
    `deceased` BOOLEAN NOT NULL DEFAULT false,
    `deceasedAt` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `registrationFacilityId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Patient_patientNumber_key`(`patientNumber`),
    UNIQUE INDEX `Patient_medicalRecordNumber_key`(`medicalRecordNumber`),
    INDEX `Patient_registrationFacilityId_idx`(`registrationFacilityId`),
    INDEX `Patient_firstName_idx`(`firstName`),
    INDEX `Patient_lastName_idx`(`lastName`),
    INDEX `Patient_dateOfBirth_idx`(`dateOfBirth`),
    INDEX `Patient_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PatientIdentifier` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `identifierType` VARCHAR(191) NOT NULL,
    `identifierValue` VARCHAR(191) NOT NULL,
    `issuingAuthority` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PatientIdentifier_patientId_idx`(`patientId`),
    INDEX `PatientIdentifier_status_idx`(`status`),
    UNIQUE INDEX `PatientIdentifier_identifierType_identifierValue_key`(`identifierType`, `identifierValue`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PatientContact` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `contactType` VARCHAR(191) NOT NULL,
    `contactValue` VARCHAR(191) NOT NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PatientContact_patientId_idx`(`patientId`),
    INDEX `PatientContact_contactValue_idx`(`contactValue`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PatientAddress` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NULL,
    `region` VARCHAR(191) NULL,
    `zone` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `subCity` VARCHAR(191) NULL,
    `kebele` VARCHAR(191) NULL,
    `street` VARCHAR(191) NULL,
    `houseNumber` VARCHAR(191) NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PatientAddress_patientId_idx`(`patientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NumberSequence` (
    `id` VARCHAR(191) NOT NULL,
    `sequenceKey` VARCHAR(191) NOT NULL,
    `value` BIGINT NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NumberSequence_sequenceKey_key`(`sequenceKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Department_status_idx` ON `Department`(`status`);

-- CreateIndex
CREATE INDEX `Facility_status_idx` ON `Facility`(`status`);

-- CreateIndex
CREATE INDEX `Permission_module_idx` ON `Permission`(`module`);

-- AddForeignKey
ALTER TABLE `Patient` ADD CONSTRAINT `Patient_registrationFacilityId_fkey` FOREIGN KEY (`registrationFacilityId`) REFERENCES `Facility`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatientIdentifier` ADD CONSTRAINT `PatientIdentifier_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatientContact` ADD CONSTRAINT `PatientContact_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatientAddress` ADD CONSTRAINT `PatientAddress_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
