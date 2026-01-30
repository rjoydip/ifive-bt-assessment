/**
 * Leave Management API Routes (Hono.js)
 * Implements REST endpoints for posting, utilization, and expiration
 */

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { Prisma } from '~/lib/db/generated/client'
import { prisma } from '~/lib/db/prisma'
import { AppBindings } from '../types'

const leaveRoutes = new Hono<AppBindings>({ strict: false })

// ============================================
// VALIDATION SCHEMAS
// ============================================

const postLeaveCreditsSchema = z.object({
  userIds: z.array(z.string()).default([]),
  credits: z.number().positive('Credits must be greater than 0'),
  hoursPerDay: z.number().min(1).max(24).default(8),
  expiresAt: z.string().transform((str) => new Date(str)),
  notes: z.string().optional(),
})

const createLeaveRequestSchema = z.object({
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  hoursPerDay: z.number().min(1).max(24).default(8),
  reason: z.string().optional(),
})

const approveLeaveRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().optional(),
})

const getTransactionHistoryQuerySchema = z.object({
  limit: z
    .string()
    .transform((str) => parseInt(str, 10))
    .default(50),
})

// ============================================
// ENUMS & TYPES
// ============================================

enum TransactionType {
  CREDIT_POSTED = 'CREDIT_POSTED',
  CREDIT_USED = 'CREDIT_USED',
  CREDIT_EXPIRED = 'CREDIT_EXPIRED',
  BALANCE_ADJUSTMENT = 'BALANCE_ADJUSTMENT',
}

interface CreditBatch {
  id: string
  credits: number
  remaining: number
  expiresAt: Date
  postedAt: Date
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0
  const current = new Date(startDate)

  while (current <= endDate) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

async function getAvailableCreditBatches(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<CreditBatch[]> {
  const now = new Date()

  const credits = await tx.leaveCredit.findMany({
    where: {
      userId,
      expiresAt: { gt: now },
    },
    orderBy: { postedAt: 'asc' },
  })

  const batches: CreditBatch[] = []

  for (const credit of credits) {
    const usedHours = await tx.creditUtilization.aggregate({
      where: { leaveCreditId: credit.id },
      _sum: { hoursUsed: true },
    })

    const remaining = credit.credits - (usedHours._sum.hoursUsed || 0)

    if (remaining > 0) {
      batches.push({
        id: credit.id,
        credits: credit.credits,
        remaining,
        expiresAt: credit.expiresAt,
        postedAt: credit.postedAt,
      })
    }
  }

  return batches
}

async function deductCreditsUsingFIFO(
  tx: Prisma.TransactionClient,
  userId: string,
  hoursNeeded: number,
  leaveRequestId: string,
) {
  const creditBatches = await getAvailableCreditBatches(tx, userId)

  let remainingHours = hoursNeeded
  const utilizationRecords: { leaveCreditId: string; hoursUsed: number }[] = []

  for (const batch of creditBatches) {
    if (remainingHours <= 0) break

    const hoursToDeduct = Math.min(remainingHours, batch.remaining)

    utilizationRecords.push({
      leaveCreditId: batch.id,
      hoursUsed: hoursToDeduct,
    })

    remainingHours -= hoursToDeduct
  }

  await tx.creditUtilization.createMany({
    data: utilizationRecords.map((record) => ({
      leaveRequestId,
      leaveCreditId: record.leaveCreditId,
      hoursUsed: record.hoursUsed,
    })),
  })

  const balance = await tx.leaveBalance.findUnique({
    where: { userId },
  })

  if (!balance) throw new Error('Balance not found')

  const balanceBefore = balance.availableCredits
  const balanceAfter = balanceBefore - hoursNeeded

  await tx.leaveTransaction.create({
    data: {
      userId,
      leaveRequestId,
      type: TransactionType.CREDIT_USED,
      hours: -hoursNeeded,
      balanceBefore,
      balanceAfter,
      notes: `Used ${hoursNeeded} hours for leave request`,
    },
  })

  await tx.leaveBalance.update({
    where: { userId },
    data: {
      usedCredits: { increment: hoursNeeded },
      availableCredits: { decrement: hoursNeeded },
      lastCalculatedAt: new Date(),
    },
  })

  return utilizationRecords
}

// ============================================
// API ROUTES
// ============================================

/**
 * POST /api/leave/credits
 * Admin posts leave credits to users
 */
leaveRoutes.post(
  '/credits',
  zValidator('json', postLeaveCreditsSchema),
  async (c) => {
    try {
      const { userIds, credits, hoursPerDay, expiresAt, notes } =
        c.req.valid('json')

      // Check if user is admin
      const currentUser = c.get('user')
      if (currentUser?.role !== 'admin') {
        return c.json({ error: 'Unauthorized' }, 403)
      }

      const applyToAll = userIds.length === 0

      if (applyToAll) {
        const users = await prisma.user.findMany({
          where: { banned: false },
          select: { id: true },
        })

        const results = await Promise.all(
          users.map((user) =>
            createLeaveCreditForUser({
              userId: user.id,
              credits,
              hoursPerDay,
              expiresAt,
              notes,
            }),
          ),
        )

        return c.json({
          success: true,
          message: 'Leave credits posted successfully',
          creditsPosted: results.length,
          totalHours: credits * results.length,
          data: results,
        })
      } else {
        const results = await Promise.all(
          userIds.map((userId: string) =>
            createLeaveCreditForUser({
              userId,
              credits,
              hoursPerDay,
              expiresAt,
              notes,
            }),
          ),
        )

        return c.json({
          success: true,
          message: 'Leave credits posted successfully',
          creditsPosted: results.length,
          totalHours: credits * results.length,
          data: results,
        })
      }
    } catch (error) {
      console.error('Error posting leave credits:', error)
      return c.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : 'Internal server error',
        },
        500,
      )
    }
  },
)

