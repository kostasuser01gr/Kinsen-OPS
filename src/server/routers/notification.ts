import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";

export const notificationRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        unreadOnly: z.boolean().default(false),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { unreadOnly, page = 1, limit = 20 } = input ?? {};
      const where: Record<string, unknown> = { userId: ctx.user.id };
      if (unreadOnly) where.isRead = false;

      const [notifications, total, unreadCount] = await Promise.all([
        ctx.db.notification.findMany({
          where: where as never,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.db.notification.count({ where: where as never }),
        ctx.db.notification.count({ where: { userId: ctx.user.id, isRead: false } }),
      ]);

      return { notifications, total, unreadCount, page, limit };
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.notification.count({
      where: { userId: ctx.user.id, isRead: false },
    });
    return { count };
  }),

  markRead: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.notification.updateMany({
        where: { id: { in: input.ids }, userId: ctx.user.id },
        data: { isRead: true, readAt: new Date() },
      });
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.notification.updateMany({
      where: { userId: ctx.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }),
});
