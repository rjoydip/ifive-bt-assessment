# Leave Management ERD

## Entity Relationship Details

### Core Relationships

1. **User → LeaveCredit (1:N)**
   - Users receive multiple credit postings over time
   - Null userId means "apply to all users"

2. **User → LeaveBalance (1:1)**
   - Each user has one current balance snapshot
   - Updated on every transaction

3. **User → LeaveRequest (1:N)**
   - Users can create multiple leave requests
   - Status: pending, approved, rejected, cancelled

4. **User → LeaveRequest (1:N) as Approver**
   - Admins can approve leave requests
   - Self-relation on User table

5. **LeaveCredit → CreditUtilization (1:N)**
   - Tracks which requests used this credit batch
   - Implements FIFO logic

6. **LeaveRequest → CreditUtilization (1:N)**
   - Each request may use multiple credit batches
   - FIFO: uses oldest credits first

7. **LeaveTransaction (Audit Log)**
   - Records all credit movements
   - Types: CREDIT_POSTED, CREDIT_USED, CREDIT_EXPIRED
   - Maintains balance before/after for audit trail

### FIFO Implementation

```bash
Credit Batch 1 (16 hrs, posted Jan 1, expires Mar 2)
Credit Batch 2 (16 hrs, posted Feb 1, expires Apr 2)

Leave Request (24 hrs):
├─ Deduct 16 hrs from Batch 1 (oldest)
└─ Deduct 8 hrs from Batch 2

Expiration Process:
└─ Deduct remaining unused hours from expired batches (FIFO)
```

### **Core Entities & Definitions**

The system utilizes five primary tables to manage leave logic and auditing:

- **User**: The central entity; a user can receive multiple credits, create requests, and act as an approver for others.
- **LeaveCredit**: Represents a batch of hours posted by an admin (e.g., 16 hours). It includes an `expiresAt` date used for both consumption priority and automated expiration.
- **LeaveBalance**: A snapshot table providing a 1:1 relationship with the User to store `totalCredits`, `usedCredits`, `expiredCredits`, and the currently `availableCredits`.
- **LeaveRequest**: Records Personal Time Off (PTO) applications, including the date range, total calculated hours, and current status (pending, approved, or rejected).
- **LeaveTransaction**: An immutable audit log that records every credit movement (POSTED, USED, EXPIRED, or ADJUSTMENT), maintaining a "balance before" and "balance after" for each entry.
- **CreditUtilization**: A junction table that enables precise FIFO tracking by linking specific `LeaveRequest` entries to the `LeaveCredit` batches they consumed.

---

### **FIFO Logic Relationships**

The system implements deduction logic through the following relational constraints:

- **Credit Consumption**: When a `LeaveRequest` is made, the system sorts `LeaveCredit` batches by their `postedAt` date. It creates `CreditUtilization` records to deduct hours from the oldest batches first.
- **Automated Expiration**: A daily cron job identifies `LeaveCredit` batches where the `expiresAt` date has passed. Any remaining unused hours in that specific batch are deducted from the user's available balance and logged as a `CREDIT_EXPIRED` transaction.