async function createLeaveCreditForUser(params: {
  userId: string
  credits: number
  hoursPerDay: number
  expiresAt: Date
  notes?: string
}) {
  const { userId, credits, hoursPerDay, expiresAt, notes } = params

  return await prisma.$transaction(async (tx) => {
    const leaveCredit = await tx.leaveCredit.create({
      data: {
        userId,
        credits,
        hoursPerDay,
        expiresAt,
        notes,
        postedAt: new Date(),
      },
    })

    let balance = await tx.leaveBalance.findUnique({
      where: { userId },
    })

    if (!balance) {
      balance = await tx.leaveBalance.create({
        data: {
          userId,
          totalCredits: 0,
          usedCredits: 0,
          expiredCredits: 0,
          availableCredits: 0,
        },
      })
    }

    const balanceBefore = balance.availableCredits
    const balanceAfter = balanceBefore + credits

    await tx.leaveTransaction.create({
      data: {
        userId,
        leaveCreditId: leaveCredit.id,
        type: TransactionType.CREDIT_POSTED,
        hours: credits,
        balanceBefore,
        balanceAfter,
        notes: `Posted ${credits} hours, expires ${expiresAt.toISOString()}`,
      },
    })

    await tx.leaveBalance.update({
      where: { userId },
      data: {
        totalCredits: { increment: credits },
        availableCredits: { increment: credits },
        lastCalculatedAt: new Date(),
      },
    })

    return leaveCredit
  })
}

/**
 * POST /api/leave/requests
 * User creates a leave request
 */
