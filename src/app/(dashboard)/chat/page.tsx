"use client";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Plus, Send } from "lucide-react";
import { useState } from "react";
import { useRealtimeChat } from "@/hooks/use-realtime";

export default function ChatPage() {
  const { data: channels, isLoading } = trpc.chat.listChannels.useQuery();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useRealtimeChat(selectedChannelId);

  const { data: messagesData } = trpc.chat.getMessages.useQuery(
    { channelId: selectedChannelId! },
    { enabled: !!selectedChannelId }
  );

  const sendMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => setMessage(""),
  });

  const handleSend = () => {
    if (!message.trim() || !selectedChannelId) return;
    sendMutation.mutate({ channelId: selectedChannelId, content: message });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Channel list */}
      <Card className="w-72 shrink-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Channels</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-14rem)]">
            {isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading...</p>
            ) : channels?.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No channels</p>
            ) : (
              channels?.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChannelId(ch.id)}
                  className={`w-full p-3 text-left hover:bg-muted transition-colors ${
                    selectedChannelId === ch.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">
                      {ch.name ?? ch.participants.map((p) => p.user.name).join(", ")}
                    </span>
                  </div>
                  {ch.messages[0] && (
                    <p className="mt-1 text-xs text-muted-foreground truncate">
                      {ch.messages[0].sender.name}: {ch.messages[0].content}
                    </p>
                  )}
                </button>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Message area */}
      <Card className="flex-1 flex flex-col">
        {selectedChannelId ? (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messagesData?.messages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {msg.sender.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium">{msg.sender.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="border-t p-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                />
                <Button size="icon" onClick={handleSend} disabled={!message.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="mx-auto h-10 w-10 mb-2" />
              <p>Select a channel to start chatting</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
