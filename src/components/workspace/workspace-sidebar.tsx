"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  MessageSquare,
  Pin,
  Trash2,
  Car,
  FileText,
  ListTodo,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Shield,
  ChevronLeft,
  Zap,
} from "lucide-react";

const legacyNav = [
  { label: "Fleet", href: "/fleet", icon: Car },
  { label: "Rentals", href: "/rentals", icon: FileText },
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Finance", href: "/finance", icon: DollarSign },
  { label: "Incidents", href: "/incidents", icon: AlertTriangle },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Audit Log", href: "/audit", icon: Shield },
];

export function WorkspaceSidebar({
  activeConversationId,
}: {
  activeConversationId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [showLegacy, setShowLegacy] = useState(false);

  const { data: conversations, refetch } =
    trpc.workspace.listConversations.useQuery();
  const createConv = trpc.workspace.createConversation.useMutation({
    onSuccess: (conv) => {
      refetch();
      router.push(`/workspace/c/${conv.id}`);
    },
  });
  const deleteConv = trpc.workspace.deleteConversation.useMutation({
    onSuccess: () => refetch(),
  });
  const togglePin = trpc.workspace.togglePin.useMutation({
    onSuccess: () => refetch(),
  });

  return (
    <aside className="flex w-64 flex-col border-r bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-3">
        <Link href="/workspace" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold">Kinsen Ops</span>
        </Link>
      </div>

      {/* New Chat */}
      <div className="p-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => createConv.mutate({})}
          disabled={createConv.isPending}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1">
        <div className="space-y-0.5 px-2">
          {conversations?.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const preview =
              conv.title || conv.messages[0]?.content?.slice(0, 40) || "New conversation";
            return (
              <div
                key={conv.id}
                className={cn(
                  "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Link
                  href={`/workspace/c/${conv.id}`}
                  className="flex flex-1 items-center gap-2 min-w-0"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{preview}</span>
                  {conv.isPinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
                </Link>
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button
                    className="p-0.5 rounded hover:bg-muted-foreground/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin.mutate({ id: conv.id });
                    }}
                  >
                    <Pin className="h-3 w-3" />
                  </button>
                  <button
                    className="p-0.5 rounded hover:bg-destructive/10 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConv.mutate({ id: conv.id });
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Legacy Nav Toggle */}
      <div className="border-t">
        <button
          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowLegacy(!showLegacy)}
        >
          <ChevronLeft
            className={cn("h-3 w-3 transition-transform", showLegacy && "-rotate-90")}
          />
          Dashboard Pages
        </button>
        {showLegacy && (
          <nav className="space-y-0.5 px-2 pb-2">
            {legacyNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </aside>
  );
}
