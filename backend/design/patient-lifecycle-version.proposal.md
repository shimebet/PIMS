# PHASE F1-P12I-19Z
## Patient Lifecycle Version Design

Status: PROPOSAL ONLY

### Patient model

Proposed field:

lifecycleVersion Int @default(0)

### AuditLog model

Proposed field:

patientLifecycleVersion Int?

Proposed index:

@@index([patientId, patientLifecycleVersion])

### Lifecycle rules

1. A new patient starts at version 0.
2. Soft deletion increments the version atomically.
3. The deletion audit records the resulting version.
4. Restoration verifies that the current patient version
   matches the deletion audit version.
5. Restoration increments the version atomically.
6. The restoration audit records the resulting version.
7. Repeated lifecycle changes always advance the version.
8. Audit creation failure must roll back the patient update.

### Legacy patient records

Existing DELETED patients may have unversioned audits.

A default version of zero is not proof of audit history.

Legacy restoration must fail closed until the deletion
history has been independently reconciled.

Do not automatically assign historical audit versions.

### Concurrency

Use an interactive Prisma transaction.

Read the current patient status and version.

Use updateMany with a guarded WHERE condition containing:

- patient ID
- expected status
- expected lifecycle version

Increment the version in the same guarded update.

Require exactly one affected row.

Write the audit in the same transaction.

Test concurrent requests against MySQL before release.

### Deployment requirements

1. Review and approve the schema change.
2. Back up the clinic database.
3. Inspect existing DELETED patient records safely.
4. Review migration SQL and rollback strategy.
5. Prepare Prisma client and service changes.
6. Test against an isolated MySQL database.
7. Validate legacy restoration behavior.
8. Apply migration only after explicit authorization.

### Restrictions

No production database migration is authorized.

No automatic reconciliation of historical audits.

No delete or restore HTTP endpoint exposure yet.