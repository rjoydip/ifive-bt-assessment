# Leave Management ERD

```mermaid

    User ||--o{ Session : "has"
    User ||--o{ Account : "has"
    User ||--o{ Member : "has"
    User ||--o{ Invitation : "creates"
    User ||--o{ Apikey : "has"
    
    Organization ||--o{ Member : "has"
    Organization ||--o{ Invitation : "has"
    
    Member }o--|| Organization : "belongs to"
    Member }o--|| User : "is"
        
    User ||--o{ LeaveCredit : "receives"
    User ||--o| LeaveBalance : "has"
    User ||--o{ LeaveRequest : "creates"
    User ||--o{ LeaveRequest : "approves"
    User ||--o{ LeaveTransaction : "has"
    
    LeaveCredit ||--o{ LeaveTransaction : "generates"
    LeaveCredit ||--o{ CreditUtilization : "tracked in"
    
    LeaveRequest ||--o{ LeaveTransaction : "generates"
    LeaveRequest ||--o{ CreditUtilization : "uses"
    
    LeaveTransaction }o--|| User : "belongs to"
    LeaveTransaction }o--o| LeaveCredit : "references"
    LeaveTransaction }o--o| LeaveRequest : "references"
    
    CreditUtilization }o--|| LeaveRequest : "belongs to"
    CreditUtilization }o--|| LeaveCredit : "deducts from"
        
    User {
        string id PK
        string name
        string email UK
        boolean emailVerified
        string image
        datetime createdAt
        datetime updatedAt
        boolean banned
        string banReason
        datetime banExpires
        string role
    }
    
    Session {
        string id PK
        datetime expiresAt
        string token UK
        datetime createdAt
        datetime updatedAt
        string ipAddress
        string userAgent
        string userId FK
        string impersonatedBy
        string activeOrganizationId
    }
    
    Account {
        string id PK
        string accountId
        string providerId
        string userId FK
        string accessToken
        string refreshToken
        string idToken
        datetime accessTokenExpiresAt
        datetime refreshTokenExpiresAt
        string scope
        string password
        datetime createdAt
        datetime updatedAt
    }
    
    Organization {
        string id PK
        string name
        string slug UK
        string logo
        datetime createdAt
        string metadata
    }
    
    Member {
        string id PK
        string organizationId FK
        string userId FK
        string role
        datetime createdAt
    }
    
    Invitation {
        string id PK
        string organizationId FK
        string email
        string role
        string status
        datetime expiresAt
        datetime createdAt
        string inviterId FK
    }
    
    Apikey {
        string id PK
        string name
        string start
        string prefix
        string key UK
        string userId FK
        int refillInterval
        int refillAmount
        datetime lastRefillAt
        boolean enabled
        boolean rateLimitEnabled
        int rateLimitTimeWindow
        int rateLimitMax
        int requestCount
        int remaining
        datetime lastRequest
        datetime expiresAt
        datetime createdAt
        datetime updatedAt
        string permissions
        string metadata
    }
    
    LeaveCredit {
        string id PK
        string userId FK "nullable-for-all-users"
        float credits "hours"
        float hoursPerDay "default-8"
        datetime expiresAt "expiration-date"
        string notes
        datetime postedAt
        datetime createdAt
        datetime updatedAt
    }
    
    LeaveBalance {
        string id PK
        string userId FK UK
        float totalCredits "sum-of-posted"
        float usedCredits "sum-of-used"
        float expiredCredits "sum-of-expired"
        float availableCredits "calculated"
        datetime lastCalculatedAt
        datetime createdAt
        datetime updatedAt
    }
    
    LeaveRequest {
        string id PK
        string userId FK
        datetime startDate
        datetime endDate
        float hoursPerDay
        float totalHours "calculated"
        string reason
        string status "pending-approved-rejected"
        string approvedBy FK
        datetime approvedAt
        datetime rejectedAt
        string rejectionReason
        datetime createdAt
        datetime updatedAt
    }
    
    LeaveTransaction {
        string id PK
        string userId FK
        string leaveCreditId FK "nullable"
        string leaveRequestId FK "nullable"
        string type "POSTED-USED-EXPIRED-ADJUSTMENT"
        float hours "positive-or-negative"
        float balanceBefore
        float balanceAfter
        string notes
        datetime createdAt
    }
    
    CreditUtilization {
        string id PK
        string leaveRequestId FK
        string leaveCreditId FK
        float hoursUsed "FIFO-tracking"
        datetime createdAt
    }
```

## ERD Diagram

![ERD Diagram](/ERD.diagram.png)

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
