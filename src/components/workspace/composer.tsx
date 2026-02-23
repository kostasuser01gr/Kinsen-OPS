"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Send, Slash, Zap, AlertTriangle, Lock } from "lucide-react";
import {
  validateShortcutExecution,
  type ShortcutDef,
  type ShortcutValidation,
} from "@/lib/shortcut-validation";

interface ShortcutItem {
  id: string;
  name: string;
  icon?: string | null;
  actionType: string;
  promptTemplate?: string | null;
  toolName?: string | null;
  toolSequence?: unknown;
  defaultInputs?: unknown;
  isActive: boolean;
  permissionScopeRequired?: string | null;
}

interface ComposerProps {
  conversationId: string;
  onMessageSent: () => void;
  shortcuts: ShortcutItem[];
}

export function Composer({ conversationId, onMessageSent, shortcuts }: ComposerProps) {
  const [input, setInput] = useState("");
  const [showCommands, setShowCommands] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string } | undefined)?.role ?? "";

  const sendMessage = trpc.workspace.sendMessage.useMutation({
    onSuccess: () => onMessageSent(),
  });
  const executeTool = trpc.toolExec.execute.useMutation({
    onSuccess: () => onMessageSent(),
  });

  const slashCommands = [
    { command: "/fleet", description: "List fleet vehicles", toolName: "fleet.list" },
    { command: "/fleet-stats", description: "Fleet status summary", toolName: "fleet.stats" },
    { command: "/tasks", description: "List tasks", toolName: "task.list" },
    { command: "/incidents", description: "List open incidents", toolName: "incident.list" },
    { command: "/finance", description: "Finance overview", toolName: "finance.summary" },
    { command: "/rentals", description: "Active rentals", toolName: "rentals.active" },
  ];

  // Pre-validate all shortcuts
  const shortcutStates = useMemo(() => {
    const context = { conversationId, entityId: null, entityType: null, entityState: null };
    const map = new Map<string, ShortcutValidation>();
    for (const sc of shortcuts) {
      map.set(sc.id, validateShortcutExecution(sc as ShortcutDef, context, userRole));
    }
    return map;
  }, [shortcuts, conversationId, userRole]);

  useEffect(() => {
    if (input === "/") {
      setShowCommands(true);
    } else if (!input.startsWith("/")) {
      setShowCommands(false);
    }
  }, [input]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setShowCommands(false);

    if (text.startsWith("/")) {
      const parts = text.slice(1).split(/\s+/);
      const cmdName = parts[0]?.toLowerCase();
      const sc = slashCommands.find((s) => s.command.slice(1) === cmdName);

      if (sc) {
        await sendMessage.mutateAsync({ conversationId, content: text });
        const args: Record<string, string> = {};
        parts.slice(1).forEach((p, i) => {
          if (p.includes("=")) {
            const [k, ...v] = p.split("=");
            args[k] = v.join("=");
          } else {
            args[`arg${i}`] = p;
          }
        });
        await executeTool.mutateAsync({
          conversationId,
          toolName: sc.toolName,
          input: args,
        });
        return;
      }
    }

    await sendMessage.mutateAsync({ conversationId, content: text });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSlashSelect(cmd: (typeof slashCommands)[0]) {
    setInput(cmd.command + " ");
    setShowCommands(false);
    textareaRef.current?.focus();
  }

  function handleShortcut(sc: ShortcutItem) {
    // Run precheck before dispatch
    const validation = shortcutStates.get(sc.id);
    if (!validation?.enabled) return;

    if (sc.actionType === "prompt_template" && sc.promptTemplate) {
      setInput(sc.promptTemplate);
      textareaRef.current?.focus();
    } else if (sc.actionType === "tool_action" && sc.toolName) {
      sendMessage.mutate(
        { conversationId, content: `⚡ ${sc.name}` },
        {
          onSuccess: () => {
            executeTool.mutate({
              conversationId,
              toolName: sc.toolName!,
              input: (sc.defaultInputs as Record<string, unknown>) || {},
            });
          },
        }
      );
    }
  }

  const isLoading = sendMessage.isPending || executeTool.isPending;

  // Filter visible shortcuts
  const visibleShortcuts = shortcuts.filter((sc) => {
    const v = shortcutStates.get(sc.id);
    return v?.visible !== false;
  });

  return (
    <TooltipProvider delayDuration={200}>
      <div className="border-t bg-card p-3">
        {/* Shortcut bar */}
        {visibleShortcuts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {visibleShortcuts.map((sc) => {
              const validation = shortcutStates.get(sc.id)!;
              const disabled = isLoading || !validation.enabled;
              const icon = !validation.configValid ? (
                <AlertTriangle className="h-3 w-3 text-amber-500" />
              ) : validation.missingPermissions.length > 0 ? (
                <Lock className="h-3 w-3 text-muted-foreground" />
              ) : (
                <Zap className="h-3 w-3" />
              );

              const button = (
                <Button
                  key={sc.id}
                  variant="outline"
                  size="sm"
                  className={`h-7 text-xs gap-1 ${
                    disabled && !isLoading ? "opacity-50 cursor-not-allowed border-dashed" : ""
                  }`}
                  onClick={() => handleShortcut(sc)}
                  disabled={disabled}
                >
                  {icon}
                  {sc.name}
                  {!validation.configValid && (
                    <span className="text-[9px] text-amber-500 ml-0.5">⚠</span>
                  )}
                </Button>
              );

              // Show tooltip with reason when disabled
              if (validation.disabledReason) {
                return (
                  <Tooltip key={sc.id}>
                    <TooltipTrigger asChild>
                      {/* Wrap in span so tooltip works on disabled buttons */}
                      <span tabIndex={0} className="inline-flex">
                        {button}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-xs">
                      {validation.disabledReason}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return button;
            })}
          </div>
        )}

        {/* Composer */}
        <div className="relative flex items-end gap-2">
          <Popover open={showCommands} onOpenChange={setShowCommands}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => {
                  setShowCommands(!showCommands);
                  if (!input.startsWith("/")) setInput("/");
                  textareaRef.current?.focus();
                }}
              >
                <Slash className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-64" align="start" side="top">
              <Command>
                <CommandList>
                  <CommandEmpty>No commands found</CommandEmpty>
                  <CommandGroup heading="Commands">
                    {slashCommands.map((cmd) => (
                      <CommandItem
                        key={cmd.command}
                        onSelect={() => handleSlashSelect(cmd)}
                        className="cursor-pointer"
                      >
                        <Badge variant="outline" className="mr-2 text-[10px] font-mono">
                          {cmd.command}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{cmd.description}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message or / for commands..."
            className="min-h-[40px] max-h-[120px] resize-none"
            rows={1}
            disabled={isLoading}
          />

          <Button
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
