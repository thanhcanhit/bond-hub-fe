import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ChevronDown,
  Settings,
  Lock,
  Palette,
  Bell,
  MessageSquare,
  Wrench,
  ChevronLeft,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingTab =
  | "general"
  | "privacy"
  | "interface"
  | "notifications"
  | "messages"
  | "utilities";

export default function SettingsDialog({
  isOpen,
  onOpenChange,
}: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingTab | null>("general");
  const [contactTab, setContactTab] = useState("all");
  const [language, setLanguage] = useState("Vietnamese");
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const tabs = [
    { id: "general", label: "Cài đặt chung", icon: Settings },
    { id: "privacy", label: "Quyền riêng tư", icon: Lock },
    { id: "interface", label: "Giao diện", icon: Palette },
    { id: "notifications", label: "Thông báo", icon: Bell },
    { id: "messages", label: "Tin nhắn", icon: MessageSquare },
    { id: "utilities", label: "Tiện ích", icon: Wrench },
  ];

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const minWidth = 768;
      const isSmall = window.innerWidth < minWidth;
      setIsSmallScreen(isSmall);
      setShowContent(!isSmall);

      if (isSmall) {
        setActiveTab(null);
      } else {
        setActiveTab("general");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      const minWidth = 768;
      const isSmall = window.innerWidth < minWidth;
      setIsSmallScreen(isSmall);
      setShowContent(!isSmall);

      if (isSmall) {
        setActiveTab(null);
      } else {
        setActiveTab("general");
      }
    }
  }, [isOpen]);

  const handleTabClick = (tabId: SettingTab) => {
    setActiveTab(tabId);
    if (isSmallScreen) {
      setShowContent(true);
    }
  };

  const handleBackClick = () => {
    setShowContent(false);
    setActiveTab(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden rounded-md mx-auto max-w-[55vw] max-h-[95vh] h-[90vh]">
        <div className="flex h-full">
          {/* Sidebar */}
          <div
            className={cn(
              "border-r border-gray-200 bg-white",
              isSmallScreen && showContent ? "hidden" : "block",
              isSmallScreen ? "w-full" : "w-[245px]",
            )}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <DialogTitle className="text-lg font-semibold text-gray-800">
                Cài đặt
              </DialogTitle>
              <DialogClose className="h-3.5 w-3.5 rounded-sm opacity-70 hover:opacity-100 focus:outline-none"></DialogClose>
            </div>
            <ul className="py-0.5">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => handleTabClick(tab.id as SettingTab)}
                      className={cn(
                        "w-full flex items-center px-4 py-2 text-sm font-semibold",
                        activeTab === tab.id
                          ? "bg-[#e6f0ff] text-[#0841a3]"
                          : "text-gray-600 hover:bg-gray-100",
                      )}
                    >
                      <Icon className="h-4 w-4 mr-2.5" />
                      {tab.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Content */}
          {showContent && activeTab && (
            <div className="flex-1 overflow-y-auto pt-7 bg-[#ebecf0]">
              {isSmallScreen && (
                <div className="flex items-center px-4 py-1 border-b border-gray-200">
                  <button
                    onClick={handleBackClick}
                    className="mr-2 hover:bg-gray-100 flex items-center"
                  >
                    <ChevronLeft className="h-4 w-4 text-[#0841a3]" />
                  </button>
                  <DialogTitle className="text-base font-semibold text-gray-800">
                    {tabs.find((tab) => tab.id === activeTab)?.label}
                  </DialogTitle>
                </div>
              )}

              <div className="pt-4 px-4 pb-4 space-y-4">
                {/* General Settings */}
                {activeTab === "general" && (
                  <div className="space-y-4">
                    {/* Danh bạ (Contact List) */}
                    <div>
                      <h4 className="text-base font-semibold mb-1.5 text-gray-800">
                        Danh bạ
                      </h4>
                      <div>
                        <p className="text-sm text-gray-500 mb-1.5">
                          Danh sách bạn bè được hiển thị trong danh bạ
                        </p>

                        <div className="bg-white rounded-md border border-gray-100 p-2.5">
                          <RadioGroup
                            value={contactTab}
                            onValueChange={setContactTab}
                            className="space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="all"
                                id="all"
                                className="border-[#0841a3] text-[#0841a3] h-4 w-4"
                              />
                              <Label
                                htmlFor="all"
                                className="text-sm font-normal text-gray-700"
                              >
                                Hiện thị tất cả bạn bè
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="active"
                                id="active"
                                className="border-[#0841a3] text-[#0841a3] h-4 w-4"
                              />
                              <Label
                                htmlFor="active"
                                className="text-sm font-normal text-gray-700"
                              >
                                Chỉ hiện thị bạn bè đang sử dụng Zalo
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                    </div>

                    {/* Ngôn ngữ (Language) */}
                    <div>
                      <h4 className="text-base font-semibold mb-1.5 text-gray-800">
                        Ngôn ngữ
                      </h4>
                      <div>
                        <div className="bg-white rounded-md border border-gray-100 p-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Thay đổi ngôn ngữ
                            </span>
                            <Select
                              value={language}
                              onValueChange={setLanguage}
                            >
                              <SelectTrigger className="w-[120px] border border-gray-100 rounded-md h-7 px-2 text-base bg-white">
                                <div className="flex justify-between items-center w-full">
                                  <SelectValue />
                                  <ChevronDown className="h-3 w-3 opacity-60" />
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="English">English</SelectItem>
                                <SelectItem value="Vietnamese">
                                  Tiếng Việt
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Privacy Settings */}
                {activeTab === "privacy" && (
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold mb-2 text-gray-800">
                      Quyền riêng tư
                    </h4>
                    <p className="text-sm text-gray-500">
                      Cài đặt quyền riêng tư cho tài khoản của bạn
                    </p>
                  </div>
                )}

                {/* Interface Settings */}
                {activeTab === "interface" && (
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold mb-2 text-gray-800">
                      Giao diện
                    </h4>
                    <p className="text-sm text-gray-500">
                      Tùy chỉnh giao diện ứng dụng
                    </p>
                  </div>
                )}

                {/* Notifications Settings */}
                {activeTab === "notifications" && (
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold mb-2 text-gray-800">
                      Thông báo
                    </h4>
                    <p className="text-sm text-gray-500">
                      Quản lý cài đặt thông báo
                    </p>
                  </div>
                )}

                {/* Messages Settings */}
                {activeTab === "messages" && (
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold mb-2 text-gray-800">
                      Tin nhắn
                    </h4>
                    <p className="text-sm text-gray-500">
                      Cài đặt cho tin nhắn và cuộc trò chuyện
                    </p>
                  </div>
                )}

                {/* Utilities Settings */}
                {activeTab === "utilities" && (
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold mb-2 text-gray-800">
                      Tiện ích
                    </h4>
                    <p className="text-sm text-gray-500">
                      Quản lý các tiện ích bổ sung
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
