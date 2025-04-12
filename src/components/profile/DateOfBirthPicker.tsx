import React, { useEffect, useState, useCallback } from "react";
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
  // Tạo danh sách năm từ năm hiện tại trở về 100 năm trước
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));

  // Danh sách tháng từ 1-12
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1));

  // State để lưu số ngày trong tháng
  const [days, setDays] = useState<string[]>([]);

  // Hàm kiểm tra năm nhuận
  const isLeapYear = useCallback((year: number): boolean => {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }, []);

  // Hàm tính số ngày trong tháng
  const getDaysInMonth = useCallback(
    (month: number, year: number): number => {
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
    },
    [isLeapYear],
  );

  // Kiểm tra xem ngày đã chọn có phải là ngày tương lai không
  const checkFutureDate = useCallback(() => {
    const selectedDay = parseInt(day, 10);
    const selectedMonth = parseInt(month, 10);
    const selectedYear = parseInt(year, 10);

    if (isNaN(selectedDay) || isNaN(selectedMonth) || isNaN(selectedYear)) {
      return false;
    }

    const selectedDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Đặt giờ về 00:00:00 để so sánh chỉ ngày

    return selectedDate > today;
  }, [day, month, year]);

  // Cập nhật số ngày khi tháng hoặc năm thay đổi
  useEffect(() => {
    const monthNum = parseInt(month, 10) || 1;
    const yearNum = parseInt(year, 10) || currentYear;
    const daysInMonth = getDaysInMonth(monthNum, yearNum);

    // Tạo mảng ngày từ 1 đến số ngày trong tháng
    const newDays = Array.from({ length: daysInMonth }, (_, i) =>
      String(i + 1),
    );

    setDays(newDays);

    // Nếu ngày hiện tại lớn hơn số ngày trong tháng, cập nhật lại ngày
    if (parseInt(day, 10) > daysInMonth) {
      onDayChange(String(daysInMonth));
    }
  }, [month, year, day, onDayChange, currentYear, getDaysInMonth]);

  // Kiểm tra ngày tương lai khi ngày, tháng, năm thay đổi
  // Sử dụng debounce để tránh hiển thị quá nhiều cảnh báo
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showFutureWarning && checkFutureDate()) {
        toast.warning("Ngày sinh không thể là ngày trong tương lai.");
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [day, month, year, checkFutureDate, showFutureWarning]);

  return (
    <div className={`flex gap-2 ${className || ""}`}>
      <Select
        value={day}
        onValueChange={(value) => {
          onDayChange(value);
        }}
        name="day"
      >
        <SelectTrigger className={`flex-1 ${className || ""}`}>
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

      <Select
        value={month}
        onValueChange={(value) => {
          onMonthChange(value);
        }}
        name="month"
      >
        <SelectTrigger className={`flex-1 ${className || ""}`}>
          <SelectValue placeholder="Tháng" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px] overflow-y-auto">
          {months.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={year}
        onValueChange={(value) => {
          onYearChange(value);
        }}
        name="year"
      >
        <SelectTrigger className={`flex-1 ${className || ""}`}>
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
