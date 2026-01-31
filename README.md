# Leave Management System - Complete Documentation

This leave management system implements three core functionalities as specified:

1. **Posting Functionality**: Admin posts leave credits with expiration dates
2. **Utilization Functionality**: Users file for PTO (Personal Time Off)
3. **Deduction Functionality**: System deducts credits using FIFO logic for both utilization and expiration

## IFive BT Assessment

[Assessment Details](/docs/ifive-bt-assessment.pdf)

---

## Business Requirements

### 1. Posting Functionality

- ✅ Admin users can post leave credits to users
- ✅ Credits can be posted to specific users or all users
- ✅ Each posting has an expiration date
- ✅ Configurable hours per day (default: 8 hours)
- ✅ Optional notes for each posting

### 2. Utilization Functionality

- ✅ Users can file for Personal Time Off (PTO)
- ✅ System calculates total hours based on date range and hours per day
- ✅ Credits are deducted from available balance
- ✅ Approval workflow (pending → approved/rejected)

### 3. Deduction Functionality

#### a) Deduction due to Utilization

- ✅ System deducts used leave credits from user's total balance
- ✅ Uses **FIFO (First-In, First-Out)** logic
- ✅ Deducts from oldest credits first

#### b) Deduction due to Expiration

- ✅ System deducts unused credits after expiration date
- ✅ Uses **FIFO (First-In, First-Out)** logic
- ✅ Runs as scheduled job (cron)

---

## Sample Scenario Walkthrough

### January 1

**Admin posts 16 hours leave credits, expires after 60 days**

```typescript
await postLeaveCredits({
  userIds: ['user_123'],
  credits: 16,
  hoursPerDay: 8,
  expiresAt: new Date('2025-03-02'), // 60 days later
  notes: 'Q1 2025 allocation',
})
```

**Result:**

- Starting balance: 0 hours
- Credits earned: 16 hours (posted by admin)
- New total balance: **16 hours**

```bash
LeaveBalance {
  totalCredits: 16,
  usedCredits: 0,
  expiredCredits: 0,
  availableCredits: 16
}
```

### February 1

**Admin posts another 16 hours, expires after 60 days**

```typescript
await postLeaveCredits({
  userIds: ['user_123'],
  credits: 16,
  hoursPerDay: 8,
  expiresAt: new Date('2025-04-02'), // 60 days later
  notes: 'Additional allocation',
})
```

**Result:**

- Previous balance: 16 hours
- New credits earned: 16 hours
- New total balance: **32 hours**

```bash
LeaveBalance {
  totalCredits: 32,
  usedCredits: 0,
  expiredCredits: 0,
  availableCredits: 32
}

Credit Batches:
├─ Batch 1: 16 hours (expires Mar 2) [OLDEST]
└─ Batch 2: 16 hours (expires Apr 2)
```

### February 10

**User requests 3 days off (24 hours total)**

```typescript
await createLeaveRequest({
  userId: 'user_123',
  startDate: new Date('2025-02-10'),
  endDate: new Date('2025-02-12'), // 3 business days
  hoursPerDay: 8,
  reason: 'Vacation',
})
```

**FIFO Deduction Logic:**

1. Needs 24 hours
2. Deduct from Batch 1 (oldest): 16 hours ✅
3. Still need 8 hours
4. Deduct from Batch 2: 8 hours ✅
5. Total deducted: 24 hours

**Result:**

```bash
LeaveBalance {
  totalCredits: 32,
  usedCredits: 24,
  expiredCredits: 0,
  availableCredits: 8
}

Credit Batches:
├─ Batch 1: 0 hours remaining (fully used)
└─ Batch 2: 8 hours remaining (16 - 8 = 8)
```

**CreditUtilization Records:**

```bash
LeaveRequest: 24 hours
├─ Used 16 hours from Batch 1 (Jan 1 posting)
└─ Used 8 hours from Batch 2 (Feb 1 posting)
```

### March 3

