import { z } from "zod";
import { router, protectedProcedure, permissionProcedure } from "@/server/trpc";
import { PaymentStatus, PaymentMethod, PaymentType, ReconciliationState } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export const financeRouter = router({
  listPayments: protectedProcedure
    .input(
      z.object({
        rentalId: z.string().optional(),
        status: z.nativeEnum(PaymentStatus).optional(),
        type: z.nativeEnum(PaymentType).optional(),
        reconciliationState: z.nativeEnum(ReconciliationState).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { rentalId, status, type, reconciliationState, page = 1, limit = 20 } = input ?? {};
      const where = {
        ...(rentalId && { rentalId }),
        ...(status && { status }),
        ...(type && { type }),
        ...(reconciliationState && { reconciliationState }),
      };

      const [payments, total] = await Promise.all([
        ctx.db.payment.findMany({
          where,
          include: {
            rental: {
              select: {
                id: true,
                contractNumber: true,
                customer: { select: { firstName: true, lastName: true } },
              },
            },
            approvedBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.db.payment.count({ where }),
      ]);

      return { payments, total, page, limit, totalPages: Math.ceil(total / limit) };
    }),

  createPayment: permissionProcedure("finance:write")
    .input(
      z.object({
        rentalId: z.string(),
        amount: z.number().positive(),
        method: z.nativeEnum(PaymentMethod),
        type: z.nativeEnum(PaymentType),
        invoiceRef: z.string().optional(),
        receiptRef: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.payment.create({
        data: { ...input, status: "PAID", paidAt: new Date() },
      });

      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: "payment.create",
          entityType: "Payment",
          entityId: payment.id,
          newState: { amount: input.amount, type: input.type, method: input.method },
        },
      });

      return payment;
    }),

  requestRefund: permissionProcedure("finance:write")
    .input(
      z.object({
        paymentId: z.string(),
        amount: z.number().positive(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const original = await ctx.db.payment.findUnique({ where: { id: input.paymentId } });
      if (!original) throw new TRPCError({ code: "NOT_FOUND" });

      const refund = await ctx.db.payment.create({
        data: {
          rentalId: original.rentalId,
          amount: -input.amount,
          method: original.method,
          type: "REFUND",
          status: "REFUND_PENDING",
          reason: input.reason,
          notes: `Refund for payment ${input.paymentId}`,
        },
      });

      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: "payment.request_refund",
          entityType: "Payment",
          entityId: refund.id,
          newState: { amount: -input.amount, reason: input.reason, originalPaymentId: input.paymentId },
        },
      });

      return refund;
    }),

  approveRefund: permissionProcedure("finance:approve_refund")
    .input(z.object({ paymentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.payment.findUnique({ where: { id: input.paymentId } });
      if (!payment) throw new TRPCError({ code: "NOT_FOUND" });
      if (payment.status !== "REFUND_PENDING") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Payment is not pending refund approval" });
      }

      const updated = await ctx.db.payment.update({
        where: { id: input.paymentId },
        data: { status: "REFUNDED", approvedById: ctx.user.id, paidAt: new Date() },
      });

      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: "payment.approve_refund",
          entityType: "Payment",
          entityId: input.paymentId,
          previousState: { status: "REFUND_PENDING" },
          newState: { status: "REFUNDED", approvedById: ctx.user.id },
        },
      });

      return updated;
    }),

  exceptions: permissionProcedure("finance:read")
    .input(z.object({ branchId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const [pendingRefunds, mismatched, overdue] = await Promise.all([
        ctx.db.payment.count({ where: { status: "REFUND_PENDING" } }),
        ctx.db.payment.count({ where: { reconciliationState: "MISMATCHED" } }),
        ctx.db.payment.count({ where: { status: "OVERDUE" } }),
      ]);

      return { pendingRefunds, mismatched, overdue };
    }),
});
