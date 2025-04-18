"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Group, GroupMember, User, UserInfo } from "@/types/base";
import { X, Users, UserPlus, Settings, LogOut } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProfileDialog from "@/components/profile/ProfileDialog";
import { getUserDataById } from "@/actions/user.action";

interface GroupInfoProps {
  group: Group | null;
  onClose: () => void;
}

export default function GroupInfo({ group, onClose }: GroupInfoProps) {
  const [selectedMember, setSelectedMember] = useState<
    (User & { userInfo: UserInfo }) | null
  >(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  if (!group) {
    return null;
  }

  const handleMemberClick = async (memberId: string) => {
    try {
      const result = await getUserDataById(memberId);
      if (result.success && result.user) {
        const user = result.user;
        if (!user.userInfo) {
          user.userInfo = {
            id: user.id,
            fullName: user.email || user.phoneNumber || "Unknown",
            profilePictureUrl: null,
            statusMessage: "No status",
            blockStrangers: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            userAuth: user,
          };
        }
        setSelectedMember(user as User & { userInfo: UserInfo });
        setShowProfileDialog(true);
      }
    } catch (error) {
      console.error("Error fetching member data:", error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-l">
      <div className="p-4 flex items-center justify-between border-b">
        <h2 className="font-semibold">Thông tin nhóm</h2>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4 flex flex-col items-center">
        <Avatar className="h-24 w-24 mb-3">
          <AvatarImage
            src={group.avatarUrl || undefined}
            className="object-cover"
          />
          <AvatarFallback className="text-2xl">
            {group.name?.slice(0, 2).toUpperCase() || "GR"}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-lg font-semibold">{group.name}</h2>
        <p className="text-sm text-gray-500 flex items-center mt-1">
          <Users className="h-4 w-4 mr-1" />
          {group.members?.length || 0} thành viên
        </p>
      </div>

      <Tabs defaultValue="members" className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-2 mx-4">
          <TabsTrigger value="members" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Thành viên
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Cài đặt
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="flex-1 p-0">
          <div className="p-4 flex justify-between items-center">
            <h3 className="text-sm font-medium">Thành viên nhóm</h3>
            <Button variant="outline" size="sm" className="h-8">
              <UserPlus className="h-4 w-4 mr-2" />
              Thêm
            </Button>
          </div>
          <Separator />
          <ScrollArea className="flex-1">
            <div className="p-2">
              {group.members?.map((member: GroupMember) => (
                <div
                  key={member.id}
                  className="flex items-center p-2 hover:bg-gray-100 rounded-md cursor-pointer"
                  onClick={() => handleMemberClick(member.userId)}
                >
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage
                      src={
                        member.user?.userInfo?.profilePictureUrl || undefined
                      }
                      className="object-cover"
                    />
                    <AvatarFallback>
                      {member.user?.userInfo?.fullName
                        ?.slice(0, 2)
                        .toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {member.user?.userInfo?.fullName || "Thành viên"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {member.role === "LEADER"
                        ? "Trưởng nhóm"
                        : member.role === "CO_LEADER"
                          ? "Phó nhóm"
                          : "Thành viên"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="settings" className="flex-1 p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Tùy chọn nhóm</h3>
              <div className="space-y-1">
                <Button
                  variant="outline"
                  className="w-full justify-start text-left h-9"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Đổi tên nhóm
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left h-9"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Thay đổi ảnh nhóm
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Hành động</h3>
              <div className="space-y-1">
                <Button
                  variant="outline"
                  className="w-full justify-start text-left h-9 text-red-500 hover:text-red-500 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Rời khỏi nhóm
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Profile Dialog */}
      {selectedMember && (
        <ProfileDialog
          user={selectedMember}
          isOpen={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          isOwnProfile={false}
        />
      )}
    </div>
  );
}
