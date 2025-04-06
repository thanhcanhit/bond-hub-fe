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
import { Switch } from "@/components/ui/switch";
import {
  ChevronDown,
  Settings,
  Lock,
  Palette,
  Bell,
  MessageSquare,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingTab =
  | "general"
  | "privacy"
  | "appearance"
  | "notifications"
  | "messages"
  | "utilities";

export default function SettingsDialog({
  isOpen,
  onOpenChange,
}: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingTab>("general");
  const [contactTab, setContactTab] = useState("all");
  const [language, setLanguage] = useState("Vietnamese");
  const [showBirthday, setShowBirthday] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showReadStatus, setShowReadStatus] = useState(true);
  const [allowMessages, setAllowMessages] = useState(true);
  const [allowCalls, setAllowCalls] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const tabs = [
    { id: "general", label: "Cài đặt chung", icon: Settings },
    { id: "privacy", label: "Quyền riêng tư", icon: Lock },
    { id: "appearance", label: "Giao diện", icon: Palette },
    { id: "notifications", label: "Thông báo", icon: Bell },
    { id: "messages", label: "Tin nhắn", icon: MessageSquare },
    { id: "utilities", label: "Tiện ích", icon: Wrench },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden rounded-md">
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
          <DialogTitle className="text-base font-medium">Cài đặt</DialogTitle>
          <DialogClose className="h-5 w-5 rounded-sm opacity-70 hover:opacity-100 focus:outline-none"></DialogClose>
        </div>

        <div className="flex h-[500px]">
          {/* Sidebar */}
          <div className="w-[224px] border-r border-gray-200 bg-[#f5f5f5]">
            <ul>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id as SettingTab)}
                      className={cn(
                        "w-full flex items-center px-6 py-3 text-sm",
                        activeTab === tab.id
                          ? "bg-[#e6f0ff] text-[#0841a3] border-l-4 border-[#0841a3]"
                          : "text-gray-700 hover:bg-gray-100",
                      )}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {tab.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            {/* General Settings */}
            {activeTab === "general" && (
              <div className="space-y-8">
                {/* Danh bạ (Contact List) */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">Danh bạ</h4>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      Danh sách bạn bè được hiển thị trong danh bạ
                    </p>

                    <div className="mt-3 space-y-2 bg-white rounded-md border border-gray-200 p-3">
                      <RadioGroup
                        value={contactTab}
                        onValueChange={setContactTab}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="all"
                            id="all"
                            className="border-[#0841a3] text-[#0841a3]"
                          />
                          <Label htmlFor="all" className="text-sm">
                            Hiện thị tất cả bạn bè
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="active"
                            id="active"
                            className="border-[#0841a3] text-[#0841a3]"
                          />
                          <Label htmlFor="active" className="text-sm">
                            Chỉ hiện thị bạn bè đang sử dụng Zalo
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>

                {/* Ngôn ngữ (Language) */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">Ngôn ngữ</h4>
                  <div className="space-y-1">
                    <div className="mt-3 bg-white rounded-md border border-gray-200 p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Thay đổi ngôn ngữ</span>
                        <Select value={language} onValueChange={setLanguage}>
                          <SelectTrigger className="w-[120px] border border-gray-200 rounded-md h-8 px-3 text-sm">
                            <div className="flex justify-between items-center w-full">
                              <SelectValue placeholder="Chọn ngôn ngữ" />
                              <ChevronDown className="h-4 w-4 opacity-50" />
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
              <div className="space-y-8">
                {/* Cá nhân */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">Cá nhân</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-birthday" className="text-sm">
                        Hiện ngày sinh
                      </Label>
                      <Switch
                        id="show-birthday"
                        checked={showBirthday}
                        onCheckedChange={setShowBirthday}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-online-status" className="text-sm">
                        Hiển thị trạng thái truy cập
                      </Label>
                      <Switch
                        id="show-online-status"
                        checked={showOnlineStatus}
                        onCheckedChange={setShowOnlineStatus}
                      />
                    </div>
                  </div>
                </div>

                {/* Tin nhắn và cuộc gọi */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">
                    Tin nhắn và cuộc gọi
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-read-status" className="text-sm">
                        Hiện trạng thái &quot;Đã xem&quot;
                      </Label>
                      <Switch
                        id="show-read-status"
                        checked={showReadStatus}
                        onCheckedChange={setShowReadStatus}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="allow-messages" className="text-sm">
                        Cho phép nhắn tin
                      </Label>
                      <Switch
                        id="allow-messages"
                        checked={allowMessages}
                        onCheckedChange={setAllowMessages}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="allow-calls" className="text-sm">
                        Cho phép gọi điện
                      </Label>
                      <Switch
                        id="allow-calls"
                        checked={allowCalls}
                        onCheckedChange={setAllowCalls}
                      />
                    </div>
                  </div>
                </div>

                {/* Chặn tin nhắn */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">Chặn tin nhắn</h4>
                  <div className="space-y-1">
                    <button className="text-sm text-[#0841a3]">
                      Danh sách chặn
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Settings */}
            {activeTab === "appearance" && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Giao diện</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="dark-mode" className="text-sm">
                      Giao diện tối
                    </Label>
                    <Switch
                      id="dark-mode"
                      checked={darkMode}
                      onCheckedChange={setDarkMode}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeTab === "notifications" && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Thông báo</h4>
                <p className="text-sm text-gray-500">
                  Cài đặt thông báo sẽ được thêm sau
                </p>
              </div>
            )}

            {/* Messages Settings */}
            {activeTab === "messages" && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Tin nhắn</h4>
                <p className="text-sm text-gray-500">
                  Cài đặt tin nhắn sẽ được thêm sau
                </p>
              </div>
            )}

            {/* Utilities Settings */}
            {activeTab === "utilities" && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Tiện ích</h4>
                <p className="text-sm text-gray-500">
                  Cài đặt tiện ích sẽ được thêm sau
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