leaveRoutes.post(
  '/requests',
  zValidator('json', createLeaveRequestSchema),
  async (c) => {
    try {
      const { startDate, endDate, hoursPerDay, reason } = c.req.valid('json')

      // Get current user from context
      const currentUser = c.get('user')

      if (!currentUser) {
        return c.json(
          {
            success: false,
            error: `Wrong user`,
          },
          400,
        )
      }

      const userId = currentUser?.id

      const totalHours = calculateBusinessDays(startDate, endDate) * hoursPerDay

      const balance = await prisma.leaveBalance.findUnique({
        where: { userId },
      })

      const availableCredits = balance?.availableCredits || 0

      if (availableCredits < totalHours) {
        return c.json(
          {
            success: false,
            error: `Insufficient leave balance. Required: ${totalHours} hours, Available: ${availableCredits} hours`,
          },
          400,
        )
      }

      const result = await prisma.$transaction(async (tx) => {
        const leaveRequest = await tx.leaveRequest.create({
          data: {
            userId,
            startDate,
            endDate,
            hoursPerDay,
            totalHours,
            reason,
            status: 'pending',
          },
        })

        const utilizationRecords = await deductCreditsUsingFIFO(
          tx,
          userId,
          totalHours,
          leaveRequest.id,
        )

        return {
          leaveRequest,
          creditUtilization: utilizationRecords,
        }
      })

      return c.json({
        success: true,
        message: 'Leave request created successfully',
        data: result,
      })
    } catch (error) {
      console.error('Error creating leave request:', error)
      return c.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : 'Internal server error',
        },
        500,
      )
    }
  },
)

/**
 * GET /api/leave/requests
 * Get all leave requests for current user
 */
leaveRoutes.get('/requests', async (c) => {
  try {
    // Get current user from context
    const currentUser = c.get('user')
    if (!currentUser) {
      return c.json(
        {
          success: false,
          error: `Wrong user`,
        },
        400,
      )
    }

    const userId = currentUser.id

    const requests = await prisma.leaveRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return c.json({
      success: true,
      data: requests,
    })
  } catch (error) {
    console.error('Error fetching leave requests:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      500,
    )
  }
})

/**
 * GET /api/leave/requests/:id
 * Get a specific leave request
 */
leaveRoutes.get('/requests/:id', async (c) => {
  try {
    const requestId = c.req.param('id')

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        transactions: true,
      },
    })

    if (!leaveRequest) {
      return c.json(
        {
          success: false,
          error: 'Leave request not found',
        },
        404,
      )
    }

    // Get credit utilization details
    const creditUtilization = await prisma.creditUtilization.findMany({
      where: { leaveRequestId: requestId },
      include: {
        leaveCredit: {
          select: {
            id: true,
            credits: true,
            expiresAt: true,
            postedAt: true,
          },
        },
      } as never,
    })

    return c.json({
      success: true,
      data: {
        ...leaveRequest,
        creditUtilization,
      },
    })
  } catch (error) {
    console.error('Error fetching leave request:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      500,
    )
  }
})

/**
 * PATCH /api/leave/requests/:id
 * Approve or reject a leave request (Admin only)
 */
leaveRoutes.patch(
  '/requests/:id',
  zValidator('json', approveLeaveRequestSchema),
  async (c) => {
    try {
      const requestId = c.req.param('id')
      const { status, rejectionReason } = c.req.valid('json')

      // Get current user from context
      const currentUser = c.get('user')

      if (!currentUser) {
        return c.json(
          {
            success: false,
            error: `Wrong user`,
          },
          400,
        )
      }

      if (currentUser.role !== 'admin') {
        return c.json({ error: 'Unauthorized' }, 403)
      }

      const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id: requestId },
      })

      if (!leaveRequest) {
        return c.json(
          {
            success: false,
            error: 'Leave request not found',
          },
          404,
        )
      }

      if (leaveRequest.status !== 'pending') {
        return c.json(
          {
            success: false,
            error: `Cannot update request with status: ${leaveRequest.status}`,
          },
          400,
        )
      }

      const updatedRequest = await prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          status,
          //   approvedBy: approverId,
          approvedAt: status === 'approved' ? new Date() : null,
          rejectedAt: status === 'rejected' ? new Date() : null,
          rejectionReason: status === 'rejected' ? rejectionReason : null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      return c.json({
        success: true,
        message: `Leave request ${status} successfully`,
        data: updatedRequest,
      })
    } catch (error) {
      console.error('Error updating leave request:', error)
      return c.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : 'Internal server error',
        },
        500,
      )
    }
  },
)

/**
 * DELETE /api/leave/requests/:id
 * Cancel a leave request (User can only cancel their own pending requests)
 */
