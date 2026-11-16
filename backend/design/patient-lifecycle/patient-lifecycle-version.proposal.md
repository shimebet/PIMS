# Patient Lifecycle Version Proposal

## Purpose

Provide reliable sequencing for patient soft deletion
and restoration without relying on timestamp and UUID
ordering.

## Proposed fields

Patient.lifecycleVersion
- Integer
- Required
- Default: 0

AuditLog.patientLifecycleVersion
- Nullable integer
- Records lifecycle version associated with an event

## Intended behavior

1. Read patient status and lifecycle version.
2. Verify administrator authorization.
3. Update status using optimistic concurrency:
   patient ID, expected status, expected lifecycle version.
4. Increment lifecycle version.
5. Write an audit event containing the new version.
6. Commit status and audit changes in one transaction.

## Restoration

Restore only when:
- Patient status is DELETED.
- The matching deletion audit event is verified.
- Audit lifecycle version equals patient lifecycle version.
- Original status is ACTIVE or INACTIVE.

## Required before deployment

- Review existing patient and audit data.
- Verify Prisma schema mapping.
- Review MySQL migration compatibility.
- Back up the database.
- Test migration on a nonproduction copy.
- Add backend lifecycle concurrency tests.
- Verify permissions and audit rollback.
- Obtain explicit approval before executing migration.

## Important

This proposal does not execute SQL, update Prisma,
modify patients, or activate deletion endpoints.