**Expiration Process Runs (Batch 1 expired on Mar 2)**

```typescript
await processExpiredCredits() // Cron job
```

**FIFO Expiration Logic:**

- Batch 1 expired on Mar 2
- Batch 1 had 0 hours remaining (fully used)
- Nothing to expire ✅

**Result:** No change, batch was already fully utilized

### April 3

**Expiration Process Runs (Batch 2 expired on Apr 2)**

Batch 2 still has 8 hours remaining (unused)

**FIFO Expiration Logic:**

- Batch 2 expired on Apr 2
- Batch 2 had 8 hours remaining
- Deduct 8 hours from balance (expiration)

**Result:**

```log
LeaveBalance {
  totalCredits: 32,
  usedCredits: 24,
  expiredCredits: 8,  // ← New
  availableCredits: 0 // 32 - 24 - 8 = 0
}
```

---

## Database Schema

### Core Tables

#### 1. LeaveCredit

Stores admin-posted leave credits with expiration dates.

```prisma
model LeaveCredit {
  id          String   @id @default(cuid())
  userId      String?  // null = apply to all users
  credits     Float    // in hours
  hoursPerDay Float    @default(8)
  expiresAt   DateTime
  notes       String?
  postedAt    DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### 2. LeaveBalance

Current balance snapshot per user (for quick queries).

```prisma
model LeaveBalance {
  id               String   @id @default(cuid())
  userId           String   @unique
  totalCredits     Float    @default(0) // Sum of all posted
  usedCredits      Float    @default(0) // Sum of utilized
  expiredCredits   Float    @default(0) // Sum of expired
  availableCredits Float    @default(0) // Calculated
  lastCalculatedAt DateTime @default(now())
}
```

**Formula:**

```txt
availableCredits = totalCredits - usedCredits - expiredCredits
```

#### 3. LeaveRequest

User's PTO requests.

```prisma
model LeaveRequest {
  id          String   @id @default(cuid())
  userId      String
  startDate   DateTime
  endDate     DateTime
  hoursPerDay Float    @default(8)
  totalHours  Float    // Calculated
  reason      String?
  status      String   @default("pending")
  approvedBy  String?
  approvedAt  DateTime?
}
```

#### 4. LeaveTransaction

Audit trail of all credit movements.

```prisma
model LeaveTransaction {
  id             String   @id @default(cuid())
  userId         String
  leaveCreditId  String?
  leaveRequestId String?
  type           String   // CREDIT_POSTED, CREDIT_USED, CREDIT_EXPIRED
  hours          Float    // +positive or -negative
  balanceBefore  Float
  balanceAfter   Float
  notes          String?
  createdAt      DateTime @default(now())
}
```

**Transaction Types:**

- `CREDIT_POSTED`: Admin posted new credits
- `CREDIT_USED`: User utilized credits for PTO
- `CREDIT_EXPIRED`: Credits expired (unused)
- `BALANCE_ADJUSTMENT`: Manual adjustment by admin

#### 5. CreditUtilization

Detailed FIFO tracking (which credits used for which requests).

```prisma
model CreditUtilization {
  id             String @id @default(cuid())
  leaveRequestId String
  leaveCreditId  String
  hoursUsed      Float  // Hours deducted from this batch
  createdAt      DateTime @default(now())
}
```

This table enables precise FIFO tracking and audit trail.

---

## TypeScript Calculation Logic

### Key Functions

#### 1. Post Leave Credits

```typescript
await postLeaveCredits({
  userIds: ['user1', 'user2'], // empty array = all users
  credits: 16,
  hoursPerDay: 8,
  expiresAt: new Date('2025-06-01'),
  notes: 'Q2 allocation',
})
```

**What it does:**

1. Creates LeaveCredit records
2. Updates LeaveBalance (totalCredits, availableCredits)
3. Creates LeaveTransaction (type: CREDIT_POSTED)

#### 2. Create Leave Request (FIFO Deduction)

```typescript
await createLeaveRequest({
  userId: 'user_123',
  startDate: new Date('2025-03-01'),
  endDate: new Date('2025-03-03'),
  hoursPerDay: 8,
  reason: 'Vacation',
})
```

**What it does:**

1. Calculates total hours needed
2. Checks if user has sufficient balance
3. Gets available credit batches (ordered by postedAt - FIFO)
4. Deducts hours from oldest batches first
5. Creates CreditUtilization records (audit trail)
6. Updates LeaveBalance (usedCredits, availableCredits)
7. Creates LeaveTransaction (type: CREDIT_USED)

**FIFO Logic:**

```typescript
// Get credit batches ordered oldest first
const batches = await getAvailableCreditBatches(userId)
// [Batch1: 16hrs, Batch2: 16hrs, Batch3: 8hrs]

