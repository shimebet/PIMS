-- PHASE F1-P12I-19Z
-- REVIEW ONLY - DO NOT EXECUTE
--
-- Proposed MySQL schema changes.
-- Requires approval and a separate migration plan.
--
-- Existing DELETED patient records require reconciliation.
-- The default version 0 must not authorize restoration.

ALTER TABLE `Patient`
  ADD COLUMN `lifecycleVersion`
  INT NOT NULL DEFAULT 0;

ALTER TABLE `AuditLog`
  ADD COLUMN `patientLifecycleVersion`
  INT NULL;

CREATE INDEX `AuditLog_patientId_patientLifecycleVersion_idx`
  ON `AuditLog` (
    `patientId`,
    `patientLifecycleVersion`
  );

-- End of proposal.
-- No SQL has been executed.