import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  UsersRound,
  Lock,
  CalendarIcon,
  UserRound,
  Venus,
  Mars,
  VenusAndMars,
} from "lucide-react";
import DateOfBirthPicker from "@/components/profile/DateOfBirthPicker";
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
  completeRegistration,
  initiateRegistration,
  verifyOtp,
} from "@/actions/auth.action";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  getDeviceInfo,
  isEmail,
  isPhoneNumber,
  isVietnameseName,
} from "@/utils/helpers";

export default function RegisterForm() {
  // Đặt ngày mặc định là ngày hiện tại
  const [date, setDate] = useState<Date>(new Date());
  const [day, setDay] = useState<string>(String(new Date().getDate()));
  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [step, setStep] = useState(1);
  const [inputValue, setInputValue] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("MALE");
  const [registrationId, setRegistrationId] = useState(""); // Lưu registrationId từ bước 1
  // Sử dụng state error để lưu trữ thông báo lỗi (không hiển thị trên UI)
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuthStore();

  // Đồng bộ giữa date và day, month, year
  useEffect(() => {
    const newDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
    );
    // Kiểm tra xem ngày có hợp lệ không
    if (!isNaN(newDate.getTime())) {
      setDate(newDate);
    }
  }, [day, month, year]);

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

    // Kiểm tra họ tên
    if (!isVietnameseName(fullName)) {
      toast.warning("Vui lòng nhập đúng định dạng họ tên tiếng Việt.");
      setError("Vui lòng nhập đúng định dạng họ tên tiếng Việt.");
      setLoading(false);
      return;
    }

    // Kiểm tra ngày sinh
    if (!day || !month || !year) {
      toast.warning("Vui lòng chọn ngày sinh đầy đủ.");
      setError("Vui lòng chọn ngày sinh đầy đủ.");
      setLoading(false);
      return;
    }

    // Kiểm tra ngày sinh không được là ngày tương lai
    const today = new Date();
    if (date > today) {
      toast.warning("Ngày sinh không thể là ngày trong tương lai.");
      setError("Ngày sinh không thể là ngày trong tương lai.");
      setLoading(false);
      return;
    }

    // Kiểm tra mật khẩu
    if (password.length < 6) {
      toast.warning("Mật khẩu phải có ít nhất 6 ký tự.");
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      setLoading(false);
      return;
    }

    // Tạo đối tượng Date từ day, month, year
    const birthDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
    );

    const result = await completeRegistration(
      registrationId,
      password,
      fullName,
      birthDate.toISOString(),
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
          {error && process.env.NODE_ENV === "development" && (
            <p className="hidden">{error}</p>
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
          <div className="flex items-center gap-2 border-b border-gray-200 pl-4 mb-6">
            <CalendarIcon className="w-5 h-5 flex-shrink-0" />
            <div className="w-full">
              <DateOfBirthPicker
                day={day}
                month={month}
                year={year}
                onDayChange={setDay}
                onMonthChange={setMonth}
                onYearChange={setYear}
                className="border-none shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-gray-200 pl-4 mb-6">
            {gender === "MALE" && <Mars className="w-5 h-5 flex-shrink-0" />}
            {gender === "FEMALE" && <Venus className="w-5 h-5 flex-shrink-0" />}
            {gender === "OTHER" && (
              <VenusAndMars className="w-5 h-5 flex-shrink-0" />
            )}
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="border-none shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 h-[40px] sm:h-[50px] pl-0">
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

          {error && process.env.NODE_ENV === "development" && (
            <p className="hidden">{error}</p>
          )}
          <Button
            className="w-full h-[50px] bg-[#80c7f9] hover:bg-[#0068ff] text-white font-semibold rounded-md mb-3"
            type="submit"
            disabled={
              loading || !fullName || !password || !day || !month || !year
            }
          >
            {loading ? "Đang hoàn tất..." : "Hoàn tất đăng ký"}
          </Button>
        </form>
      )}
    </div>
  );
}
