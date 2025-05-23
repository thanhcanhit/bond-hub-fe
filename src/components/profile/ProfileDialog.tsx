import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Ban,
  Camera,
  ChevronLeft,
  Pencil,
  Share2,
  UserMinus,
  UserPlus,
} from "lucide-react";
import CallButton from "@/components/call/CallButton";
import RefreshUserDataButton from "./RefreshUserDataButton";
import { User } from "@/types/base";
import Image from "next/image";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  updateProfilePicture,
  updateCoverImage,
  updateUserBasicInfo,
} from "@/actions/user.action";
import {
  getRelationship,
  sendFriendRequest,
  removeFriend,
  blockUser,
} from "@/actions/friend.action";
import ImageViewerDialog from "./ImageViewerDialog";
import { useFriendStore } from "@/stores/friendStore";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
// Removed framer-motion imports to improve performance
import UserAvatar from "./UserAvatar";
import ProfileEditForm, { ProfileFormValues } from "./ProfileEditForm";

interface ProfileDialogProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isOwnProfile?: boolean;
  onChat?: () => void;
  onCall?: () => void;
  initialShowFriendRequestForm?: boolean;
}

export default function ProfileDialog({
  user,
  isOpen,
  onOpenChange,
  isOwnProfile = false,
  onChat,
  onCall,
  initialShowFriendRequestForm = false,
}: ProfileDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [relationship, setRelationship] = useState<string | null>(null);
  const [isLoadingRelationship, setIsLoadingRelationship] = useState(false);
  const [showFriendRequestForm, setShowFriendRequestForm] = useState(
    initialShowFriendRequestForm,
  );
  const [requestMessage, setRequestMessage] = useState("");
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isAcceptingRequest, setIsAcceptingRequest] = useState(false);
  const [isRejectingRequest, setIsRejectingRequest] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [showRemoveFriendDialog, setShowRemoveFriendDialog] = useState(false);
  const [isRemovingFriend, setIsRemovingFriend] = useState(false);
  const profilePictureInputRef = useRef<HTMLInputElement>(null);

  // State for image viewer
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState("");
  const [viewerImageAlt, setViewerImageAlt] = useState("");

  // Lấy các hàm từ stores
  const { acceptRequest, rejectRequest } = useFriendStore();
  const router = useRouter();

  // Lấy hàm openChat từ chatStore
  const { openChat } = useChatStore();

  // Lấy user từ store để luôn có dữ liệu mới nhất
  const storeUser = useAuthStore((state) => state.user);

  // Sử dụng user từ store nếu đang xem profile của chính mình
  const currentUser = isOwnProfile && storeUser ? storeUser : user;

  // Kiểm tra mối quan hệ khi user thay đổi hoặc dialog mở
  useEffect(() => {
    // Không cần kiểm tra mối quan hệ nếu đang xem profile của chính mình
    if (isOwnProfile || !user?.id || !isOpen) return;

    console.log(
      "Checking relationship for user:",
      user.id,
      user.userInfo?.fullName,
    );

    const checkRelationship = async () => {
      try {
        setIsLoadingRelationship(true);
        const accessToken = useAuthStore.getState().accessToken || undefined;
        console.log("Calling getRelationship with userId:", user.id);
        const result = await getRelationship(user.id, accessToken);
        console.log("Full relationship response:", result);

        if (result.success && result.data) {
          // Lấy trạng thái từ API response
          // API trả về status ở cấp cao nhất, ví dụ: "FRIEND", "PENDING_SENT", "PENDING_RECEIVED", "DECLINED_RECEIVED", v.v.
          console.log("Setting relationship to:", result.data.status);
          setRelationship(result.data.status || "NONE");

          // Xử lý các trường hợp đặc biệt
          if (
            result.data.status === "PENDING_RECEIVED" &&
            result.data.relationship
          ) {
            console.log(
              "Found PENDING_RECEIVED relationship with data:",
              result.data.relationship,
            );
            // Lấy ID của lời mời kết bạn từ trường relationship
            const relationshipData = result.data.relationship;
            if (relationshipData.id) {
              console.log(
                "Setting requestId to relationship.id:",
                relationshipData.id,
              );
              setRequestId(relationshipData.id);
            } else {
              console.error("No id found in PENDING_RECEIVED relationship");
            }
          }
        } else {
          setRelationship("NONE");
        }
      } catch (error) {
        console.error("Error checking relationship:", error);
        setRelationship("NONE");
      } finally {
        setIsLoadingRelationship(false);
      }
    };

    checkRelationship();
  }, [isOwnProfile, user?.id, user?.userInfo?.fullName, isOpen]);

  // Default date of birth
  const defaultDob = useMemo(() => new Date("2003-11-03"), []);

  // Get initial form values from user data
  const getInitialFormValues = useCallback((): ProfileFormValues => {
    const dob = currentUser?.userInfo?.dateOfBirth
      ? new Date(currentUser.userInfo.dateOfBirth)
      : defaultDob;

    return {
      fullName: currentUser?.userInfo?.fullName || "",
      gender: currentUser?.userInfo?.gender || "MALE",
      bio: currentUser?.userInfo?.bio || "",
      day: dob.getDate().toString().padStart(2, "0"),
      month: (dob.getMonth() + 1).toString().padStart(2, "0"),
      year: dob.getFullYear().toString(),
    };
  }, [
    currentUser?.userInfo?.bio,
    currentUser?.userInfo?.dateOfBirth,
    currentUser?.userInfo?.fullName,
    currentUser?.userInfo?.gender,
    defaultDob,
  ]);

  // Memoize form values to prevent unnecessary re-renders
  const initialFormValues = useMemo(
    () => getInitialFormValues(),
    [getInitialFormValues],
  );

  // Update cover image URL when user changes
  useEffect(() => {
    if (currentUser) {
      // Always update cover image URL when currentUser changes to ensure real-time updates
      setCoverImageUrl(currentUser.userInfo?.coverImgUrl || null);
    }
  }, [currentUser]);

  // Handle send friend request
  const handleSendFriendRequest = async () => {
    if (!user?.id) return;

    try {
      setIsSendingRequest(true);
      const accessToken = useAuthStore.getState().accessToken || undefined;
      const result = await sendFriendRequest(
        user.id,
        requestMessage,
        accessToken,
      );
      if (result.success) {
        toast.success("Lời mời kết bạn đã được gửi!");
        setRelationship("PENDING_SENT");
        setShowFriendRequestForm(false);
      } else {
        toast.error(`Không thể gửi lời mời kết bạn: ${result.error}`);
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("Đã xảy ra lỗi khi gửi lời mời kết bạn");
    } finally {
      setIsSendingRequest(false);
    }
  };

  // Toggle friend request form
  const toggleFriendRequestForm = () => {
    setShowFriendRequestForm(!showFriendRequestForm);
    if (showFriendRequestForm) {
      setRequestMessage("");
    }
  };

  // Handle remove friend
  const handleRemoveFriend = async () => {
    if (!user?.id) return;

    setIsRemovingFriend(true);
    try {
      const accessToken = useAuthStore.getState().accessToken || undefined;
      const result = await removeFriend(user.id, accessToken);
      if (result.success) {
        toast.success("Xóa kết bạn thành công!");
        setRelationship("NONE");

        // Force cleanup of any potential overlay issues
        document.body.style.pointerEvents = "auto";

        // Close dialog with a slight delay
        setTimeout(() => {
          setShowRemoveFriendDialog(false);
        }, 50);
      } else {
        toast.error(`Không thể xóa kết bạn: ${result.error}`);
      }
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error("Đã xảy ra lỗi khi xóa kết bạn");
    } finally {
      setIsRemovingFriend(false);
    }
  };

  // Handle block user
  const handleBlockUser = async () => {
    if (!user?.id) return;

    setIsBlocking(true);
    try {
      const accessToken = useAuthStore.getState().accessToken || undefined;
      const result = await blockUser(user.id, accessToken);
      if (result.success) {
        toast.success(`Đã chặn ${user.userInfo?.fullName || "người dùng này"}`);

        // Force cleanup of any potential overlay issues
        document.body.style.pointerEvents = "auto";

        // Close dialogs with a slight delay
        setTimeout(() => {
          setShowBlockDialog(false);
          onOpenChange(false); // Close the profile dialog
        }, 50);

        // Update relationship status
        setRelationship("BLOCKED");
      } else {
        toast.error(`Không thể chặn người dùng: ${result.error}`);
      }
    } catch (error) {
      console.error("Error blocking user:", error);
      toast.error("Đã xảy ra lỗi khi chặn người dùng");
    } finally {
      setIsBlocking(false);
    }
  };

  // Handle accept friend request
  const handleAcceptRequest = async () => {
    if (!user?.id || !requestId) return;

    setIsAcceptingRequest(true);
    try {
      const success = await acceptRequest(requestId);
      if (success) {
        toast.success(
          `Đã chấp nhận lời mời kết bạn từ ${user.userInfo?.fullName || "người dùng"}`,
        );
        setRelationship("FRIEND");
      } else {
        toast.error(
          "Không thể chấp nhận lời mời kết bạn. Vui lòng thử lại sau.",
        );
      }
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast.error("Đã xảy ra lỗi khi chấp nhận lời mời kết bạn");
    } finally {
      setIsAcceptingRequest(false);
    }
  };

  // Handle reject friend request
  const handleRejectRequest = async () => {
    console.log("handleRejectRequest called with requestId:", requestId);
    if (!user?.id || !requestId) {
      console.error("Cannot reject request: missing user.id or requestId");
      return;
    }

    setIsRejectingRequest(true);
    try {
      console.log("Calling rejectRequest with requestId:", requestId);
      const success = await rejectRequest(requestId);
      console.log("rejectRequest result:", success);
      if (success) {
        toast.success(
          `Đã từ chối lời mời kết bạn từ ${user.userInfo?.fullName || "người dùng"}`,
        );
        setRelationship("NONE");
      } else {
        toast.error("Không thể từ chối lời mời kết bạn. Vui lòng thử lại sau.");
      }
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      toast.error("Đã xảy ra lỗi khi từ chối lời mời kết bạn");
    } finally {
      setIsRejectingRequest(false);
    }
  };

  // State để theo dõi khi nào cần cập nhật UI
  const [profileUpdateTrigger, setProfileUpdateTrigger] = useState<number>(0);

  // Cập nhật UI khi profileUpdateTrigger thay đổi
  useEffect(() => {
    if (profileUpdateTrigger > 0) {
      // Cập nhật lại thông tin người dùng từ store
      const updatedUser = useAuthStore.getState().user;
      if (updatedUser && isOwnProfile) {
        // Force re-render component với dữ liệu mới nhất
        console.log("Cập nhật UI sau khi thay đổi ảnh đại diện");
      }
    }
  }, [profileUpdateTrigger, isOwnProfile]);

  const handleProfilePictureUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];
    setIsUploading(true);

    try {
      const result = await updateProfilePicture(file);
      if (result.success && result.url) {
        toast.success(result.message || "Cập nhật ảnh đại diện thành công");

        // Kích hoạt cập nhật UI
        setProfileUpdateTrigger((prev) => prev + 1);

        // Đảm bảo rằng store đã được cập nhật
        const currentUser = useAuthStore.getState().user;
        if (currentUser && currentUser.userInfo) {
          // Cập nhật lại store với URL mới và timestamp mới
          const updatedUser = {
            ...currentUser,
            userInfo: {
              ...currentUser.userInfo,
              profilePictureUrl: `${result.url}?t=${new Date().getTime()}`,
            },
          };
          useAuthStore.getState().updateUser(updatedUser);
        }
      } else {
        toast.error(result.error || "Cập nhật ảnh đại diện thất bại");
      }
    } catch (error) {
      console.error("Lỗi khi tải lên ảnh đại diện:", error);
      toast.error("Đã xảy ra lỗi khi tải lên ảnh đại diện");
    } finally {
      setIsUploading(false);
    }
  };

  // Thêm state để kích hoạt cập nhật UI sau khi cập nhật thông tin cơ bản
  const [basicInfoUpdateTrigger, setBasicInfoUpdateTrigger] =
    useState<number>(0);

  // Cập nhật UI khi basicInfoUpdateTrigger thay đổi
  useEffect(() => {
    if (basicInfoUpdateTrigger > 0) {
      // Cập nhật lại thông tin người dùng từ store
      const updatedUser = useAuthStore.getState().user;
      if (updatedUser && isOwnProfile) {
        // Force re-render component với dữ liệu mới nhất
        console.log("Cập nhật UI sau khi thay đổi thông tin cơ bản");
      }
    }
  }, [basicInfoUpdateTrigger, isOwnProfile]);

  const handleSubmit = useCallback(async (data: ProfileFormValues) => {
    // Create date from day, month, year
    const dateOfBirth = new Date(`${data.year}-${data.month}-${data.day}`);

    // Call API to update user basic info
    const result = await updateUserBasicInfo({
      fullName: data.fullName,
      gender: data.gender,
      dateOfBirth: dateOfBirth,
      bio: data.bio,
    });

    if (result.success) {
      toast.success("Thông tin cá nhân đã được cập nhật thành công");
      setIsEditing(false);

      // Kích hoạt cập nhật UI
      setBasicInfoUpdateTrigger((prev) => prev + 1);

      // Đảm bảo rằng store đã được cập nhật
      const currentUser = useAuthStore.getState().user;
      if (currentUser && currentUser.userInfo) {
        // Cập nhật lại store với thông tin mới nhất
        const updatedUser = {
          ...currentUser,
          userInfo: {
            ...currentUser.userInfo,
            fullName: data.fullName || currentUser.userInfo.fullName,
            gender: (data.gender as any) || currentUser.userInfo.gender,
            dateOfBirth: dateOfBirth || currentUser.userInfo.dateOfBirth,
            bio: data.bio || currentUser.userInfo.bio,
          },
        };
        useAuthStore.getState().updateUser(updatedUser);
      }
    } else {
      toast.error(result.error || "Cập nhật thông tin cá nhân thất bại");
    }
  }, []);

  // Memoize handlers
  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleStartEditing = useCallback(() => {
    setIsEditing(true);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-[425px] h-auto !p-0 mt-0 mb-16 max-h-[90vh] overflow-y-auto no-scrollbar`}
      >
        {/* Disable animations completely to improve performance */}
        {isEditing && isOwnProfile ? (
          <div className="p-0">
            <div className="flex items-center px-6 py-2 border-b border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                className="p-0 mr-2"
                onClick={handleCancel}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <DialogHeader>
                <DialogTitle className="text-base font-medium">
                  Cập nhật thông tin cá nhân của bạn
                </DialogTitle>
              </DialogHeader>
            </div>

            <ProfileEditForm
              initialValues={initialFormValues}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          </div>
        ) : (
          <div className="profile-view">
            <DialogHeader className="px-6 py-0 flex flex-row justify-between items-center h-10">
              <DialogTitle className="text-base font-semibold flex items-center h-10">
                Thông tin cá nhân
              </DialogTitle>

              <div className="flex items-center space-x-1">
                {isOwnProfile && (
                  <RefreshUserDataButton
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                  />
                )}
              </div>

              <DialogDescription className="sr-only">
                Xem và chỉnh sửa thông tin tài khoản của bạn
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col overflow-auto no-scrollbar">
              {/* Cover Image */}
              <div className="relative">
                <div className="relative w-full h-[180px] bg-gray-200">
                  <div
                    className="absolute inset-0 cursor-pointer"
                    onClick={() => {
                      const imageUrl =
                        coverImageUrl ||
                        (currentUser?.userInfo?.coverImgUrl
                          ? `${currentUser.userInfo.coverImgUrl}?t=${new Date().getTime()}`
                          : "https://i.ibb.co/yncCwjg/default-cover.jpg");
                      setViewerImageUrl(imageUrl);
                      setViewerImageAlt("Cover Photo");
                      setIsImageViewerOpen(true);
                    }}
                  >
                    <Image
                      src={
                        coverImageUrl ||
                        (currentUser?.userInfo?.coverImgUrl
                          ? `${currentUser.userInfo.coverImgUrl}?t=${new Date().getTime()}`
                          : "https://i.ibb.co/yncCwjg/default-cover.jpg")
                      }
                      alt="Cover Photo"
                      fill
                      className="object-cover h-full w-full"
                      priority={true}
                      key={
                        currentUser?.userInfo?.coverImgUrl || "default-cover"
                      }
                      unoptimized={true}
                    />
                  </div>
                  {isOwnProfile && (
                    <div className="absolute bottom-2 right-2">
                      <input
                        type="file"
                        id="cover-image-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                          if (!e.target.files || e.target.files.length === 0)
                            return;
                          const file = e.target.files[0];
                          try {
                            const result = await updateCoverImage(file);
                            if (result.success && result.url) {
                              toast.success(
                                result.message || "Cập nhật ảnh bìa thành công",
                              );
                              // Store đã được cập nhật trong hàm updateCoverImage
                              // và useEffect sẽ tự động cập nhật UI khi currentUser thay đổi
                              // Tuy nhiên, vẫn cập nhật state để đảm bảo UI cập nhật ngay lập tức
                              setCoverImageUrl(
                                result.url + "?t=" + new Date().getTime(),
                              );
                            } else {
                              toast.error(
                                result.error || "Cập nhật ảnh bìa thất bại",
                              );
                            }
                          } catch (error) {
                            console.error("Lỗi khi cập nhật ảnh bìa:", error);
                            toast.error("Đã xảy ra lỗi khi cập nhật ảnh bìa");
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white/80 hover:bg-white rounded-full p-2 h-8 w-8 flex items-center justify-center"
                        onClick={() =>
                          document.getElementById("cover-image-upload")?.click()
                        }
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Picture and Name */}
              <div className="flex flex-col items-center -mt-12 mb-1.5">
                <div className="relative">
                  {currentUser && (
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        if (currentUser?.userInfo?.profilePictureUrl) {
                          setViewerImageUrl(
                            `${currentUser.userInfo.profilePictureUrl}?t=${new Date().getTime()}`,
                          );
                          setViewerImageAlt(
                            currentUser.userInfo.fullName || "Profile Picture",
                          );
                          setIsImageViewerOpen(true);
                        }
                      }}
                    >
                      <UserAvatar user={currentUser} className="h-24 w-24" />
                    </div>
                  )}
                  {isOwnProfile && (
                    <div className="absolute bottom-0 right-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white rounded-full p-1 h-5 w-5 flex items-center justify-center"
                        onClick={() => profilePictureInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        <Camera className="h-3 w-3" />
                        <span className="sr-only">Thay đổi ảnh đại diện</span>
                      </Button>
                      <input
                        type="file"
                        ref={profilePictureInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleProfilePictureUpload}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center mt-2">
                  <h3 className="text-base font-semibold">
                    {currentUser?.userInfo?.fullName || ""}
                  </h3>
                </div>
              </div>

              {/* Action Buttons (for other users) */}
              {!isOwnProfile && (
                <div className="flex gap-2 px-4">
                  {isLoadingRelationship ? (
                    <Button disabled className="w-full">
                      <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                      Đang tải...
                    </Button>
                  ) : relationship === "FRIEND" ? (
                    <div className="flex gap-6 w-full p-2 pb-4">
                      {user && (
                        <CallButton
                          target={user}
                          targetType="USER"
                          showVideoCall={false}
                        />
                      )}
                      <Button
                        onClick={async () => {
                          if (user?.id) {
                            // Close the dialog
                            onOpenChange(false);

                            // Open the chat with this user
                            await openChat(user.id, "USER");

                            // Navigate to chat page if not already there
                            router.push("/dashboard/chat");

                            // Call the onChat callback if provided
                            if (onChat) onChat();
                          }
                        }}
                        className="flex-1 bg-[#dbebff] text-[#094bad] font-semibold hover:bg-[#9FC5EA] py-2 px-4 h-8 !border-none !rounded-none"
                      >
                        Nhắn tin
                      </Button>
                    </div>
                  ) : relationship === "PENDING_SENT" ? (
                    <div className="flex gap-6 w-full p-2 pb-4">
                      <Button
                        disabled
                        className="flex-1 bg-gray-300 text-gray-700 font-semibold cursor-not-allowed h-8 !border-none !rounded-none"
                      >
                        Đã gửi lời mời kết bạn
                      </Button>
                    </div>
                  ) : relationship === "PENDING_RECEIVED" ? (
                    <div className="flex gap-6 w-full p-2 pb-4">
                      <div className="flex gap-2 flex-1">
                        <Button
                          className="flex-1 bg-[#dbebff] text-[#094bad] font-semibold hover:bg-[#9FC5EA] h-8 !border-none !rounded-none"
                          onClick={handleAcceptRequest}
                          disabled={isAcceptingRequest}
                        >
                          {isAcceptingRequest ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                              Đang chấp nhận...
                            </>
                          ) : (
                            "Chấp nhận"
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 bg-[#ebecf0] font-semibold hover:bg-[#B3B6B9] py-2 px-4 h-8 !border-none !rounded-none"
                          onClick={handleRejectRequest}
                          disabled={isRejectingRequest}
                        >
                          {isRejectingRequest ? "Đang từ chối..." : "Từ chối"}
                        </Button>
                      </div>
                    </div>
                  ) : showFriendRequestForm ? (
                    <div className="w-full space-y-4">
                      <div>
                        <label
                          htmlFor="message"
                          className="text-sm font-medium"
                        >
                          Lời nhắn (không bắt buộc)
                        </label>
                        <textarea
                          id="message"
                          placeholder="Xin chào, tôi muốn kết bạn với bạn..."
                          value={requestMessage}
                          onChange={(e) => setRequestMessage(e.target.value)}
                          className="mt-1 w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-0 focus:border-gray-300"
                          maxLength={150}
                        />
                        <div className="text-xs text-right text-gray-500 mt-1">
                          {requestMessage.length}/150 ký tự
                        </div>
                      </div>

                      <div className="flex gap-6 w-full p-2 pb-4">
                        <Button
                          variant="outline"
                          onClick={toggleFriendRequestForm}
                          className="flex-1 bg-[#ebecf0] font-semibold hover:bg-[#B3B6B9] py-2 px-4 h-8 !border-none !rounded-none"
                        >
                          Hủy
                        </Button>
                        <Button
                          onClick={handleSendFriendRequest}
                          className="flex-1 bg-[#dbebff] text-[#094bad] font-semibold hover:bg-[#9FC5EA] py-2 px-4 h-8 !border-none !rounded-none"
                          disabled={isSendingRequest}
                        >
                          {isSendingRequest ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-[#094bad] rounded-full border-t-transparent mr-2"></div>
                              Đang gửi...
                            </>
                          ) : (
                            "Gửi lời mời"
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-6 w-full p-2 pb-4">
                      <Button
                        onClick={toggleFriendRequestForm}
                        className="flex-1 bg-[#dbebff] text-[#094bad] font-semibold hover:bg-[#9FC5EA] py-2 px-4 h-8 !border-none !rounded-none"
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Kết bạn
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Personal Information */}
              <div className="px-6 py-4 border-t-4 border-gray-200 bg-white overflow-auto no-scrollbar">
                <h4 className="font-semibold text-sm mb-3">
                  Thông tin cá nhân
                </h4>
                <div className="space-y-2.5">
                  {/* Chỉ hiển thị bio khi có dữ liệu */}
                  {currentUser?.userInfo?.bio && (
                    <div className="grid grid-cols-[100px_1fr] gap-1">
                      <span className="text-xs text-gray-500">Giới thiệu</span>
                      <span className="text-xs text-left">
                        {currentUser.userInfo.bio}
                      </span>
                    </div>
                  )}

                  {/* Chỉ hiển thị giới tính khi có dữ liệu */}
                  {currentUser?.userInfo?.gender && (
                    <div className="grid grid-cols-[100px_1fr] gap-1">
                      <span className="text-xs text-gray-500">Giới tính</span>
                      <span className="text-xs text-left">
                        {currentUser.userInfo.gender === "FEMALE"
                          ? "Nữ"
                          : currentUser.userInfo.gender === "MALE"
                            ? "Nam"
                            : "Khác"}
                      </span>
                    </div>
                  )}

                  {/* Chỉ hiển thị ngày sinh khi có dữ liệu */}
                  {currentUser?.userInfo?.dateOfBirth && (
                    <div className="grid grid-cols-[100px_1fr] gap-1">
                      <span className="text-xs text-gray-500">Ngày sinh</span>
                      <span className="text-xs text-left">
                        {new Date(
                          currentUser.userInfo.dateOfBirth,
                        ).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}

                  {/* Chỉ hiển thị số điện thoại khi có dữ liệu và là profile của chính mình hoặc là bạn bè */}
                  {currentUser?.phoneNumber &&
                    (isOwnProfile || relationship === "FRIEND") && (
                      <div className="grid grid-cols-[100px_1fr] gap-1">
                        <span className="text-xs text-gray-500">
                          Số điện thoại
                        </span>
                        <span className="text-xs text-left">
                          {currentUser.phoneNumber}
                        </span>
                      </div>
                    )}

                  {/* Chỉ hiển thị email khi có dữ liệu và là profile của chính mình hoặc là bạn bè */}
                  {currentUser?.email &&
                    (isOwnProfile || relationship === "FRIEND") && (
                      <div className="grid grid-cols-[100px_1fr] gap-1">
                        <span className="text-xs text-gray-500">Email</span>
                        <span className="text-xs text-left">
                          {currentUser.email}
                        </span>
                      </div>
                    )}

                  {/* Thông báo về quyền riêng tư số điện thoại */}
                  {isOwnProfile && currentUser?.phoneNumber && (
                    <>
                      <div className="h-1"></div>
                      <p className="text-xs text-gray-500">
                        Chỉ bạn bè có lưu số điện thoại của bạn trong danh bạ
                        của họ mới có thể xem số điện thoại này
                      </p>
                    </>
                  )}

                  {/* Thông báo về quyền riêng tư khi xem profile người khác không phải bạn bè */}
                  {!isOwnProfile && relationship !== "FRIEND" && (
                    <>
                      <div className="h-1"></div>
                      <p className="text-xs text-gray-500">
                        Kết bạn để xem thông tin liên hệ của người dùng này
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Photos/Videos - Only shown for other users' profiles */}
              {!isOwnProfile &&
                currentUser?.posts &&
                currentUser.posts.length > 0 && (
                  <div className="px-6 py-4 border-t-4 border-gray-200 bg-white mt-4 overflow-auto no-scrollbar">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-base">Hình ảnh/Video</h4>
                      <Button variant="link" className="text-sm p-0 h-auto">
                        Xem tất cả
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {Array(8)
                        .fill(0)
                        .map((_, i) => (
                          <div
                            key={i}
                            className="aspect-square bg-gray-200 rounded-md overflow-hidden"
                          >
                            <div className="w-full h-full bg-gray-300"></div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

              {/* Additional Options for Other User's Profile */}
              {!isOwnProfile && (
                <div className="px-2 py-4 border-t-4 border-gray-200 bg-white mt-4 space-y-2 overflow-auto no-scrollbar">
                  <Button
                    variant="ghost"
                    className="justify-start w-full h-10 px-3"
                  >
                    <Share2 className="h-5 w-5 mr-2 text-gray-500 flex-shrink-0" />
                    <span className="text-sm">Chia sẻ liên hệ</span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start w-full h-10 px-3"
                    onClick={() => setShowBlockDialog(true)}
                  >
                    <Ban className="h-5 w-5 mr-2 text-gray-500 flex-shrink-0" />
                    <span className="text-sm">Chặn tin nhắn và cuộc gọi</span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start w-full h-10 px-3"
                  >
                    <AlertTriangle className="h-5 w-5 mr-2 text-gray-500 flex-shrink-0" />
                    <span className="text-sm">Báo cáo</span>
                  </Button>
                  {relationship === "FRIEND" && (
                    <Button
                      variant="ghost"
                      className="justify-start w-full h-10 px-3 text-red-500"
                      onClick={() => setShowRemoveFriendDialog(true)}
                    >
                      <UserMinus className="h-5 w-5 mr-2 flex-shrink-0" />
                      <span className="text-sm">Xóa bạn bè</span>
                    </Button>
                  )}
                </div>
              )}

              {/* Update Button (for own profile) */}
              {isOwnProfile && (
                <div className="px-6 py-0.5 border-t border-gray-200 bg-white flex justify-center">
                  <Button
                    className="w-full  hover:bg-gray-100 text-black border-0 shadow-none"
                    variant="ghost"
                    onClick={handleStartEditing}
                  >
                    <span className="flex items-center font-semibold">
                      <Pencil className="h-4 w-4 mr-2" />
                      Cập nhật
                    </span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>

      {/* Image Viewer Dialog */}
      <ImageViewerDialog
        isOpen={isImageViewerOpen}
        onClose={() => setIsImageViewerOpen(false)}
        imageUrl={viewerImageUrl}
        alt={viewerImageAlt}
      />

      {/* Block User Confirmation Dialog */}
      <AlertDialog
        open={showBlockDialog}
        onOpenChange={(open) => {
          setShowBlockDialog(open);

          // If dialog is closing, ensure cleanup
          if (!open) {
            // Force cleanup of any potential overlay issues
            document.body.style.pointerEvents = "auto";
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chặn người dùng</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn chặn{" "}
              {user?.userInfo?.fullName || "người dùng này"}? Người này sẽ không
              thể gửi tin nhắn hoặc gọi điện cho bạn nữa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBlocking}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockUser}
              disabled={isBlocking}
              className="bg-red-500 hover:bg-red-600"
            >
              {isBlocking ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                  Đang chặn...
                </>
              ) : (
                "Chặn"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Friend Confirmation Dialog */}
      <AlertDialog
        open={showRemoveFriendDialog}
        onOpenChange={(open) => {
          setShowRemoveFriendDialog(open);

          // If dialog is closing, ensure cleanup
          if (!open) {
            // Force cleanup of any potential overlay issues
            document.body.style.pointerEvents = "auto";
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bạn bè</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa kết bạn với{" "}
              {user?.userInfo?.fullName || "người dùng này"}? Hành động này sẽ
              xóa tất cả các cuộc trò chuyện chung và không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingFriend}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveFriend}
              disabled={isRemovingFriend}
              className="bg-red-500 hover:bg-red-600"
            >
              {isRemovingFriend ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                  Đang xóa...
                </>
              ) : (
                "Xóa bạn bè"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