let remainingHours = 24 // Need 24 hours
const utilizationRecords = []

for (const batch of batches) {
  if (remainingHours <= 0) break
  
  const hoursToDeduct = Math.min(remainingHours, batch.remaining)
  
  utilizationRecords.push({
    leaveCreditId: batch.id,
    hoursUsed: hoursToDeduct,
  })
  
  remainingHours -= hoursToDeduct
}

// Result: [
//   { leaveCreditId: 'batch1', hoursUsed: 16 },
//   { leaveCreditId: 'batch2', hoursUsed: 8 }
// ]
```

#### 3. Process Expired Credits (FIFO)

```typescript
// Run as cron job daily
await processExpiredCredits()
```

**What it does:**

1. Finds all credits past expiration date
2. For each expired batch:
   - Calculates remaining unused hours
   - Deducts from user's balance
   - Creates LeaveTransaction (type: CREDIT_EXPIRED)
   - Updates LeaveBalance (expiredCredits, availableCredits)

**FIFO Logic:**
Since credits are posted chronologically, expiration naturally follows FIFO order (oldest credits expire first).

#### 4. Get Balance Breakdown

```typescript
const breakdown = await getBalanceBreakdown('user_123')

// Returns:
{
  totalCredits: 32,
  usedCredits: 24,
  expiredCredits: 0,
  availableCredits: 8,
  creditBatches: [
    {
      id: 'batch1',
      remaining: 0,
      expiresAt: '2025-03-02',
      postedAt: '2025-01-01'
    },
    {
      id: 'batch2',
      remaining: 8,
      expiresAt: '2025-04-02',
      postedAt: '2025-02-01'
    }
  ]
}
```

---

## API Endpoints (Example)

### POST /api/leave/credits

Admin posts leave credits

```typescript
// Request
{
  "userIds": ["user1", "user2"], // empty = all users
  "credits": 16,
  "hoursPerDay": 8,
  "expiresAt": "2025-06-01",
  "notes": "Q2 allocation"
}

// Response
{
  "success": true,
  "creditsPosted": 2,
  "totalHours": 32
}
```

### POST /api/leave/requests

User creates leave request

```typescript
// Request
{
  "startDate": "2025-03-01",
  "endDate": "2025-03-03",
  "hoursPerDay": 8,
  "reason": "Vacation"
}

