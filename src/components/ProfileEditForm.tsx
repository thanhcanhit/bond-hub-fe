import { memo, useRef, useCallback } from "react";
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

    return (
      <Input
        ref={inputRef}
        id={id}
        name={id}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={cn("h-10", className)}
        // Add a small delay to avoid immediate re-renders
        onChange={(e) => {
          e.persist();
        }}
      />
    );
  },
);

OptimizedInput.displayName = "OptimizedInput";

const ProfileEditForm = memo(
  ({ initialValues, onSubmit, onCancel }: ProfileEditFormProps) => {
    // Use refs for form elements
    const formRef = useRef<HTMLFormElement>(null);

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
          day: (formData.get("day") as string) || "",
          month: (formData.get("month") as string) || "",
          year: (formData.get("year") as string) || "",
        };

        onSubmit(values);
      },
      [onSubmit],
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
            <div className="flex items-center gap-2 border border-input rounded-md px-3">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              <DateOfBirthPicker
                day={initialValues.day}
                month={initialValues.month}
                year={initialValues.year}
                onDayChange={(value) => {
                  if (formRef.current) {
                    const dayInput =
                      formRef.current.querySelector('input[name="day"]');
                    if (dayInput) {
                      (dayInput as HTMLInputElement).value = value;
                    }
                  }
                }}
                onMonthChange={(value) => {
                  if (formRef.current) {
                    const monthInput = formRef.current.querySelector(
                      'input[name="month"]',
                    );
                    if (monthInput) {
                      (monthInput as HTMLInputElement).value = value;
                    }
                  }
                }}
                onYearChange={(value) => {
                  if (formRef.current) {
                    const yearInput =
                      formRef.current.querySelector('input[name="year"]');
                    if (yearInput) {
                      (yearInput as HTMLInputElement).value = value;
                    }
                  }
                }}
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
