# PHASE F1-P12I-20A
## Patient Lifecycle Version Test Design

Status: DESIGN ONLY

### 1. Initial state

A newly registered patient has lifecycleVersion = 0.

No deletion or restoration audit is required for a
newly registered active patient.

### 2. First soft deletion

Given:
- Patient status ACTIVE
- Patient lifecycleVersion 0
- Authorized SYSTEM_ADMIN
- Valid deletion reason and confirmation

When:
- softDelete executes successfully

Then:
- Patient status becomes DELETED
- Patient lifecycleVersion becomes 1
- Audit action is PATIENT_SOFT_DELETE
- Audit patientLifecycleVersion is 1
- Audit previous status is ACTIVE

### 3. First restoration

Given:
- Patient status DELETED
- Patient lifecycleVersion 1
- Latest valid deletion audit has version 1
- Authorized SYSTEM_ADMIN

When:
- restore executes successfully

Then:
- Patient status becomes ACTIVE
- Patient lifecycleVersion becomes 2
- Audit action is PATIENT_RESTORE
- Audit patientLifecycleVersion is 2

### 4. Repeated lifecycle operations

Expected versions:

ACTIVE  version 0
DELETED version 1
ACTIVE  version 2
DELETED version 3
ACTIVE  version 4

Every successful lifecycle transition advances the
patient version exactly once.

### 5. Stale deletion audit

Given:
- Patient lifecycleVersion 3
- Deletion audit version 1

Then:
- Restoration must fail
- Patient remains DELETED
- No restoration audit is written

### 6. Missing audit version

Given:
- Patient status DELETED
- Deletion audit has null patientLifecycleVersion

Then:
- Restoration must fail closed
- No automatic historical audit reconciliation

### 7. Legacy deleted patient

Given:
- Patient status DELETED
- Patient lifecycleVersion 0

Then:
- Restoration must fail closed
- Manual history reconciliation is required

### 8. Concurrent deletion

Two requests attempt to delete the same patient
using the same expected lifecycle version.

Expected:
- At most one succeeds
- The other fails with a conflict
- No duplicate successful deletion audits

### 9. Concurrent restoration

Two requests attempt restoration using the same
expected lifecycle version.

Expected:
- At most one succeeds
- The other fails with a conflict
- No duplicate successful restoration audits

### 10. Audit failure

If auditLog.create fails after the guarded update:

Expected:
- The transaction rolls back
- Patient status remains unchanged
- Patient lifecycleVersion remains unchanged

### 11. Authorization

Deletion requires:
- Active SYSTEM_ADMIN assignment
- Active administrator account
- Current patient.delete permission

Restoration requires:
- Active SYSTEM_ADMIN assignment
- Active administrator account
- Current patient.restore permission

### 12. Integration verification

Mock-based unit tests are insufficient to establish
actual MySQL transaction and concurrency behavior.

Use an isolated MySQL test database to verify:
- Transaction rollback
- Guarded updates
- Concurrent requests
- Lifecycle version increments
- Audit consistency

### 13. Deployment restrictions

Do not execute the migration yet.
Do not modify production patient records.
Do not expose delete or restore HTTP endpoints.
Do not automatically reconcile legacy audit history.