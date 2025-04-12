import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Users,
} from "lucide-react";
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
} from "@/actions/friend.action";
import { useFriendStore } from "@/stores/friendStore";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
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
}

export default function ProfileDialog({
  user,
  isOpen,
  onOpenChange,
  isOwnProfile = false,
  onChat,
  onCall,
}: ProfileDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [relationship, setRelationship] = useState<string | null>(null);
  const [isLoadingRelationship, setIsLoadingRelationship] = useState(false);
  const [showFriendRequestForm, setShowFriendRequestForm] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isAcceptingRequest, setIsAcceptingRequest] = useState(false);
  const [isRejectingRequest, setIsRejectingRequest] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const profilePictureInputRef = useRef<HTMLInputElement>(null);

  // Lấy các hàm từ friendStore
  const { acceptRequest, rejectRequest } = useFriendStore();

  // Lấy user từ store để luôn có dữ liệu mới nhất
  const storeUser = useAuthStore((state) => state.user);

  // Sử dụng user từ store nếu đang xem profile của chính mình
  const currentUser = isOwnProfile && storeUser ? storeUser : user;

  // Kiểm tra mối quan hệ khi user thay đổi hoặc dialog mở
  useEffect(() => {
    // Không cần kiểm tra mối quan hệ nếu đang xem profile của chính mình
    if (isOwnProfile || !user?.id || !isOpen) return;

    const checkRelationship = async () => {
      try {
        setIsLoadingRelationship(true);
        const accessToken = useAuthStore.getState().accessToken || undefined;
        const result = await getRelationship(user.id, accessToken);
        console.log("Full relationship response:", result);

        if (result.success && result.data) {
          console.log("Setting relationship to:", result.data.status);
          setRelationship(result.data.status || "NONE");

          // Lưu lại ID của lời mời kết bạn nếu có
          if (result.data.status === "PENDING_RECEIVED") {
            console.log(
              "Found PENDING_RECEIVED relationship with data:",
              result.data,
            );
            if (result.data.requestId) {
              console.log("Setting requestId to:", result.data.requestId);
              setRequestId(result.data.requestId);
            } else if (result.data.id) {
              // Nếu API trả về id thay vì requestId
              console.log("Setting requestId to id:", result.data.id);
              setRequestId(result.data.id);
            } else {
              console.error(
                "No requestId or id found in PENDING_RECEIVED relationship",
              );
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
  }, [isOwnProfile, user?.id, isOpen]);

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

    if (!confirm("Bạn có chắc chắn muốn xóa kết bạn với người dùng này?")) {
      return;
    }

    try {
      const accessToken = useAuthStore.getState().accessToken || undefined;
      const result = await removeFriend(user.id, accessToken);
      if (result.success) {
        toast.success("Xóa kết bạn thành công!");
        setRelationship("NONE");
      } else {
        toast.error(`Không thể xóa kết bạn: ${result.error}`);
      }
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error("Đã xảy ra lỗi khi xóa kết bạn");
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
        // Store đã được cập nhật trong hàm updateProfilePicture
        // và UserAvatar component sẽ tự động cập nhật UI khi currentUser thay đổi
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

      // Không cần đóng và mở lại dialog vì dữ liệu đã được cập nhật trong store
      // và component sẽ tự động render lại với dữ liệu mới
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
                  <Image
                    src={
                      coverImageUrl ||
                      (currentUser?.userInfo?.coverImgUrl
                        ? `${currentUser.userInfo.coverImgUrl}?t=${new Date().getTime()}`
                        : "https://i.ibb.co/yncCwjgj/default-cover.jpg")
                    }
                    alt="Cover Photo"
                    fill
                    className="object-cover h-full w-full"
                    priority={true}
                    key={currentUser?.userInfo?.coverImgUrl || "default-cover"}
                    unoptimized={true}
                  />
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
                    <UserAvatar user={currentUser} className="h-24 w-24" />
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
                    <>
                      {onCall && <Button onClick={onCall}>Gọi</Button>}
                      {onChat && (
                        <Button onClick={onChat} className="flex-1">
                          Trò chuyện
                        </Button>
                      )}
                    </>
                  ) : relationship === "PENDING_SENT" ? (
                    <Button
                      disabled
                      className="w-full bg-gray-300 text-gray-700 cursor-not-allowed"
                    >
                      Đã gửi lời mời kết bạn
                    </Button>
                  ) : relationship === "PENDING_RECEIVED" ? (
                    <div className="flex gap-2 w-full">
                      <Button
                        className="flex-1 bg-blue-500 hover:bg-blue-600"
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
                        className="flex-1"
                        onClick={handleRejectRequest}
                        disabled={isRejectingRequest}
                      >
                        {isRejectingRequest ? "Đang từ chối..." : "Từ chối"}
                      </Button>
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
                          className="mt-1 w-full p-2 border border-gray-300 rounded-md text-sm"
                          maxLength={150}
                        />
                        <div className="text-xs text-right text-gray-500 mt-1">
                          {requestMessage.length}/150 ký tự
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={toggleFriendRequestForm}
                          className="flex-1"
                        >
                          Hủy
                        </Button>
                        <Button
                          onClick={handleSendFriendRequest}
                          className="flex-1 bg-blue-500 hover:bg-blue-600"
                          disabled={isSendingRequest}
                        >
                          {isSendingRequest ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                              Đang gửi...
                            </>
                          ) : (
                            "Gửi lời mời"
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={toggleFriendRequestForm}
                      className="w-full bg-blue-500 hover:bg-blue-600"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Kết bạn
                    </Button>
                  )}
                </div>
              )}

              {/* Personal Information */}
              <div className="px-6 py-4 border-t-4 border-gray-200 bg-white overflow-auto no-scrollbar">
                <h4 className="font-semibold text-sm mb-3">
                  Thông tin cá nhân
                </h4>
                <div className="space-y-1.5">
                  {/* Chỉ hiển thị bio khi có dữ liệu */}
                  {currentUser?.userInfo?.bio && (
                    <div className="grid grid-cols-[100px_1fr] gap-1">
                      <span className="text-xs text-gray-500">Giới thiệu</span>
                      <span className="text-xs text-left">
                        {currentUser.userInfo.bio}
                      </span>
                    </div>
                  )}

                  {/* Giới tính luôn hiển thị vì luôn có giá trị mặc định */}
                  <div className="grid grid-cols-[100px_1fr] gap-1">
                    <span className="text-xs text-gray-500">Giới tính</span>
                    <span className="text-xs text-left">
                      {currentUser?.userInfo?.gender === "FEMALE"
                        ? "Nữ"
                        : currentUser?.userInfo?.gender === "MALE"
                          ? "Nam"
                          : "Khác"}
                    </span>
                  </div>

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

                  {/* Chỉ hiển thị số điện thoại khi có dữ liệu */}
                  {currentUser?.phoneNumber && (
                    <div className="grid grid-cols-[100px_1fr] gap-1">
                      <span className="text-xs text-gray-500">
                        Số điện thoại
                      </span>
                      <span className="text-xs text-left">
                        {currentUser.phoneNumber}
                      </span>
                    </div>
                  )}

                  {/* Chỉ hiển thị email khi có dữ liệu */}
                  {currentUser?.email && (
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
                </div>
              </div>

              {/* Photos/Videos - Only shown for other users' profiles */}
              {!isOwnProfile &&
                currentUser?.posts &&
                currentUser.posts.length > 0 && (
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 mt-4 overflow-auto no-scrollbar">
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
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 mt-4 space-y-4 overflow-auto no-scrollbar">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-500" />
                    <span className="text-sm">4 nhóm chung</span>
                  </div>
                  <Button variant="ghost" className="justify-start w-full">
                    <Share2 className="h-5 w-5 mr-2 text-gray-500" />
                    Chia sẻ liên hệ
                  </Button>
                  <Button variant="ghost" className="justify-start w-full">
                    <Ban className="h-5 w-5 mr-2 text-gray-500" />
                    Chặn tin nhắn và cuộc gọi
                  </Button>
                  <Button variant="ghost" className="justify-start w-full">
                    <AlertTriangle className="h-5 w-5 mr-2 text-gray-500" />
                    Báo cáo
                  </Button>
                  {relationship === "FRIEND" && (
                    <Button
                      variant="ghost"
                      className="justify-start w-full text-red-500"
                      onClick={handleRemoveFriend}
                    >
                      <UserMinus className="h-5 w-5 mr-2" />
                      Xóa bạn bè
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
    </Dialog>
  );
}
