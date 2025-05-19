import { memo, useRef, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import DateOfBirthPicker from "./DateOfBirthPicker";
import { CalendarIcon } from "lucide-react";

// Define form type for better type safety
export type ProfileFormValues = {
  fullName: string;
  gender: string;
  bio: string;
  day: string;
  month: string;
  year: string;
};

interface ProfileEditFormProps {
  initialValues: ProfileFormValues;
  onSubmit: (values: ProfileFormValues) => void;
  onCancel: () => void;
  days?: string[];
  months?: string[];
  years?: string[];
}

// Optimized input component that doesn't cause re-renders
const OptimizedInput = memo(
  ({
    id,
    defaultValue,
    placeholder,
    className,
  }: {
    id: string;
    defaultValue: string;
    placeholder?: string;
    className?: string;
  }) => {
    // Using a ref to avoid re-renders
    const inputRef = useRef<HTMLInputElement>(null);

    // Sử dụng useRef để lưu trữ giá trị thay vì useState để tránh re-render
    const valueRef = useRef(defaultValue);

    // Sử dụng debounce để giảm số lần cập nhật
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        // Lưu giá trị vào ref thay vì state
        valueRef.current = e.target.value;
      },
      [],
    );

    return (
      <Input
        ref={inputRef}
        id={id}
        name={id}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={cn("h-10", className)}
        onChange={handleChange}
      />
    );
  },
);

OptimizedInput.displayName = "OptimizedInput";

const ProfileEditForm = memo(
  ({ initialValues, onSubmit, onCancel }: ProfileEditFormProps) => {
    // Use refs for form elements
    const formRef = useRef<HTMLFormElement>(null);

    // State để lưu trữ giá trị ngày tháng năm hiện tại
    const [dateValues, setDateValues] = useState({
      day: initialValues.day,
      month: initialValues.month,
      year: initialValues.year,
    });

    // Cập nhật state khi initialValues thay đổi
    useEffect(() => {
      setDateValues({
        day: initialValues.day,
        month: initialValues.month,
        year: initialValues.year,
      });
    }, [initialValues.day, initialValues.month, initialValues.year]);

    // Các hàm xử lý sự kiện thay đổi ngày tháng năm
    const handleDayChange = useCallback((value: string) => {
      setDateValues((prev) => ({ ...prev, day: value }));
    }, []);

    const handleMonthChange = useCallback((value: string) => {
      setDateValues((prev) => ({ ...prev, month: value }));
    }, []);

    const handleYearChange = useCallback((value: string) => {
      setDateValues((prev) => ({ ...prev, year: value }));
    }, []);

    // Handle form submission using form data API
    const handleSubmit = useCallback(
      (e: React.FormEvent) => {
        e.preventDefault();

        if (!formRef.current) return;

        const formData = new FormData(formRef.current);
        const values: ProfileFormValues = {
          fullName: (formData.get("fullName") as string) || "",
          bio: (formData.get("bio") as string) || "",
          gender: (formData.get("gender") as string) || "MALE",
          day: dateValues.day,
          month: dateValues.month,
          year: dateValues.year,
        };

        onSubmit(values);
      },
      [onSubmit, dateValues],
    );

    return (
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="p-6 space-y-6 overflow-auto no-scrollbar"
      >
        <div className="space-y-2">
          <Label htmlFor="fullName">Tên hiển thị</Label>
          <OptimizedInput id="fullName" defaultValue={initialValues.fullName} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Giới thiệu</Label>
          <OptimizedInput
            id="bio"
            defaultValue={initialValues.bio}
            placeholder="Thêm giới thiệu về bạn"
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Thông tin cá nhân</h3>

          <div className="space-y-2">
            <Label>Giới tính</Label>
            <RadioGroup
              name="gender"
              defaultValue={initialValues.gender}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="MALE" id="male" />
                <Label htmlFor="male">Nam</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FEMALE" id="female" />
                <Label htmlFor="female">Nữ</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Ngày sinh</Label>
            <div className="flex items-center gap-2 border border-input rounded-md px-3 py-1">
              <CalendarIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <DateOfBirthPicker
                day={dateValues.day}
                month={dateValues.month}
                year={dateValues.year}
                onDayChange={handleDayChange}
                onMonthChange={handleMonthChange}
                onYearChange={handleYearChange}
                className="border-none shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Huỷ
          </Button>
          <Button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            Cập nhật
          </Button>
        </div>
      </form>
    );
  },
);

ProfileEditForm.displayName = "ProfileEditForm";

export default ProfileEditForm;
