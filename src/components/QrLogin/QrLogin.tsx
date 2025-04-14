import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useAuthStore } from "../../stores/authStore";
import {
  subscribeToQrEvents,
  unsubscribeFromQrEvents,
  initializeSocketDebugListeners,
} from "@/components/QrLogin/QrLogin.socket";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import {
  Loader2,
  RefreshCw,
  Clock,
  AlertCircle,
  Check,
  Smartphone,
} from "lucide-react";
import { io } from "socket.io-client";
import { QrStatusData, UserData } from "@/types/qrCode";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { generateQrCode } from "@/actions/qrAuth.action";
import { User } from "@/types/base";
import { getDeviceInfo } from "@/utils/helpers";
import { getSocketInstance } from "@/hooks/useSocketConnection";
import { getUserDataById } from "@/actions/user.action";

export default function QrLogin() {
  const [qrToken, setQrToken] = useState("");
  const [expiresAt, setExpiresAt] = useState<number>(Date.now() + 300 * 1000); // Mặc định 5 phút từ thời điểm hiện tại
  const [isQrExpired, setIsQrExpired] = useState<boolean>(false);
  const [qrCodeSize, setQrCodeSize] = useState<number>(200);

  const refreshQrCode = async (
    setIsQrExpired: React.Dispatch<React.SetStateAction<boolean>>,
    setStatus: React.Dispatch<
      React.SetStateAction<"pending" | "scanned" | "confirmed">
    >,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setScannedUser: React.Dispatch<React.SetStateAction<any>>,
    setQrToken: React.Dispatch<React.SetStateAction<string>>,
    setExpiresAt: React.Dispatch<React.SetStateAction<number>>,
  ): Promise<void> => {
    console.log("refreshQrCode: Setting isQrExpired to false");
    setIsQrExpired(false);
    setStatus("pending");
    setScannedUser(null);

    try {
      const { qrToken: newQrToken, expires_in: expiresInSeconds } =
        await generateQrCode();
      const newExpiresAt = Date.now() + expiresInSeconds * 1000;
      console.log(
        `Setting new QR token: ${newQrToken}, expires at: ${new Date(newExpiresAt).toISOString()}`,
      );
      setQrToken(newQrToken);
      setExpiresAt(newExpiresAt);
    } catch (error) {
      console.error("Error refreshing QR code:", error);
      throw error;
    }
  };
  // Log khi isQrExpired thay đổi
  useEffect(() => {
    console.log(`isQrExpired changed to: ${isQrExpired}`);
  }, [isQrExpired]);
  const [scannedUser, setScannedUser] = useState<UserData | null>(null);
  const [status, setStatus] = useState<"pending" | "scanned" | "confirmed">(
    "pending",
  );
  const { setAuth, setTokens } = useAuthStore();
  const router = useRouter();

  // Handle responsive QR code size
  useEffect(() => {
    const handleResize = () => {
      setQrCodeSize(window.innerWidth < 640 ? 160 : 200);
    };

    // Set initial size
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Initialize socket and fetch QR code when component mounts
  useEffect(() => {
    console.log("Component mounted, initializing socket and fetching QR code");
    // Khởi tạo socket khi component mount với namespace /qr-code
    const socket = io(
      `${process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000"}/qr-code`,
      {
        transports: ["websocket"],
        autoConnect: true,
      },
    );

    // Initialize socket debug listeners
    console.log("Socket initialized with namespace /qr-code");
    initializeSocketDebugListeners(socket);

    // Generate QR code khi component mount
    const fetchQrCode = async () => {
      try {
        await refreshQrCode(
          setIsQrExpired,
          setStatus,
          setScannedUser,
          setQrToken,
          setExpiresAt,
        );
      } catch (error) {
        console.error("Error generating QR code:", error);
      }
    };

    fetchQrCode();

    // Cleanup
    return () => {
      console.log("Closing socket connection");
      socket.close();
    };
  }, []);

  // Handle QR token changes and subscribe to events
  useEffect(() => {
    console.log(`QR token changed: ${qrToken}, isExpired: ${isQrExpired}`);
    if (!qrToken) return;

    // Create a new socket connection for this token
    const socket = io(
      `${process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000"}/qr-code`,
      {
        transports: ["websocket"],
        autoConnect: true,
      },
    );

    if (!socket) {
      console.error("Could not create socket");
      return;
    }

    // Xử lý sự kiện QR status
    const handleQrStatus = (data: QrStatusData) => {
      console.log("QR status update:", data);

      // Ensure data is properly formatted
      if (!data || typeof data !== "object") {
        console.error("Invalid data received:", data);
        return;
      }

      switch (data.status) {
        case "SCANNED":
          console.log(
            "Processing SCANNED status with userData:",
            data.userData,
          );
          setStatus("scanned");

          // Handle userData
          if (data.userData) {
            try {
              console.log("Setting scanned user:", data.userData);
              // Ensure userData has all required fields
              const safeUserData: UserData = {
                id: data.userData.id || "",
                email: data.userData.email || null,
                phoneNumber: data.userData.phoneNumber || null,
                fullName: data.userData.fullName || "Người dùng",
                profilePictureUrl: data.userData.profilePictureUrl || null,
              };
              setScannedUser(safeUserData);
            } catch (error) {
              console.error("Error setting scanned user:", error);
            }
          } else {
            console.warn("SCANNED event received but no userData found");
          }
          break;

        case "CONFIRMED":
          setStatus("confirmed");
          if (data.loginData) {
            const { user, accessToken, refreshToken } = data.loginData;

            // Create a User object from UserData
            const userForAuth: User = {
              id: user.id,
              email: user.email,
              phoneNumber: user.phoneNumber,
              passwordHash: "", // Required by User type but not needed for auth
              createdAt: new Date(),
              updatedAt: new Date(),
              userInfo: {
                id: user.id,
                fullName: user.fullName,
                profilePictureUrl: user.profilePictureUrl,
                coverImgUrl: user.coverImgUrl || null,
                blockStrangers: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                userAuth: {} as User, // Circular reference, not needed for auth
              },
              refreshTokens: [],
              qrCodes: [],
              posts: [],
              stories: [],
              groupMembers: [],
              cloudFiles: [],
              pinnedItems: [],
              sentFriends: [],
              receivedFriends: [],
              contacts: [],
              contactOf: [],
              settings: [],
              postReactions: [],
              hiddenPosts: [],
              addedBy: [],
              notifications: [],
              sentMessages: [],
              receivedMessages: [],
              comments: [],
            };

            // Get device info for login
            getDeviceInfo(); // Just calling for consistency with regular login, not using the values

            // Initial auth state with basic information
            setAuth(userForAuth, accessToken);

            // Save refresh token
            setTokens(accessToken, refreshToken);

            // Get the main socket instance from the hook (will be established by SocketProvider)
            // This ensures we have the same socket connection as regular login
            const mainSocket = getSocketInstance();

            // Check if mainSocket exists; if not, it will be created by the SocketProvider
            if (!mainSocket) {
              console.log(
                "Main socket will be established by SocketProvider after auth is set",
              );
            } else {
              console.log(
                "Main socket already exists, will reconnect with new auth token",
              );
            }

            // After login, fetch complete user data to get any missing fields
            setTimeout(async () => {
              try {
                // Get full user profile data with all fields
                const userData = await getUserDataById(user.id);
                if (userData.success && userData.user) {
                  // Update user with complete data including cover image and other fields
                  useAuthStore.getState().updateUser(userData.user);
                  console.log(
                    "User data updated with complete profile including cover image",
                  );
                }
              } catch (error) {
                console.error("Error fetching complete user data:", error);
              } finally {
                // Redirect after auth is set and user data is fetched, even if fetch fails
                router.push("/dashboard");
              }
            }, 1000);
          }
          break;

        case "CANCELLED":
          console.log("Received CANCELLED event from server");
          setIsQrExpired(true);
          break;

        case "EXPIRED":
          console.log("Received EXPIRED event from server");
          setIsQrExpired(true);
          break;
      }
    };

    // Subscribe to events for this token
    console.log(`Subscribing to events for token: ${qrToken}`);
    subscribeToQrEvents(socket, qrToken, handleQrStatus);

    // Cleanup when token changes
    return () => {
      unsubscribeFromQrEvents(socket, qrToken);
    };
  }, [qrToken, router, setAuth, setTokens, isQrExpired]);

  // Tính và format thời gian còn lại
  const [timeLeft, setTimeLeft] = useState<number>(300); // Mặc định 5 phút (300 giây)

  // Cập nhật thời gian còn lại mỗi giây
  useEffect(() => {
    console.log(
      `Timer effect triggered - qrToken: ${qrToken}, isExpired: ${isQrExpired}, expiresAt: ${expiresAt}`,
    );
    // Chỉ bắt đầu đếm ngược khi có mã QR và chưa hết hạn
    if (!qrToken || isQrExpired || expiresAt === 0) {
      console.log("Timer not started - conditions not met");
      return;
    }

    // Cập nhật ngay lần đầu
    const updateTimeLeft = () => {
      const currentTime = Date.now();
      const timeRemaining = expiresAt - currentTime;
      const newTimeLeft = Math.max(0, Math.floor(timeRemaining / 1000));

      // Log thời gian còn lại mỗi 5 giây để tránh quá nhiều log
      if (newTimeLeft % 5 === 0 || newTimeLeft <= 10) {
        console.log(
          `Time left: ${newTimeLeft}s, Current: ${new Date(currentTime).toISOString()}, Expires: ${new Date(expiresAt).toISOString()}`,
        );
      }

      setTimeLeft(newTimeLeft);

      // Kiểm tra nếu hết hạn
      if (newTimeLeft === 0 && !isQrExpired) {
        console.log("QR code expired naturally (timer reached zero)");
        setIsQrExpired(true);
      }
    };

    // Cập nhật ngay lập tức
    updateTimeLeft();

    // Thiết lập interval để cập nhật mỗi giây
    const intervalId = setInterval(updateTimeLeft, 1000);

    // Cleanup khi component unmount
    return () => clearInterval(intervalId);
  }, [expiresAt, isQrExpired, qrToken]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Log component state for debugging
  useEffect(() => {
    console.log(
      "Component state updated - status:",
      status,
      "scannedUser:",
      scannedUser,
    );
  }, [status, scannedUser]);

  const renderContent = () => {
    if (!qrToken) {
      console.log("Rendering loading UI");
      return (
        <div className="flex flex-col items-center justify-center h-full w-full">
          <div className="mb-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center"></div>
              <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500 animate-spin absolute inset-0 m-auto" />
            </div>
          </div>
          <p className="text-gray-600 font-medium text-sm sm:text-base">
            Đang tạo mã QR...
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Vui lòng đợi trong giây lát
          </p>
        </div>
      );
    }

    if (isQrExpired) {
      console.log("Rendering expired QR code UI");
      return (
        <div className="flex flex-col items-center justify-center h-full w-full">
          <div className="mb-4 bg-orange-100 p-3 sm:p-4 rounded-full">
            <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-orange-500" />
          </div>
          <p className="font-bold text-base sm:text-lg mb-2 sm:mb-3 text-gray-800 text-center">
            Mã QR đã hết hạn hoặc huỷ bỏ
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 text-center px-2 sm:px-4">
            Mã QR chỉ có hiệu lực trong 5 phút. Vui lòng tạo mã mới để tiếp tục.
          </p>
          <Button
            onClick={async () => {
              try {
                await refreshQrCode(
                  setIsQrExpired,
                  setStatus,
                  setScannedUser,
                  setQrToken,
                  setExpiresAt,
                );
              } catch (error) {
                console.error("Error refreshing QR code:", error);
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base"
          >
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
            Tạo mã QR mới
          </Button>
        </div>
      );
    }

    if (status === "scanned") {
      console.log("Status is 'scanned', scannedUser:", scannedUser);
      if (!scannedUser) {
        console.warn(
          "scannedUser is null or undefined despite status being 'scanned'",
        );
        return (
          <div className="flex flex-col items-center justify-center h-full w-full">
            <div className="mb-4 bg-blue-100 p-4 rounded-full">
              <Smartphone className="h-16 w-16 text-blue-600" />
            </div>
            <p className="font-bold text-lg text-gray-800">
              QR code đã được quét
            </p>
            <p className="text-sm text-gray-500 mt-2 text-center px-4">
              Đang chờ thông tin người dùng...
            </p>
          </div>
        );
      }
      console.log("Rendering scanned user UI:", scannedUser);
      return (
        <div className="flex flex-col items-center justify-center h-full w-full">
          <div className="mb-4 relative">
            <Avatar className="h-24 w-24">
              <AvatarImage
                src={scannedUser.profilePictureUrl || undefined}
                alt="Profile"
                className="object-cover"
              />
              <AvatarFallback className="text-3xl">
                {scannedUser.fullName
                  ?.split(" ")
                  .map((word) => word[0]?.toUpperCase())
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1">
              <Check className="h-5 w-5 text-white" />
            </div>
          </div>

          <div className="text-center">
            <p className="font-bold text-lg text-gray-800">
              {scannedUser.fullName || "Người dùng"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {scannedUser.email || ""}
            </p>
          </div>

          <div className="mt-6 text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              <p className="text-sm font-medium text-green-600">
                Đã quét mã QR
              </p>
            </div>
            <p className="text-sm text-blue-500 mt-2 px-4">
              Vui lòng xác nhận đăng nhập trên thiết bị di động của bạn
            </p>
          </div>
        </div>
      );
    }

    if (status === "confirmed") {
      console.log("Rendering confirmed UI");
      return (
        <div className="flex flex-col items-center justify-center h-full w-full">
          <div className="mb-6 bg-green-100 p-4 rounded-full">
            <Check className="h-16 w-16 text-green-600" />
          </div>
          <p className="font-bold text-xl text-gray-800">
            Đăng nhập thành công!
          </p>
          <p className="text-sm text-gray-500 mt-2">Đang chuyển hướng...</p>
          <div className="mt-4 w-12 h-1">
            <div className="animate-pulse bg-blue-500 h-1 w-full rounded-full"></div>
          </div>
        </div>
      );
    }

    // Trạng thái mặc định: hiển thị QR code để quét
    console.log("Rendering QR code UI for scanning");
    return (
      <div className="flex flex-col items-center justify-between h-full w-full">
        <div className="relative p-3 bg-white rounded-xl mb-4 shadow-sm border border-gray-100">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white rounded-xl opacity-50"></div>
          <QRCodeCanvas
            value={qrToken}
            size={qrCodeSize}
            className="rounded-lg relative z-10"
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
          />
        </div>
        <div className="w-fit bg-blue-500 text-white text-xs px-2 py-1 rounded-full mb-2">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>

        <div className="text-center space-y-3 w-full">
          <p className="text-blue-600 font-semibold text-base">
            Quét mã để đăng nhập
          </p>
          <p className="text-sm text-gray-500 px-4">
            Mở ứng dụng Vodka trên điện thoại và quét mã này để đăng nhập nhanh
            chóng
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-4 sm:p-6">
      <div className="flex flex-col items-center gap-6 max-w-md w-full">
        <div className="w-full sm:w-fit flex flex-col items-center  p-4 sm:p-6 rounded-2xl  bg-white transition-all duration-300">
          <div className="flex flex-col items-center justify-center min-h-[350px] w-full">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