leaveRoutes.delete('/requests/:id', async (c) => {
  try {
    const requestId = c.req.param('id')

    // Get current user from context
    const currentUser = c.get('user')

    if (!currentUser) {
      return c.json(
        {
          success: false,
          error: `Wrong user`,
        },
        400,
      )
    }

    const userId = currentUser.id

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
    })

    if (!leaveRequest) {
      return c.json(
        {
          success: false,
          error: 'Leave request not found',
        },
        404,
      )
    }

    if (leaveRequest.userId !== userId) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized to cancel this request',
        },
        403,
      )
    }

    if (leaveRequest.status !== 'pending') {
      return c.json(
        {
          success: false,
          error: `Cannot cancel request with status: ${leaveRequest.status}`,
        },
        400,
      )
    }

    // Update status to cancelled instead of deleting
    const cancelledRequest = await prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'cancelled',
        updatedAt: new Date(),
      },
    })

    // TODO: Consider refunding the credits (reverse the FIFO deduction)
    // This would require additional logic to restore the credit utilization

    return c.json({
      success: true,
      message: 'Leave request cancelled successfully',
      data: cancelledRequest,
    })
  } catch (error) {
    console.error('Error cancelling leave request:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      500,
    )
  }
})

/**
 * GET /api/leave/balance
 * Get current user's leave balance
 */
leaveRoutes.get('/balance', async (c) => {
  try {
    // Get current user from context
    const currentUser = c.get('user')

    if (!currentUser) {
      return c.json(
        {
          success: false,
          error: `Wrong user`,
        },
        400,
      )
    }

    const userId = currentUser.id

    const balance = await prisma.leaveBalance.findUnique({
      where: { userId },
    })

    if (!balance) {
      return c.json({
        success: true,
        data: {
          totalCredits: 0,
          usedCredits: 0,
          expiredCredits: 0,
          availableCredits: 0,
          creditBatches: [],
        },
      })
    }

    // Get credit batches with details
    const creditBatches = await getAvailableCreditBatches(prisma as any, userId)

    return c.json({
      success: true,
      data: {
        totalCredits: balance.totalCredits,
        usedCredits: balance.usedCredits,
        expiredCredits: balance.expiredCredits,
        availableCredits: balance.availableCredits,
        lastCalculatedAt: balance.lastCalculatedAt,
        creditBatches: creditBatches.map((batch) => ({
          id: batch.id,
          remaining: batch.remaining,
          expiresAt: batch.expiresAt,
          postedAt: batch.postedAt,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching balance:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      500,
    )
  }
})

/**
 * GET /api/leave/balance/:userId
 * Get specific user's leave balance (Admin only)
 */
leaveRoutes.get('/balance/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')

    // Check if current user is admin
    const currentUser = c.get('user')

    if (!currentUser) {
      return c.json(
        {
          success: false,
          error: `Wrong user`,
        },
        400,
      )
    }

    if (currentUser.role !== 'admin' && currentUser.id !== userId) {
      return c.json({ error: 'Unauthorized' }, 403)
    }

    const balance = await prisma.leaveBalance.findUnique({
      where: { userId },
    })

    if (!balance) {
      return c.json({
        success: true,
        data: {
          totalCredits: 0,
          usedCredits: 0,
          expiredCredits: 0,
          availableCredits: 0,
          creditBatches: [],
        },
      })
    }

    const creditBatches = await getAvailableCreditBatches(prisma as any, userId)

    return c.json({
      success: true,
      data: {
        userId,
        totalCredits: balance.totalCredits,
        usedCredits: balance.usedCredits,
        expiredCredits: balance.expiredCredits,
        availableCredits: balance.availableCredits,
        lastCalculatedAt: balance.lastCalculatedAt,
        creditBatches: creditBatches.map((batch) => ({
          id: batch.id,
          remaining: batch.remaining,
          expiresAt: batch.expiresAt,
          postedAt: batch.postedAt,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching balance:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      500,
    )
  }
})

/**
 * GET /api/leave/transactions
 * Get transaction history for current user
 */
leaveRoutes.get(
  '/transactions',
  zValidator('query', getTransactionHistoryQuerySchema),
  async (c) => {
    try {
      const currentUser = c.get('user')

      if (!currentUser) {
        return c.json(
          {
            success: false,
            error: `Wrong user`,
          },
          400,
        )
      }

      const userId = currentUser.id

      const { limit } = c.req.valid('query')

      const transactions = await prisma.leaveTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          leaveCredit: {
            select: {
              id: true,
              credits: true,
              expiresAt: true,
              postedAt: true,
            },
          },
          leaveRequest: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              totalHours: true,
              status: true,
            },
          },
        },
      })

      return c.json({
        success: true,
        data: transactions,
      })
    } catch (error) {
      console.error('Error fetching transactions:', error)
      return c.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : 'Internal server error',
        },
        500,
      )
    }
  },
)

