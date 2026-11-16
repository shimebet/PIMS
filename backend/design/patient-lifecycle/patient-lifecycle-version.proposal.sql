-- PROPOSAL ONLY - DO NOT EXECUTE
-- Requires review and explicit approval.

ALTER TABLE `Patient`
  ADD COLUMN `lifecycleVersion`
  INT NOT NULL DEFAULT 0;

ALTER TABLE `AuditLog`
  ADD COLUMN `patientLifecycleVersion`
  INT NULL;

CREATE INDEX
  `AuditLog_patientId_patientLifecycleVersion_idx`
ON `AuditLog` (
  `patientId`,
  `patientLifecycleVersion`
);