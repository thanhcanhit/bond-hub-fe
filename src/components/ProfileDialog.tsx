import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Ban,
  Camera,
  ChevronLeft,
  Pencil,
  Share2,
  UserMinus,
  Users,
} from "lucide-react";
import { User } from "@/types/base";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import {
  updateProfilePicture,
  updateCoverImage,
  updateUserBasicInfo,
} from "@/actions/user.action";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import styles from "./ProfileDialog.module.css";
import { AnimatePresence, motion } from "framer-motion";

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
  console.log("user", user);

  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const profilePictureInputRef = useRef<HTMLInputElement>(null);

  // Lấy user từ store để luôn có dữ liệu mới nhất
  const storeUser = useAuthStore((state) => state.user);

  // Sử dụng user từ store nếu đang xem profile của chính mình
  const currentUser = isOwnProfile && storeUser ? storeUser : user;

  // Form state for editing profile
  const [displayName, setDisplayName] = useState(
    currentUser?.userInfo?.fullName || "",
  );
  const [gender, setGender] = useState<string>(
    currentUser?.userInfo?.gender || "MALE",
  );

  // Cập nhật form state khi user thay đổi
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.userInfo?.fullName || "");
      setGender(currentUser.userInfo?.gender || "MALE");

      // Chỉ cập nhật URL hình ảnh nếu chưa được cập nhật trước đó
      if (!profileImageUrl) {
        setProfileImageUrl(currentUser.userInfo?.profilePictureUrl || null);
      }

      if (!coverImageUrl) {
        setCoverImageUrl(currentUser.userInfo?.coverImgUrl || null);
      }
    }
  }, [currentUser, profileImageUrl, coverImageUrl]);

  // Parse date of birth into day, month, year
  const dob = currentUser?.userInfo?.dateOfBirth
    ? new Date(currentUser.userInfo.dateOfBirth)
    : new Date("2003-11-03");
  const [day, setDay] = useState(dob.getDate().toString().padStart(2, "0"));
  const [month, setMonth] = useState(
    (dob.getMonth() + 1).toString().padStart(2, "0"),
  );
  const [year, setYear] = useState(dob.getFullYear().toString());

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

        // Cập nhật URL hình ảnh mới
        setProfileImageUrl(result.url + "?t=" + new Date().getTime());

        // Không cần đóng và mở lại dialog nữa vì đã cập nhật trực tiếp state
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Create date from day, month, year
    const dateOfBirth = new Date(`${year}-${month}-${day}`);

    // Call API to update user basic info
    const result = await updateUserBasicInfo({
      fullName: displayName,
      gender: gender,
      dateOfBirth: dateOfBirth,
      bio: currentUser?.userInfo?.bio || undefined,
    });

    if (result.success) {
      toast.success("Profile updated successfully");
      setIsEditing(false);

      // Cập nhật lại user trong component
      if (onOpenChange) {
        // Đóng và mở lại dialog để refresh dữ liệu
        onOpenChange(false);
        setTimeout(() => onOpenChange(true), 100);
      }
    } else {
      toast.error(result.error || "Failed to update profile");
    }
  };

  // Generate options for day, month, year selects
  const days = Array.from({ length: 31 }, (_, i) =>
    (i + 1).toString().padStart(2, "0"),
  );
  const months = Array.from({ length: 12 }, (_, i) =>
    (i + 1).toString().padStart(2, "0"),
  );
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) =>
    (currentYear - i).toString(),
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-[425px] h-auto !p-0 mt-0 mb-16 max-h-[90vh] overflow-y-auto rounded-md ${styles.dialogContent} ${styles.scrollHidden}`}
      >
        <AnimatePresence mode="wait">
          {isEditing && isOwnProfile ? (
            <motion.div
              key="edit-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-0"
            >
              <div className="flex items-center px-6 py-2 border-b border-gray-200">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 mr-2"
                  onClick={() => setIsEditing(false)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-base font-medium">
                  Edit your personal information
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Personal information</h3>

                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <RadioGroup
                      value={gender}
                      onValueChange={setGender}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="MALE" id="male" />
                        <Label htmlFor="male">Male</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="FEMALE" id="female" />
                        <Label htmlFor="female">Female</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label>Birthday</Label>
                    <div className="flex gap-2">
                      <Select value={day} onValueChange={setDay}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Day" />
                        </SelectTrigger>
                        <SelectContent>
                          {days.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((y) => (
                            <SelectItem key={y} value={y}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Update
                  </Button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="profile-view"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader className="px-6 py-0 flex flex-row justify-between items-center h-10">
                <DialogTitle className="text-base font-semibold flex items-center h-10">
                  Profile
                </DialogTitle>
                <DialogClose className="opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"></DialogClose>
                <DialogDescription className="sr-only">
                  Xem và chỉnh sửa thông tin tài khoản của bạn
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col">
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
                      key={
                        currentUser?.userInfo?.coverImgUrl || "default-cover"
                      }
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
                                  result.message ||
                                    "Cover image updated successfully",
                                );

                                // Cập nhật URL hình ảnh mới
                                setCoverImageUrl(
                                  result.url + "?t=" + new Date().getTime(),
                                );

                                // Không cần đóng và mở lại dialog nữa vì đã cập nhật trực tiếp state
                              } else {
                                toast.error(
                                  result.error ||
                                    "Failed to update cover image",
                                );
                              }
                            } catch {
                              toast.error(
                                "An error occurred while updating cover image",
                              );
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-white/80 hover:bg-white rounded-full p-2 h-8 w-8 flex items-center justify-center"
                          onClick={() =>
                            document
                              .getElementById("cover-image-upload")
                              ?.click()
                          }
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Picture and Name */}
                <div className="flex flex-col items-center -mt-12 mb-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16 border-2 border-white">
                      <AvatarImage
                        src={
                          profileImageUrl ||
                          (currentUser?.userInfo?.profilePictureUrl
                            ? `${currentUser.userInfo.profilePictureUrl}?t=${new Date().getTime()}`
                            : "https://i.ibb.co/XxXXczsK/480479681-599145336423941-8941882180530449347-n.jpg")
                        }
                        key={
                          currentUser?.userInfo?.profilePictureUrl ||
                          "default-avatar"
                        }
                      />
                      <AvatarFallback>
                        {currentUser?.userInfo?.fullName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {isOwnProfile && (
                      <div className="absolute bottom-0 right-0">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-white rounded-full p-1 h-5 w-5 flex items-center justify-center"
                          onClick={() =>
                            profilePictureInputRef.current?.click()
                          }
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
                      {currentUser?.userInfo?.fullName || "Như Tâm"}
                    </h3>
                    {isOwnProfile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 h-auto ml-1"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Call/Chat Buttons (for other users) */}
                {!isOwnProfile && (
                  <div className="flex gap-2 px-4">
                    <Button onClick={onCall}>Call</Button>
                    <Button onClick={onChat}>Chat</Button>
                  </div>
                )}

                {/* Personal Information */}
                <div className="mt-4 px-6 py-4 border-t border-gray-200 bg-white">
                  <h4 className="font-semibold text-sm mb-3">
                    Personal information
                  </h4>
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-[100px_1fr] gap-1">
                      <span className="text-xs text-gray-500">Bio</span>
                      <span className="text-xs text-left">
                        {currentUser?.userInfo?.bio || "Test bio"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-1">
                      <span className="text-xs text-gray-500">Gender</span>
                      <span className="text-xs text-left">
                        {currentUser?.userInfo?.gender === "FEMALE"
                          ? "Nữ"
                          : currentUser?.userInfo?.gender === "MALE"
                            ? "Nam"
                            : "Khác"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-1">
                      <span className="text-xs text-gray-500">Birthday</span>
                      <span className="text-xs text-left">
                        {currentUser?.userInfo?.dateOfBirth
                          ? new Date(
                              currentUser.userInfo.dateOfBirth,
                            ).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "03/11/2003"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-1">
                      <span className="text-xs text-gray-500">
                        Phone number
                      </span>
                      <span className="text-xs text-left">
                        {currentUser?.phoneNumber || "+84 336 551 833"}
                      </span>
                    </div>
                    {isOwnProfile && (
                      <>
                        <div className="h-1"></div>
                        <p className="text-xs text-gray-500">
                          Only friends who have saved your number in their
                          contacts can see this number
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Photos/Videos - Only shown for other users' profiles */}
                {!isOwnProfile &&
                  currentUser?.posts &&
                  currentUser.posts.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-base">Photos/Videos</h4>
                        <Button variant="link" className="text-sm p-0 h-auto">
                          View all
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
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 mt-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-gray-500" />
                      <span className="text-sm">4 mutual groups</span>
                    </div>
                    <Button variant="ghost" className="justify-start w-full">
                      <Share2 className="h-5 w-5 mr-2 text-gray-500" />
                      Share contact
                    </Button>
                    <Button variant="ghost" className="justify-start w-full">
                      <Ban className="h-5 w-5 mr-2 text-gray-500" />
                      Block messages and calls
                    </Button>
                    <Button variant="ghost" className="justify-start w-full">
                      <AlertTriangle className="h-5 w-5 mr-2 text-gray-500" />
                      Report
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start w-full text-red-500"
                    >
                      <UserMinus className="h-5 w-5 mr-2" />
                      Remove friend
                    </Button>
                  </div>
                )}

                {/* Update Button (for own profile) */}
                {isOwnProfile && (
                  <div className="px-6 py-0.5 border-t border-gray-200 bg-white flex justify-center">
                    <Button
                      className="w-full  hover:bg-gray-100 text-black border-0 shadow-none"
                      variant="ghost"
                      onClick={() => setIsEditing(true)}
                    >
                      <span className="flex items-center">
                        <Pencil className="h-4 w-4 mr-2" />
                        Update
                      </span>
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
