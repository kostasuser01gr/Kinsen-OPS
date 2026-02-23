"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Zap, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspacePage() {
  const router = useRouter();
  const createConv = trpc.workspace.createConversation.useMutation({
    onSuccess: (conv) => {
      router.push(`/workspace/c/${conv.id}`);
    },
  });

  function handleNewChat() {
    createConv.mutate({});
  }

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
          disabled={createConv.isPending}
        >
          <MessageSquare className="h-4 w-4" />
          Start New Chat
        </Button>

        <div className="mt-8 grid grid-cols-2 gap-3 w-full">
          {[
            { label: "Fleet Status", desc: "View all vehicles", cmd: "/fleet" },
            { label: "Active Tasks", desc: "See pending work", cmd: "/tasks" },
            { label: "Finance", desc: "Revenue overview", cmd: "/finance" },
            { label: "Incidents", desc: "Open incidents", cmd: "/incidents" },
          ].map((item) => (
            <button
              key={item.cmd}
              className="rounded-lg border bg-card p-3 text-left hover:bg-muted transition-colors"
              onClick={handleNewChat}
            >
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