/**
 * POST /api/leave/expire
 * Process expired credits (Cron job endpoint)
 */
leaveRoutes.post('/expire', async (c) => {
  try {
    // This should be protected - only allow cron jobs or admin access

    const now = new Date()

    const expiredCredits = await prisma.leaveCredit.findMany({
      where: {
        expiresAt: { lte: now },
      },
    })

    const results = await Promise.all(
      expiredCredits.map((credit) => processExpiredCredit(credit)),
    )

    const totalHoursExpired = results.reduce(
      (sum, r) => sum + r.hoursExpired,
      0,
    )

    return c.json({
      success: true,
      message: 'Expired credits processed successfully',
      processed: results.length,
      totalHoursExpired,
      details: results,
    })
  } catch (error) {
    console.error('Error processing expired credits:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      500,
    )
  }
})

async function processExpiredCredit(credit: any) {
  return await prisma.$transaction(async (tx) => {
    const usedHours = await tx.creditUtilization.aggregate({
      where: { leaveCreditId: credit.id },
      _sum: { hoursUsed: true },
    })

    const remainingHours = credit.credits - (usedHours._sum.hoursUsed || 0)

    if (remainingHours <= 0) {
      return { creditId: credit.id, hoursExpired: 0 }
    }

    const balance = await tx.leaveBalance.findUnique({
      where: { userId: credit.userId },
    })

    if (!balance) throw new Error('Balance not found')

    const balanceBefore = balance.availableCredits
    const balanceAfter = balanceBefore - remainingHours

    await tx.leaveTransaction.create({
      data: {
        userId: credit.userId,
        leaveCreditId: credit.id,
        type: TransactionType.CREDIT_EXPIRED,
        hours: -remainingHours,
        balanceBefore,
        balanceAfter,
        notes: `Expired ${remainingHours} hours (batch posted on ${credit.postedAt.toISOString()})`,
      },
    })

    await tx.leaveBalance.update({
      where: { userId: credit.userId },
      data: {
        expiredCredits: { increment: remainingHours },
        availableCredits: { decrement: remainingHours },
        lastCalculatedAt: new Date(),
      },
    })

    return { creditId: credit.id, hoursExpired: remainingHours }
  })
}

/**
 * GET /api/leave/admin/requests
 * Get all leave requests (Admin only)
 */
leaveRoutes.get('/admin/requests', async (c) => {
  try {
    // Check if user is admin
    const currentUser = c.get('user')

    if (currentUser?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 403)
    }

    const status = c.req.query('status') // Filter by status
    const userId = c.req.query('userId') // Filter by user

    const requests = await prisma.leaveRequest.findMany({
      where: {
        ...(status && { status }),
        ...(userId && { userId }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return c.json({
      success: true,
      data: requests,
    })
  } catch (error) {
    console.error('Error fetching admin requests:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      500,
    )
  }
})

/**
 * GET /api/leave/admin/balances
 * Get all user balances (Admin only)
 */
leaveRoutes.get('/admin/balances', async (c) => {
  try {
    // Check if user is admin
    const currentUser = c.get('user')

    if (!currentUser) {
      return c.json(
        {
          success: false,
          error: `Wrong user`,
        },
        400,
      )
    }

    if (currentUser.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 403)
    }

    const balances = await prisma.leaveBalance.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        availableCredits: 'desc',
      },
    })

    return c.json({
      success: true,
      data: balances,
    })
  } catch (error) {
    console.error('Error fetching admin balances:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      500,
    )
  }
})

export default leaveRoutes
