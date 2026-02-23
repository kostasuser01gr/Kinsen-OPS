"use client";

import { useState, useRef, useEffect } from "react";
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
import { Send, Slash, Zap } from "lucide-react";

interface ComposerProps {
  conversationId: string;
  onMessageSent: () => void;
  shortcuts: Array<{
    id: string;
    name: string;
    icon?: string | null;
    actionType: string;
    promptTemplate?: string | null;
    toolName?: string | null;
    defaultInputs?: unknown;
  }>;
}

export function Composer({ conversationId, onMessageSent, shortcuts }: ComposerProps) {
  const [input, setInput] = useState("");
  const [showCommands, setShowCommands] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    // Check for slash command
    if (text.startsWith("/")) {
      const parts = text.slice(1).split(/\s+/);
      const cmdName = parts[0]?.toLowerCase();
      const sc = slashCommands.find((s) => s.command.slice(1) === cmdName);

      if (sc) {
        // Store user message first
        await sendMessage.mutateAsync({ conversationId, content: text });
        // Parse args
        const args: Record<string, string> = {};
        parts.slice(1).forEach((p, i) => {
          if (p.includes("=")) {
            const [k, ...v] = p.split("=");
            args[k] = v.join("=");
          } else {
            args[`arg${i}`] = p;
          }
        });
        // Execute tool
        await executeTool.mutateAsync({
          conversationId,
          toolName: sc.toolName,
          input: args,
        });
        return;
      }
    }

    // Plain message
    await sendMessage.mutateAsync({ conversationId, content: text });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSlashSelect(cmd: typeof slashCommands[0]) {
    setInput(cmd.command + " ");
    setShowCommands(false);
    textareaRef.current?.focus();
  }

  function handleShortcut(sc: typeof shortcuts[0]) {
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

  return (
    <div className="border-t bg-card p-3">
      {/* Shortcut bar */}
      {shortcuts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {shortcuts.map((sc) => (
            <Button
              key={sc.id}
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => handleShortcut(sc)}
              disabled={isLoading}
            >
              <Zap className="h-3 w-3" />
              {sc.name}
            </Button>
          ))}
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
  );
}
