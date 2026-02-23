"use client";

import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import { Composer } from "./composer";
import { Zap, MessageSquare } from "lucide-react";

interface ChatAreaProps {
  conversationId: string;
}

export function ChatArea({ conversationId }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages, refetch } = trpc.workspace.getMessages.useQuery(
    { conversationId },
    { refetchInterval: 5000 }
  );

  const { data: shortcuts } = trpc.shortcut.list.useQuery();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {(!messages || messages.length === 0) && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Kinsen Ops Workspace</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Type a message or use <kbd className="rounded border px-1 text-xs">/</kbd> commands
                to query fleet, tasks, incidents, finance, and more.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {[
                  { cmd: "/fleet", label: "Show fleet" },
                  { cmd: "/tasks", label: "View tasks" },
                  { cmd: "/finance", label: "Finance summary" },
                  { cmd: "/incidents", label: "Open incidents" },
                ].map((s) => (
                  <button
                    key={s.cmd}
                    className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                    onClick={() => {
                      const event = new CustomEvent("workspace:inject-command", {
                        detail: s.cmd,
                      });
                      window.dispatchEvent(event);
                    }}
                  >
                    <MessageSquare className="h-3 w-3" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages?.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              toolName={msg.toolName}
              toolOutput={msg.toolOutput as Record<string, unknown> | null}
              createdAt={msg.createdAt}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="mx-auto w-full max-w-3xl">
        <Composer
          conversationId={conversationId}
          onMessageSent={() => refetch()}
          shortcuts={shortcuts || []}
        />
      </div>
    </div>
  );
}
