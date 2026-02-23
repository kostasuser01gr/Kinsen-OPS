"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Zap, MessageSquare, Loader2, Car, ListTodo, DollarSign, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

export default function WorkspacePage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const createConv = trpc.workspace.createConversation.useMutation({
    onError: (err) => {
      setPendingAction(null);
      toast.error("Failed to create conversation", { description: err.message });
    },
  });

  const sendMessage = trpc.workspace.sendMessage.useMutation({
    onError: (err) => {
      toast.error("Failed to send message", { description: err.message });
    },
  });

  const executeTool = trpc.toolExec.execute.useMutation({
    onError: (err) => {
      toast.error("Failed to execute tool", { description: err.message });
    },
  });

  async function handleNewChat() {
    setPendingAction("new");
    try {
      const conv = await createConv.mutateAsync({});
      utils.workspace.listConversations.invalidate();
      router.push(`/workspace/c/${conv.id}`);
    } catch {
      // error already handled by onError
    } finally {
      setPendingAction(null);
    }
  }

  async function handleQuickAction(cmd: string, toolName: string) {
    setPendingAction(cmd);
    try {
      const conv = await createConv.mutateAsync({});
      utils.workspace.listConversations.invalidate();
      await sendMessage.mutateAsync({
        conversationId: conv.id,
        content: cmd,
      });
      await executeTool.mutateAsync({
        conversationId: conv.id,
        toolName,
        input: {},
      });
      router.push(`/workspace/c/${conv.id}`);
    } catch {
      // error already handled by onError
    } finally {
      setPendingAction(null);
    }
  }

  const isLoading = pendingAction !== null;

  const quickActions = [
    { label: "Fleet Status", desc: "View all vehicles", cmd: "/fleet", toolName: "fleet.list", icon: Car },
    { label: "Active Tasks", desc: "See pending work", cmd: "/tasks", toolName: "task.list", icon: ListTodo },
    { label: "Finance", desc: "Revenue overview", cmd: "/finance", toolName: "finance.summary", icon: DollarSign },
    { label: "Incidents", desc: "Open incidents", cmd: "/incidents", toolName: "incident.list", icon: AlertTriangle },
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <Zap className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Kinsen Ops Workspace</h1>
        <p className="mt-2 text-muted-foreground">
          Your operational command center. Start a new conversation to query
          fleet, tasks, incidents, finance — or use shortcuts for quick actions.
        </p>

        <Button
          className="mt-6 gap-2"
          size="lg"
          onClick={handleNewChat}
          disabled={isLoading}
        >
          {pendingAction === "new" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
          {pendingAction === "new" ? "Creating..." : "Start New Chat"}
        </Button>

        <div className="mt-8 grid grid-cols-2 gap-3 w-full">
          {quickActions.map((item) => (
            <button
              key={item.cmd}
              className="rounded-lg border bg-card p-3 text-left hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-start gap-2"
              onClick={() => handleQuickAction(item.cmd, item.toolName)}
              disabled={isLoading}
            >
              <item.icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">
                  {pendingAction === item.cmd ? "Loading..." : item.label}
                </p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