// Response
{
  "id": "req_123",
  "userId": "user_123",
  "totalHours": 24,
  "status": "pending",
  "creditUtilization": [
    { "batchId": "batch1", "hoursUsed": 16 },
    { "batchId": "batch2", "hoursUsed": 8 }
  ]
}
```

### GET /api/leave/balance

Get user's leave balance

```typescript
// Response
{
  "totalCredits": 32,
  "usedCredits": 24,
  "expiredCredits": 0,
  "availableCredits": 8,
  "creditBatches": [
    {
      "id": "batch1",
      "remaining": 0,
      "expiresAt": "2025-03-02",
      "status": "fully_used"
    },
    {
      "id": "batch2",
      "remaining": 8,
      "expiresAt": "2025-04-02",
      "status": "partially_used"
    }
  ]
}
```

### GET /api/leave/transactions

Get transaction history

```typescript
// Response
{
  "transactions": [
    {
      "id": "txn_1",
      "type": "CREDIT_USED",
      "hours": -24,
      "balanceBefore": 32,
      "balanceAfter": 8,
      "notes": "Used 24 hours for leave request",
      "createdAt": "2025-02-10"
    },
    {
      "id": "txn_2",
      "type": "CREDIT_POSTED",
      "hours": 16,
      "balanceBefore": 16,
      "balanceAfter": 32,
      "notes": "Posted 16 hours, expires 2025-04-02",
      "createdAt": "2025-02-01"
    }
  ]
}
```

---

## Cron Jobs

### Daily Expiration Check

```typescript
// Run daily at midnight
import { processExpiredCredits } from './leave-calculations'

cron.schedule('0 0 * * *', async () => {
  console.log('Running leave expiration check...')
  
  const result = await processExpiredCredits()
  
  console.log(`Processed ${result.processed} expired batches`)
  console.log(`Total hours expired: ${result.totalHoursExpired}`)
})
```

---

## FIFO Logic Visualization

### Example: Multiple Credit Batches

```bash
Timeline:
─────────────────────────────────────────────────────────
│   Jan 1     │   Feb 1     │   Mar 2     │    Apr 2    │
─────────────────────────────────────────────────────────
│             │             │             │             │
│  Batch 1    │  Batch 2    │  Batch 1    │  Batch 2    │
│  16 hrs     │  16 hrs     │  expires    │  expires    │
│  posted     │  posted     │             │             │
│             │             │             │             │
└─────────────┴─────────────┴─────────────┴──────────────

User Balance:
- After Jan 1: 16 hrs available
- After Feb 1: 32 hrs available (16 + 16)
```

### User Requests 24 Hours Leave (Feb 10)

```bash
FIFO Deduction Process:
1. Sort batches by posted date (ascending)
   ├─ Batch 1: Posted Jan 1, Remaining: 16 hrs ← USE FIRST
   └─ Batch 2: Posted Feb 1, Remaining: 16 hrs

2. Deduct 24 hours using FIFO:
   ├─ From Batch 1: Deduct 16 hrs (fully depleted)
   └─ From Batch 2: Deduct 8 hrs (8 hrs remaining)

Result:
├─ Batch 1: 0 hrs remaining
└─ Batch 2: 8 hrs remaining
```

### Expiration Process (Mar 3)

```bash
Check Batch 1 (expired Mar 2):
├─ Remaining: 0 hrs
└─ Action: Nothing to expire ✓

Result: No change
```

### Expiration Process (Apr 3)

```bash
Check Batch 2 (expired Apr 2):
├─ Remaining: 8 hrs (unused)
└─ Action: Deduct 8 hrs from balance (CREDIT_EXPIRED)

Result:
├─ expiredCredits: +8
└─ availableCredits: -8
```

---

## Testing Scenarios

### Test 1: Basic Posting and Utilization

```typescript
// 1. Post 16 hours
await postLeaveCredits({
  userIds: ['user1'],
  credits: 16,
  hoursPerDay: 8,
  expiresAt: addDays(new Date(), 60),
})

// Expected: totalCredits = 16, availableCredits = 16

// 2. Request 8 hours
await createLeaveRequest({
  userId: 'user1',
  startDate: new Date(),
  endDate: new Date(),
  hoursPerDay: 8,
})

// Expected: usedCredits = 8, availableCredits = 8
```

### Test 2: FIFO Deduction Across Multiple Batches

```typescript
// 1. Post Batch 1: 10 hours
await postLeaveCredits({ credits: 10, ... })

// 2. Post Batch 2: 10 hours
await postLeaveCredits({ credits: 10, ... })

// 3. Request 15 hours
await createLeaveRequest({ totalHours: 15, ... })

