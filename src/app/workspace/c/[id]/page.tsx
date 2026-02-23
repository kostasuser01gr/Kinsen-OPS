"use client";

import { use } from "react";
import { ChatArea } from "@/components/workspace/chat-area";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ChatArea conversationId={id} />;
}
