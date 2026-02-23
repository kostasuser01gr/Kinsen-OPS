import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";

export const workspaceRouter = router({
  listConversations: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.conversation.findMany({
      where: { userId: ctx.user.id },
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      take: 50,
      select: {
        id: true,
        title: true,
        isPinned: true,
        updatedAt: true,
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { content: true, role: true },
        },
      },
    });
  }),

  createConversation: protectedProcedure
    .input(z.object({ title: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.conversation.create({
        data: { userId: ctx.user.id, title: input.title },
      });
    }),

  deleteConversation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.conversation.deleteMany({
        where: { id: input.id, userId: ctx.user.id },
      });
      return { success: true };
    }),

  togglePin: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const conv = await ctx.db.conversation.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!conv) return null;
      return ctx.db.conversation.update({
        where: { id: input.id },
        data: { isPinned: !conv.isPinned },
      });
    }),

  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const conv = await ctx.db.conversation.findFirst({
        where: { id: input.conversationId, userId: ctx.user.id },
      });
      if (!conv) return [];

      return ctx.db.message.findMany({
        where: { conversationId: input.conversationId },
        orderBy: { createdAt: "asc" },
        take: 200,
      });
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const msg = await ctx.db.message.create({
        data: {
          conversationId: input.conversationId,
          role: "user",
          content: input.content,
        },
      });

      // Update conversation title if first message
      const count = await ctx.db.message.count({
        where: { conversationId: input.conversationId },
      });
      if (count === 1) {
        await ctx.db.conversation.update({
          where: { id: input.conversationId },
          data: { title: input.content.slice(0, 60) },
        });
      } else {
        await ctx.db.conversation.update({
          where: { id: input.conversationId },
          data: { updatedAt: new Date() },
        });
      }

      return msg;
    }),
});
