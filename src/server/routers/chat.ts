import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { ChannelType, LinkedEntityType } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export const chatRouter = router({
  listChannels: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.chatChannel.findMany({
      where: {
        participants: { some: { userId: ctx.session.user.id } },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { id: true, name: true } } },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }),

  getMessages: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify participation
      const participant = await ctx.db.chatParticipant.findUnique({
        where: { channelId_userId: { channelId: input.channelId, userId: ctx.session.user.id } },
      });
      if (!participant) throw new TRPCError({ code: "FORBIDDEN", message: "Not a channel participant" });

      const messages = await ctx.db.chatMessage.findMany({
        where: { channelId: input.channelId },
        include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
      });

      let nextCursor: string | undefined;
      if (messages.length > input.limit) {
        nextCursor = messages.pop()!.id;
      }

      // Update last read
      await ctx.db.chatParticipant.update({
        where: { channelId_userId: { channelId: input.channelId, userId: ctx.session.user.id } },
        data: { lastReadAt: new Date() },
      });

      return { messages: messages.reverse(), nextCursor };
    }),

  sendMessage: protectedProcedure
    .input(z.object({ channelId: z.string(), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const participant = await ctx.db.chatParticipant.findUnique({
        where: { channelId_userId: { channelId: input.channelId, userId: ctx.session.user.id } },
      });
      if (!participant) throw new TRPCError({ code: "FORBIDDEN" });

      const message = await ctx.db.chatMessage.create({
        data: {
          channelId: input.channelId,
          senderId: ctx.session.user.id,
          content: input.content,
        },
        include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
      });

      await ctx.db.chatChannel.update({
        where: { id: input.channelId },
        data: { updatedAt: new Date() },
      });

      return message;
    }),

  createChannel: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        type: z.nativeEnum(ChannelType),
        branchId: z.string().optional(),
        linkedEntityType: z.nativeEnum(LinkedEntityType).optional(),
        linkedEntityId: z.string().optional(),
        participantIds: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { participantIds, ...channelData } = input;
      const allParticipants = [...new Set([ctx.session.user.id, ...participantIds])];

      const channel = await ctx.db.chatChannel.create({
        data: {
          ...channelData,
          participants: {
            create: allParticipants.map((userId) => ({ userId })),
          },
        },
        include: {
          participants: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
      });

      return channel;
    }),
});
