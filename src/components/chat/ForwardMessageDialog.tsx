"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CheckCircle2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Message } from "@/types/base";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useFriendStore } from "@/stores/friendStore";
import { getUserInitials } from "@/utils/userUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ForwardMessageDialogProps {
  message: Message | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ForwardMessageDialog({
  message,
  isOpen,
  onOpenChange,
}: ForwardMessageDialogProps) {
  const [selectedRecipients, setSelectedRecipients] = useState<
    Array<{ type: "USER" | "GROUP"; id: string; name: string }>
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [forwardSuccess, setForwardSuccess] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [activeTab, setActiveTab] = useState("conversations");

  const { forwardMessageToRecipients } = useChatStore();
  const { conversations } = useConversationsStore();
  const { friends, fetchFriends, isLoading } = useFriendStore();

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedRecipients([]);
      setSearchQuery("");
      setForwardSuccess(false);
      setIsForwarding(false);
      setActiveTab("conversations");
      fetchFriends();
    }
  }, [isOpen, fetchFriends]);

  const handleForwardMessage = async () => {
    if (!message || selectedRecipients.length === 0) return;

    setIsForwarding(true);

    const recipients = selectedRecipients.map((recipient) => ({
      type: recipient.type,
      id: recipient.id,
    }));

    const success = await forwardMessageToRecipients(message.id, recipients);

    if (success) {
      setForwardSuccess(true);
      // Auto close the dialog after success
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    } else {
      setIsForwarding(false);
    }
  };

  const toggleRecipient = (
    type: "USER" | "GROUP",
    id: string,
    name: string,
  ) => {
    // Prevent selecting the original sender or group
    if (message) {
      // Don't allow selecting the original sender
      if (message.senderId === id) {
        return;
      }

      // Don't allow selecting the original group
      if (message.groupId && message.groupId === id) {
        return;
      }
    }

    setSelectedRecipients((prev) => {
      const exists = prev.some((r) => r.id === id && r.type === type);

      if (exists) {
        return prev.filter((r) => !(r.id === id && r.type === type));
      } else {
        return [...prev, { type, id, name }];
      }
    });
  };

  // Filter conversations based on search query and exclude original sender/group
  const filteredConversations = conversations.filter((conv) => {
    const fullName = conv.contact.userInfo?.fullName?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();

    // Exclude the original sender or group of the message
    if (message) {
      // For user messages, exclude the original sender
      if (
        message.senderId === conv.contact.id ||
        message.receiverId === conv.contact.id
      ) {
        return false;
      }

      // For group messages, exclude the original group
      if (message.groupId && message.groupId === conv.contact.id) {
        return false;
      }
    }

    return fullName.includes(query);
  });

  // Filter friends based on search query and exclude original sender
  const filteredFriends = friends.filter((friend) => {
    const fullName = friend.fullName?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();

    // Exclude the original sender of the message
    if (message && message.senderId === friend.id) {
      return false;
    }

    return fullName.includes(query);
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Chuyển tiếp tin nhắn</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {!forwardSuccess ? (
            <>
              <div className="border rounded-md flex items-center px-3  mb-2">
                <Search className="h-4 w-4 text-gray-500 mr-2" />
                <Input
                  placeholder="Tìm kiếm người nhận..."
                  className="border-0 focus-visible:ring-0 shadow-none focus-visible:ring-offset-0 p-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {selectedRecipients.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1">
                  {selectedRecipients.map((recipient) => (
                    <div
                      key={`${recipient.type}-${recipient.id}`}
                      className="bg-blue-100 text-blue-800 text-xs rounded-full px-2 py-1 flex items-center gap-1"
                    >
                      <span>{recipient.name}</span>
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() =>
                          toggleRecipient(
                            recipient.type,
                            recipient.id,
                            recipient.name,
                          )
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="conversations">Gần đây</TabsTrigger>
                  <TabsTrigger value="friends">Danh sách bạn bè</TabsTrigger>
                </TabsList>

                <TabsContent value="conversations" className="mt-0">
                  <div className="flex-1 mb-4 border rounded-md h-[300px]">
                    <ScrollArea className="h-full">
                      <div className="divide-y">
                        {filteredConversations.map((conversation) => (
                          <div
                            key={conversation.contact.id}
                            className={`p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer ${
                              selectedRecipients.some(
                                (r) => r.id === conversation.contact.id,
                              )
                                ? "bg-blue-50"
                                : ""
                            }`}
                            onClick={() =>
                              toggleRecipient(
                                conversation.type as "USER" | "GROUP",
                                conversation.contact.id,
                                conversation.contact.userInfo?.fullName ||
                                  "Unknown",
                              )
                            }
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  className="object-cover"
                                  src={
                                    conversation.contact.userInfo
                                      ?.profilePictureUrl || undefined
                                  }
                                  alt={
                                    conversation.contact.userInfo?.fullName ||
                                    ""
                                  }
                                />
                                <AvatarFallback>
                                  {getUserInitials(conversation.contact)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {conversation.contact.userInfo?.fullName ||
                                    "Unknown"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {conversation.type === "GROUP"
                                    ? "Nhóm"
                                    : "Liên hệ"}
                                </p>
                              </div>
                            </div>
                            {selectedRecipients.some(
                              (r) => r.id === conversation.contact.id,
                            ) && (
                              <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-white">
                                <Check className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        ))}

                        {filteredConversations.length === 0 && (
                          <div className="p-4 text-center text-gray-500">
                            Không tìm thấy kết quả
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="friends" className="mt-0">
                  <div className="flex-1 mb-4 border rounded-md h-[300px]">
                    <ScrollArea className="h-full">
                      {isLoading.friends ? (
                        <div className="p-4 text-center text-gray-500">
                          Đang tải danh sách bạn bè...
                        </div>
                      ) : (
                        <div className="divide-y">
                          {filteredFriends.map((friend) => (
                            <div
                              key={friend.id}
                              className={`p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer ${
                                selectedRecipients.some(
                                  (r) => r.id === friend.id,
                                )
                                  ? "bg-blue-50"
                                  : ""
                              }`}
                              onClick={() =>
                                toggleRecipient(
                                  "USER",
                                  friend.id,
                                  friend.fullName || "Unknown",
                                )
                              }
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage
                                    src={friend.profilePictureUrl || ""}
                                    alt={friend.fullName || ""}
                                  />
                                  <AvatarFallback>
                                    {friend.fullName
                                      ?.split(" ")
                                      .map((name) => name[0])
                                      .join("") || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {friend.fullName || "Unknown"}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Bạn bè
                                  </p>
                                </div>
                              </div>
                              {selectedRecipients.some(
                                (r) => r.id === friend.id,
                              ) && (
                                <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-white">
                                  <Check className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                          ))}

                          {filteredFriends.length === 0 && (
                            <div className="p-4 text-center text-gray-500">
                              {searchQuery
                                ? "Không tìm thấy kết quả"
                                : "Bạn chưa có bạn bè nào"}
                            </div>
                          )}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="flex-1 p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="font-medium text-lg">Đã chuyển tiếp thành công!</p>
            </div>
          )}
        </div>

        {!forwardSuccess && (
          <DialogFooter className="mt-4">
            <Button
              className="w-full bg-blue-500 hover:bg-blue-600"
              disabled={selectedRecipients.length === 0 || isForwarding}
              onClick={handleForwardMessage}
            >
              {isForwarding ? (
                <>
                  <span className="animate-spin mr-2">&#8635;</span>
                  Đang chuyển tiếp...
                </>
              ) : (
                "Chuyển tiếp"
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
