"use client";
import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, ArrowLeft, Users, Check, CheckCheck } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { CardLoader } from "@/components/shared/LoadingSpinner";
import { cn, getInitials } from "@/lib/utils";
import {
  useConversations,
  useDMMessages,
  useRealtimeDM,
  useSendDM,
  useMarkDMRead,
} from "@/lib/hooks/use-dm";
import { useMembers } from "@/lib/hooks/use-members";
import { useAuth } from "@/lib/hooks/use-auth";
import { useMessStore } from "@/lib/stores/mess.store";
import type { MemberRole } from "@/lib/types";
import { useLanguage } from "@/lib/hooks/use-language";
import { usePreferences } from "@/lib/hooks/use-preferences";

const MANAGER_ROLES: MemberRole[] = ["owner", "admin", "manager", "assistant_manager"];

export default function ChatPage() {
  const { t } = useLanguage();
  const { formatTimePref } = usePreferences();
  const { user } = useAuth();
  const { activeMess } = useMessStore();
  const { data: conversations = [], isLoading: convsLoading } = useConversations();
  const { data: members = [] } = useMembers();

  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading: msgsLoading } = useDMMessages(selectedPartnerId ?? "");
  const send = useSendDM(selectedPartnerId ?? "");
  const markRead = useMarkDMRead(selectedPartnerId ?? "");
  useRealtimeDM(selectedPartnerId ?? "");

  // Contacts: members who are manager-level or above (always can DM), or anyone
  const contacts = members.filter((m) => m.user_id !== user?.id);
  const managersFirst = [
    ...contacts.filter((m) => MANAGER_ROLES.includes(m.role as MemberRole)),
    ...contacts.filter((m) => !MANAGER_ROLES.includes(m.role as MemberRole)),
  ];

  const selectedPartner = members.find((m) => m.user_id === selectedPartnerId);
  const selectedPartnerProfile = selectedPartner?.user as {
    full_name?: string;
    avatar_url?: string;
  } | null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedPartnerId) {
      markRead.mutate();
    }
  }, [selectedPartnerId, messages.length]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !selectedPartnerId) return;
    setInputText("");
    await send.mutateAsync(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getConvForPartner = (userId: string) =>
    conversations.find((c) => c.partner_id === userId);

  if (!activeMess) return null;

  return (
    <div className="space-y-4 animate-fade-in h-[calc(100vh-8rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100%-5rem)]">
        {/* Contacts list */}
        <Card className={cn(
          "flex flex-col overflow-hidden",
          selectedPartnerId ? "hidden lg:flex" : "flex"
        )}>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t.chat.membersLabel} ({contacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-2 space-y-1">
            {convsLoading ? (
              <CardLoader />
            ) : managersFirst.length === 0 ? (
              <EmptyState
                icon={<Users className="h-6 w-6" />}
                title={t.chat.noMembers}
                description={t.chat.addMembersNote}
              />
            ) : (
              managersFirst.map((member) => {
                const profile = member.user as { full_name?: string; avatar_url?: string } | null;
                const conv = getConvForPartner(member.user_id);
                const isSelected = selectedPartnerId === member.user_id;
                const isManager = MANAGER_ROLES.includes(member.role as MemberRole);
                return (
                  <button
                    key={member.id}
                    onClick={() => setSelectedPartnerId(member.user_id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left",
                      isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {getInitials(profile?.full_name ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                      {isManager && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{profile?.full_name ?? t.chat.memberLabel}</p>
                      {conv ? (
                        <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{isManager ? t.chat.managerLabel : t.chat.memberLabel}</p>
                      )}
                    </div>
                    {conv && conv.unread_count > 0 && (
                      <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Chat window */}
        <Card className={cn(
          "lg:col-span-2 flex flex-col overflow-hidden",
          !selectedPartnerId ? "hidden lg:flex" : "flex"
        )}>
          {!selectedPartnerId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t.chat.selectMember}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="lg:hidden h-8 w-8"
                  onClick={() => setSelectedPartnerId(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarImage src={selectedPartnerProfile?.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {getInitials(selectedPartnerProfile?.full_name ?? "?")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{selectedPartnerProfile?.full_name ?? t.chat.memberLabel}</p>
                  <p className="text-xs text-muted-foreground">{selectedPartner?.role}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgsLoading ? (
                  <CardLoader />
                ) : messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t.chat.startConversation}</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex", isMine ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                            isMine
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          )}
                        >
                          <p className="break-words">{msg.content}</p>
                          <div className={cn(
                            "flex items-center gap-1 mt-1",
                            isMine ? "justify-end" : "justify-start"
                          )}>
                            <span className={cn(
                              "text-[10px]",
                              isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {formatTimePref(new Date(msg.created_at))}
                            </span>
                            {isMine && (
                              msg.is_read
                                ? <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
                                : <Check className="h-3 w-3 text-primary-foreground/70" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t flex items-center gap-2">
                <Input
                  placeholder={t.chat.messagePlaceholder}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                  autoComplete="off"
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!inputText.trim() || send.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
