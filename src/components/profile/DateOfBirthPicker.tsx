import React, { useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface DateOfBirthPickerProps {
  day: string;
  month: string;
  year: string;
  onDayChange: (day: string) => void;
  onMonthChange: (month: string) => void;
  onYearChange: (year: string) => void;
  className?: string;
  showFutureWarning?: boolean;
}

// Danh sách tháng từ 1-12 với tên tháng - định nghĩa bên ngoài component để tránh tạo lại
const MONTH_NAMES = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

// Hàm kiểm tra năm nhuận - định nghĩa bên ngoài component
const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

// Hàm tính số ngày trong tháng - định nghĩa bên ngoài component
const getDaysInMonth = (month: number, year: number): number => {
  // Tháng 2
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  // Tháng 4, 6, 9, 11 có 30 ngày
  else if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }
  // Các tháng còn lại có 31 ngày
  else {
    return 31;
  }
};

// Tạo mảng tháng từ 1-12 - định nghĩa bên ngoài component
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1));

const DateOfBirthPicker: React.FC<DateOfBirthPickerProps> = ({
  day,
  month,
  year,
  onDayChange,
  onMonthChange,
  onYearChange,
  className,
  showFutureWarning = true,
}) => {
  // Lấy năm hiện tại một lần duy nhất
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Memoize danh sách năm để tránh tạo lại mỗi lần render
  const years = useMemo(
    () => Array.from({ length: 100 }, (_, i) => String(currentYear - i)),
    [currentYear],
  );

  // Tính toán số ngày trong tháng và tạo mảng ngày
  const days = useMemo(() => {
    const monthNum = parseInt(month, 10) || 1;
    const yearNum = parseInt(year, 10) || currentYear;
    const daysInMonth = getDaysInMonth(monthNum, yearNum);
    return Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
  }, [month, year, currentYear]);

  // Xử lý khi ngày vượt quá số ngày trong tháng
  useEffect(() => {
    const monthNum = parseInt(month, 10) || 1;
    const yearNum = parseInt(year, 10) || currentYear;
    const daysInMonth = getDaysInMonth(monthNum, yearNum);

    if (parseInt(day, 10) > daysInMonth) {
      onDayChange(String(daysInMonth));
    }
  }, [month, year, day, onDayChange, currentYear]);

  // Kiểm tra ngày tương lai - chỉ khi cả ba giá trị đều có
  useEffect(() => {
    // Chỉ kiểm tra khi cả ba giá trị đều hợp lệ
    if (!day || !month || !year || !showFutureWarning) return;

    const selectedDay = parseInt(day, 10);
    const selectedMonth = parseInt(month, 10);
    const selectedYear = parseInt(year, 10);

    if (isNaN(selectedDay) || isNaN(selectedMonth) || isNaN(selectedYear)) {
      return;
    }

    const selectedDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      // Sử dụng setTimeout để tránh hiển thị cảnh báo quá sớm
      const timer = setTimeout(() => {
        toast.warning("Ngày sinh không thể là ngày trong tương lai.");
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [day, month, year, showFutureWarning]);

  return (
    <div className={`flex gap-2 ${className || ""}`}>
      <Select value={day} onValueChange={onDayChange} name="day">
        <SelectTrigger className={`w-[80px] ${className || ""}`}>
          <SelectValue placeholder="Ngày" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px] overflow-y-auto">
          {days.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={month} onValueChange={onMonthChange} name="month">
        <SelectTrigger className={`w-[120px] ${className || ""}`}>
          <SelectValue placeholder="Tháng" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px] overflow-y-auto">
          {MONTHS.map((m, index) => (
            <SelectItem key={m} value={m}>
              {MONTH_NAMES[index]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={year} onValueChange={onYearChange} name="year">
        <SelectTrigger className={`w-[100px] ${className || ""}`}>
          <SelectValue placeholder="Năm" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px] overflow-y-auto">
          {years.map((y) => (
            <SelectItem key={y} value={y}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default React.memo(DateOfBirthPicker);
