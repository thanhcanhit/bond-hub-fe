"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CheckCircle2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Message } from "@/types/base";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { getUserInitials } from "@/utils/userUtils";

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

  const { forwardMessageToRecipients } = useChatStore();
  const { conversations } = useConversationsStore();

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedRecipients([]);
      setSearchQuery("");
      setForwardSuccess(false);
      setIsForwarding(false);
    }
  }, [isOpen]);

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
    setSelectedRecipients((prev) => {
      const exists = prev.some((r) => r.id === id && r.type === type);

      if (exists) {
        return prev.filter((r) => !(r.id === id && r.type === type));
      } else {
        return [...prev, { type, id, name }];
      }
    });
  };

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conv) => {
    const fullName = conv.contact.userInfo?.fullName?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return fullName.includes(query);
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Chuyển tiếp tin nhắn</DialogTitle>
        </DialogHeader>

        {!forwardSuccess ? (
          <>
            <div className="border rounded-md flex items-center px-3 py-2 mb-4">
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

            <div className="flex-1 overflow-y-auto mb-4 border rounded-md">
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
                        conversation.contact.userInfo?.fullName || "Unknown",
                      )
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={
                            conversation.contact.userInfo?.profilePictureUrl ||
                            ""
                          }
                          alt={conversation.contact.userInfo?.fullName || ""}
                        />
                        <AvatarFallback>
                          {getUserInitials(conversation.contact)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {conversation.contact.userInfo?.fullName || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {conversation.type === "GROUP" ? "Nhóm" : "Liên hệ"}
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
            </div>

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
          </>
        ) : (
          <div className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <p className="font-medium text-lg">Đã chuyển tiếp thành công!</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
