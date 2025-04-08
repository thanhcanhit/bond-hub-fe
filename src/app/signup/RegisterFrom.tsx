import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, subYears } from "date-fns";
import {
  // Smartphone,
  UsersRound,
  Lock,
  CalendarIcon,
  UserRound,
  Venus,
  Mars,
  VenusAndMars,
  //CircleUserRound
} from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  completeRegistration,
  initiateRegistration,
  verifyOtp,
} from "@/actions/auth.action";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getDeviceInfo, isEmail, isPhoneNumber } from "@/utils/helpers";

export default function RegisterForm() {
  // Đặt ngày mặc định là ngày hiện tại
  const [date, setDate] = useState<Date>(new Date());
  const [step, setStep] = useState(1);
  const [inputValue, setInputValue] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("MALE");
  const [registrationId, setRegistrationId] = useState(""); // Lưu registrationId từ bước 1
  const [error, setError] = useState<string | null>(null); // Xử lý lỗi
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuthStore();

  // Bước 1: Gửi yêu cầu OTP
  const handleRequestOTP = async () => {
    setLoading(true);
    setError(null);
    if (!inputValue) {
      toast.warning("Vui lòng nhập số điện thoại hoặc email.");
      setError("Vui lòng nhập số điện thoại hoặc email.");
      setLoading(false);
      return;
    }

    const inputIsEmail = isEmail(inputValue);
    const inputIsPhone = isPhoneNumber(inputValue);

    if (!inputIsEmail && !inputIsPhone) {
      toast.warning("Vui lòng nhập email hoặc số điện thoại hợp lệ.");
      setError("Vui lòng nhập email hoặc số điện thoại hợp lệ.");
      setLoading(false);
      return;
    }

    // Gửi OTP qua email hoặc số điện thoại
    const result = await initiateRegistration(inputValue);
    setLoading(false);

    if (result.success && result.registrationId) {
      setRegistrationId(result.registrationId);
      setStep(2);
      toast.success(
        `Đã gửi mã OTP đến ${inputIsEmail ? "email" : "số điện thoại"} của bạn!`,
      );
    } else {
      toast.error("Không thể gửi OTP. Vui lòng thử lại.");
      setError(result.error || "Không thể gửi OTP. Vui lòng thử lại.");
    }
  };

  // Bước 2: Xác thực OTP
  const handleVerifyOTP = async () => {
    setLoading(true);
    setError(null);
    const result = await verifyOtp(registrationId, otp);
    setLoading(false);

    if (result.success) {
      toast.success("Xác thực OTP thành công!");
      setStep(3);
    } else {
      toast.error("Xác thực OTP thất bại!");
      setError(result.error || "Mã OTP không đúng. Vui lòng thử lại.");
    }
  };

  // Bước 3: Hoàn tất đăng ký
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!date) {
      toast.warning("Vui lòng chọn ngày sinh.");
      setError("Vui lòng chọn ngày sinh.");
      setLoading(false);
      return;
    }

    // Kiểm tra tuổi tối thiểu (13 tuổi)
    const minAgeDate = subYears(new Date(), 13);
    if (date > minAgeDate) {
      toast.warning("Bạn phải ít nhất 13 tuổi để đăng ký.");
      setError("Bạn phải ít nhất 13 tuổi để đăng ký.");
      setLoading(false);
      return;
    }

    const result = await completeRegistration(
      registrationId,
      password,
      fullName,
      date.toISOString(),
      gender,
    );
    setLoading(false);
    const { deviceType, deviceName } = getDeviceInfo();
    if (result.success) {
      const loginResult = await login(
        inputValue,
        password,
        deviceName,
        deviceType,
      );
      if (loginResult) {
        toast.success("Đăng ký thành công!");
        router.push("/dashboard");
      } else {
        toast.error("Đăng nhập thất bại!");
        setError(result.error || "Đăng ký thất bại. Vui lòng thử lại.");
      }
    }
  };

  return (
    <div className="mb-4 overflow-auto no-scrollbar">
      {step === 1 && (
        <div className="items-center w-full max-w-[373px] mx-auto justify-center overflow-auto no-scrollbar">
          <div className="flex items-center justify-center gap-2 border-b border-gray-200 mb-6">
            <UsersRound className="w-5 h-5" />
            <Input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Số điện thoại hoặc Email"
              className="border-none shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0"
              required
            />
          </div>
          <Button
            className="w-full h-[50px] bg-[#80c7f9] hover:bg-[#0068ff] text-white font-semibold rounded-md mb-3"
            onClick={handleRequestOTP}
            disabled={loading || !inputValue}
          >
            {loading ? "Đang gửi..." : "Nhận OTP"}
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="items-center flex flex-col gap-4 w-full max-w-[373px] mx-auto overflow-auto no-scrollbar">
          <p className="text-center">Nhập mã OTP</p>
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={setOtp}
            className="mb-4 flex gap-x-2 sm:gap-x-4 justify-center"
          >
            <InputOTPGroup>
              {[...Array(6)].map((_, i) => (
                <InputOTPSlot
                  className="w-8 h-10 sm:w-12 sm:h-12 text-lg sm:text-xl text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  key={i}
                  index={i}
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {error && (
            <p className="text-red-500 mb-3 text-center text-sm">{error}</p>
          )}
          <Button
            className="w-full h-[50px] bg-[#80c7f9] hover:bg-[#0068ff] text-white font-semibold rounded-md mb-3"
            onClick={handleVerifyOTP}
          >
            Xác nhận
          </Button>
        </div>
      )}

      {step === 3 && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col w-full max-w-[373px] mx-auto overflow-auto no-scrollbar"
        >
          <div className="flex items-center justify-center mb-3 text-muted-foreground">
            <p className="text-center">Nhập thông tin cá nhân</p>
          </div>
          <div className="flex items-center gap-2 border-b border-gray-200 pl-4 mb-6">
            <UserRound className="w-5 h-5 flex-shrink-0" />
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Họ và tên"
              className="border-none shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0"
              required
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="w-full">
              <div className="relative w-full">
                <Input
                  type="text"
                  placeholder="dd/mm/yyyy"
                  value={format(date, "dd/MM/yyyy")}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Nếu người dùng xóa hết, đặt date thành ngày hiện tại
                    if (!value) {
                      setDate(new Date());
                      return;
                    }

                    // Thử phân tích chuỗi ngày tháng
                    // Hỗ trợ định dạng: mm/dd/yyyy
                    const parts = value.split(/[\/\-\.]/);
                    if (parts.length === 3) {
                      const month = parseInt(parts[0], 10) - 1; // Tháng trong JS bắt đầu từ 0
                      const day = parseInt(parts[1], 10);
                      const year = parseInt(parts[2], 10);

                      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                        const newDate = new Date(year, month, day);
                        // Kiểm tra xem ngày có hợp lệ không
                        if (
                          newDate.getDate() === day &&
                          newDate.getMonth() === month &&
                          newDate.getFullYear() === year
                        ) {
                          // Kiểm tra tuổi tối thiểu
                          const minAgeDate = subYears(new Date(), 13);
                          if (newDate <= minAgeDate) {
                            setDate(newDate);
                          }
                        }
                      }
                    }
                  }}
                  className="h-12 pr-10 border-gray-300 focus:border-none focus:outline-none focus:ring-0 focus-visible:ring-0"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-600"
                    >
                      <CalendarIcon className="w-5 h-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0"
                    align="end"
                    side="right"
                    alignOffset={-5}
                    sideOffset={20}
                    style={{ marginTop: "40px" }} // Thêm khoảng cách với phía trên
                    forceMount // Đảm bảo popover luôn được render khi mở
                    sticky="always" // Luôn gắn với nút khi cuộn trang
                  >
                    <div className="p-3 border-b">
                      <div className="flex justify-between items-center mb-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="text-sm font-medium px-4 py-2 h-9 rounded-md"
                            >
                              {format(date, "MMMM")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 w-auto" align="start">
                            <div className="grid grid-cols-3 gap-1 p-2">
                              {[
                                "January",
                                "February",
                                "March",
                                "April",
                                "May",
                                "June",
                                "July",
                                "August",
                                "September",
                                "October",
                                "November",
                                "December",
                              ].map((month, index) => (
                                <Button
                                  key={month}
                                  variant="ghost"
                                  className="text-sm py-1 px-2"
                                  onClick={() => {
                                    const newDate = date
                                      ? new Date(date)
                                      : new Date();
                                    newDate.setMonth(index);
                                    setDate(newDate);
                                    // Đóng popover tháng
                                    const button = document
                                      .querySelector(
                                        '[data-state="open"][data-side="bottom"]',
                                      )
                                      ?.closest(
                                        "div[data-radix-popper-content-wrapper]",
                                      )
                                      ?.querySelector('button[type="button"]');
                                    if (button instanceof HTMLElement) {
                                      button.click();
                                    }
                                  }}
                                >
                                  {month}
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>

                        <Button
                          variant="ghost"
                          className="text-sm font-medium px-3 py-2 h-9"
                          onClick={() => setDate(new Date())}
                        >
                          Today
                        </Button>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="text-sm font-medium px-4 py-2 h-9 rounded-md"
                            >
                              {format(date, "yyyy")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 w-auto" align="end">
                            <div className="grid grid-cols-4 gap-1 p-2 max-h-[200px] overflow-y-auto">
                              {Array.from(
                                { length: 73 },
                                (_, i) => new Date().getFullYear() - 13 - i,
                              ).map((year) => (
                                <Button
                                  key={year}
                                  variant="ghost"
                                  className="text-sm py-1 px-2"
                                  onClick={() => {
                                    const newDate = date
                                      ? new Date(date)
                                      : new Date();
                                    newDate.setFullYear(year);
                                    setDate(newDate);
                                    // Đóng popover năm
                                    const button = document
                                      .querySelector(
                                        '[data-state="open"][data-side="bottom"]',
                                      )
                                      ?.closest(
                                        "div[data-radix-popper-content-wrapper]",
                                      )
                                      ?.querySelector('button[type="button"]');
                                    if (button instanceof HTMLElement) {
                                      button.click();
                                    }
                                  }}
                                >
                                  {year}
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(newDate) => {
                          // Nếu newDate là null (bỏ chọn), giữ nguyên ngày hiện tại
                          if (newDate) {
                            setDate(newDate);
                            // Tự động đóng popover khi chọn ngày
                            document.body.click();
                          }
                        }}
                        initialFocus
                        fromYear={1950}
                        toYear={new Date().getFullYear() - 13}
                        captionLayout="buttons"
                        month={date} // Sử dụng month thay vì defaultMonth để cập nhật khi thay đổi tháng/năm
                        disabled={{
                          after: subYears(new Date(), 13),
                        }}
                        showOutsideDays={true}
                        className="rounded-md border-0"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="w-full h-12 font-normal text-left justify-start gap-1 focus:border-none focus:outline-none focus:ring-0 focus-visible:ring-0">
                {gender === "MALE" && (
                  <Mars className="w-5 h-5 flex-shrink-0" />
                )}
                {gender === "FEMALE" && (
                  <Venus className="w-5 h-5 flex-shrink-0" />
                )}
                {gender === "OTHER" && (
                  <VenusAndMars className="w-5 h-5 flex-shrink-0" />
                )}
                <SelectValue placeholder="Chọn giới tính" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Nam</SelectItem>
                <SelectItem value="FEMALE">Nữ</SelectItem>
                <SelectItem value="OTHER">Khác</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 border-b border-gray-200 pl-4 mb-6">
            <Lock className="w-5 h-5 flex-shrink-0" />
            <Input
              className="border-none shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              required
            />
          </div>

          {error && <p className="text-red-500 mb-3 text-sm">{error}</p>}
          <Button
            className="w-full h-[50px] bg-[#80c7f9] hover:bg-[#0068ff] text-white font-semibold rounded-md mb-3"
            type="submit"
            disabled={loading || !fullName || !password || !date}
          >
            {loading ? "Đang hoàn tất..." : "Hoàn tất đăng ký"}
          </Button>
        </form>
      )}
    </div>
  );
}
