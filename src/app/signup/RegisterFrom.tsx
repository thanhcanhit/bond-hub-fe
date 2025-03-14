import React, { useState } from "react";
// import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  // Smartphone,
  UsersRound,
  Lock,
  CalendarIcon,
  UserRound,
  Venus,
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

// Hàm kiểm tra định dạng email hoặc số điện thoại
const isEmail = (input: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input);
};

const isPhoneNumber = (input: string): boolean => {
  const phoneRegex = /^\d{10,11}$/; // Giả sử số điện thoại Việt Nam có 10-11 chữ số
  return phoneRegex.test(input);
};

export default function RegisterForm() {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [step, setStep] = useState(1);
  const [inputValue, setInputValue] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("MALE");
  const [registrationId, setRegistrationId] = useState(""); // Lưu registrationId từ bước 1
  const [error, setError] = useState<string | null>(null); // Xử lý lỗi
  const [loading, setLoading] = useState(false);
  // const router = useRouter();

  // Bước 1: Gửi yêu cầu OTP
  const handleRequestOTP = async () => {
    setLoading(true);
    setError(null);
    if (!inputValue) {
      setError("Vui lòng nhập số điện thoại hoặc email.");
      setLoading(false);
      return;
    }

    const inputIsEmail = isEmail(inputValue);
    const inputIsPhone = isPhoneNumber(inputValue);

    if (!inputIsEmail && !inputIsPhone) {
      setError("Vui lòng nhập email hoặc số điện thoại hợp lệ.");
      setLoading(false);
      return;
    }

    // Hiện tại chỉ hỗ trợ gửi OTP qua email
    if (inputIsEmail) {
      const result = await initiateRegistration(inputValue); // Gửi email thay vì phoneNumber
      setLoading(false);

      if (result.success && result.registrationId) {
        setRegistrationId(result.registrationId);
        setStep(2);
      } else {
        setError(result.error || "Không thể gửi OTP. Vui lòng thử lại.");
      }
    } else if (inputIsPhone) {
      setError(
        "Hiện tại chúng tôi chỉ hỗ trợ gửi OTP qua email. Vui lòng dùng email để đăng ký.",
      );
      setLoading(false);
    }
  };

  // Bước 2: Xác thực OTP
  const handleVerifyOTP = async () => {
    setLoading(true);
    setError(null);
    const result = await verifyOtp(registrationId, otp);
    setLoading(false);

    if (result.success) {
      setStep(3);
    } else {
      setError(result.error || "Mã OTP không đúng. Vui lòng thử lại.");
    }
  };

  // Bước 3: Hoàn tất đăng ký
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await completeRegistration(
      registrationId,
      password,
      fullName,
    );
    setLoading(false);

    if (result.success) {
      alert("Đăng ký thành công!");
      // Có thể redirect hoặc làm gì đó sau khi đăng ký thành công
      // Ví dụ: router.push("/login");
    } else {
      setError(result.error || "Đăng ký thất bại. Vui lòng thử lại.");
    }
  };
  return (
    <div className="mb-4">
      {/* <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2 justify-center items-center">
          <div className="flex items-center gap-2 border-b border-gray-200 mb-3">
          <CircleUserRound className="w-5 h-5" />
          <Input
            className="w-[350px] h-[50px]"
            type="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Họ tên"
            required
          />
        </div>
          <div className="flex items-center gap-2 border-b border-gray-200 mb-3">
            <UsersRound className="w-5 h-5" />
            <Input
              className="w-[350px] h-[50px]"
              type="receiveOTP"
              value={receiveOTP}
              onChange={(e) => setReceiveOTP(e.target.value)}
              placeholder="Số điện thoại hoặc Email"
              required
            />
          </div>
          <div className="flex items-center gap-2 border-b border-gray-200 mb-7">
          <Lock className="w-5 h-5" />
          <Input
            className="w-[350px] h-[50px]"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu"
            required
          />
        </div>

          <Button
            className="w-[373px] h-[50px] bg-[#80c7f9] hover:bg-[#0068ff] text-white font-semibold rounded-md mb-3"
            type="submit"
          >
            Đăng ký tài khoản
          </Button>
        </div>
      </form> */}
      {step === 1 && (
        <div className="items-center">
          <div className="flex items-center gap-2 border-b border-gray-200 mb-6">
            <UsersRound className="w-5 h-5" />
            <Input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Số điện thoại hoặc Email"
              required
            />
          </div>
          <Button
            className="w-[373px] h-[50px] bg-[#80c7f9] hover:bg-[#0068ff] text-white font-semibold rounded-md mb-3"
            onClick={handleRequestOTP}
            disabled={loading || !inputValue}
          >
            {loading ? "Đang gửi..." : "Nhận OTP"}
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="items-center flex flex-col gap-4">
          <p>Nhập mã OTP</p>
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={setOtp}
            className="mb-4 flex gap-x-4"
          >
            <InputOTPGroup>
              {[...Array(6)].map((_, i) => (
                <InputOTPSlot
                  className="w-12 h-12 text-xl text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  key={i}
                  index={i}
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {error && <p className="text-red-500 mb-3">{error}</p>}
          <Button
            className="w-[373px] h-[50px] bg-[#80c7f9] hover:bg-[#0068ff] text-white font-semibold rounded-md mb-3"
            onClick={handleVerifyOTP}
          >
            Xác nhận
          </Button>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex items-center justify-center mb-3 text-muted-foreground">
            <p>Nhập thông tin cá nhân</p>
          </div>
          <div className="flex items-center gap-2 border-b border-gray-200 pl-4 mb-8">
            <UserRound className="w-5 h-5" />
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Họ và tên"
              required
            />
          </div>
          <div className="flex flex-row gap-2 mb-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full h-12 justify-start text-left font-normal",
                    !date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="w-5 h-5" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="w-full h-12 font-normal text-left justify-start gap-1">
                <Venus className="w-5 h-5" />
                <SelectValue placeholder="Chọn giới tính" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Nam</SelectItem>
                <SelectItem value="FEMALE">Nữ</SelectItem>
                <SelectItem value="OTHER">Khác</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 border-b border-gray-200 pl-4 mb-8">
            <Lock className="w-5 h-5" />
            <Input
              className="w-[350px] h-[50px]"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              required
            />
          </div>

          <Button
            className="w-[373px] h-[50px] bg-[#80c7f9] hover:bg-[#0068ff] text-white font-semibold rounded-md mb-3"
            type="submit"
            disabled={loading || !fullName || !password}
          >
            {loading ? "Đang hoàn tất..." : "Hoàn tất đăng ký"}
          </Button>
        </form>
      )}
    </div>
  );
}