// Expected:
// - Batch 1: 0 remaining (10 used)
// - Batch 2: 5 remaining (5 used)
// - CreditUtilization: [
//     { batch1: 10 hrs },
//     { batch2: 5 hrs }
//   ]
```

### Test 3: Expiration FIFO

```typescript
// 1. Post Batch 1: 10 hrs, expires in 1 day
// 2. Post Batch 2: 10 hrs, expires in 2 days
// 3. Wait 1 day, run expiration
// Expected: Batch 1 expired (10 hrs deducted)
// 4. Wait 1 more day, run expiration
// Expected: Batch 2 expired (10 hrs deducted)
```

---

## Error Handling

### Insufficient Balance

```typescript
try {
  await createLeaveRequest({
    userId: 'user1',
    totalHours: 100, // User only has 16 hours
  })
} catch (error) {
  // Error: "Insufficient leave balance. Required: 100 hours, Available: 16 hours"
}
```

### Expired Credits

```typescript
// Automatically handled by processExpiredCredits() cron job
// No manual intervention needed
```

---

## Performance Considerations

1. **Index on expiresAt**: Fast expiration queries
2. **Index on userId**: Fast user-specific queries
3. **Index on createdAt**: Fast transaction history queries
4. **LeaveBalance Table**: Cached balance for instant reads
5. **Batch Processing**: Expiration runs in batches to avoid timeouts

---

## Security & Permissions

### Admin Actions

- ✅ Post leave credits
- ✅ View all user balances
- ✅ Approve/reject leave requests
- ✅ Run manual balance adjustments

### User Actions

- ✅ View own balance
- ✅ Create leave requests
- ✅ View own transaction history
- ❌ Cannot post credits
- ❌ Cannot view other users' data

---

## Monitoring & Alerts

### Key Metrics to Track

1. **Expiration Rate**: How many hours expire unused
2. **Utilization Rate**: Percentage of credits used
3. **Balance Distribution**: Credits per user
4. **Approval Time**: Time from request to approval
5. **Failed Requests**: Insufficient balance attempts

### Alerts

```typescript
// Alert if expiration rate > 20%
if (expiredCredits / totalCredits > 0.2) {
  sendAlert('High credit expiration rate')
}

// Alert if balance < 8 hours
if (availableCredits < 8) {
  notifyUser('Low leave balance')
}
```

The FIFO logic ensures fair and predictable credit consumption, while the transaction log provides full transparency and auditability.

## Tech Stack

### Server

- [Hono](https://hono.dev/) server
- [tRPC](https://trpc.io/) type-safe server API
- [Drizzle](https://orm.drizzle.team/) database ORM
- [Better-Auth](https://www.better-auth.com/) authentication
- [pino](https://getpino.io/#/) logger
- [Tanstack Router](https://tanstack.com/router/latest) streaming server-side rendering (SSR)

### Development

- [pnpm](https://pnpm.io/) is highly recommended
- [Vite](https://vite.dev/) development server (with [@hono/vite-dev-server](https://www.npmjs.com/package/@hono/vite-dev-server))
- [Typescript](https://www.typescriptlang.org/) type safety everywhere
- [Zod](https://zod.dev/) schemas
- [dotenvx](https://dotenvx.com/) encrypted environment variables
- [Prettier](https://prettier.io/) and [ESLint](https://eslint.org/), of course

### Frontend

- [React](https://react.dev/) with [React Compiler](https://react.dev/learn/react-compiler)
- [shadcn/ui](https://ui.shadcn.com/) components
- [Tailwind CSS](https://tailwindcss.com/)

### Building

- [tsup](https://tsup.egoist.dev/) bundling

## Resources

- [Assessment Details](/docs/ifive-bt-assessment.pdf)
- [ERD Documentation](/docs/ERD.md)
- [ERD Diagram](/docs/ERD.diagram.png)
- [API Documentation](/docs/API.md)
- [Setup Documentation](/docs/SETUP.md)
- [Presentation](/docs/ifive-bt-assessment-presentation.pdf)
