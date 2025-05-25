import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, HelpCircle } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { vi } from "date-fns/locale";
import { DateRangePicker } from "./DateRangePicker";

interface FormFieldWithTooltipProps {
  form: any;
  field: string;
  tooltip: string;
  label: string;
  placeholder: string;
  type?: string;
  optional?: boolean;
}

export function FormFieldWithTooltip({
  form,
  field,
  tooltip,
  label,
  placeholder,
  type = "text",
  optional = false,
}: FormFieldWithTooltipProps) {
  return (
    <FormField
      control={form.control}
      name={field}
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2">
            {label}
            {optional && (
              <span className="text-sm text-muted-foreground">(Tùy chọn)</span>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>{tooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </FormLabel>
          <FormControl>
            {type === "dateRange" ? (
              <DateRangePicker field={formField} />
            ) : type === "date" ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formField.value && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formField.value
                      ? format(new Date(formField.value), "dd/MM/yyyy", {
                          locale: vi,
                        })
                      : "Chọn ngày"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={
                      formField.value ? new Date(formField.value) : undefined
                    }
                    onSelect={(date) => {
                      formField.onChange(date);
                    }}
                    locale={vi}
                  />
                </PopoverContent>
              </Popover>
            ) : type === "time" ? (
              <Input
                {...formField}
                type="time"
                placeholder={placeholder}
                className={cn(form.formState.errors[field] && "border-red-500")}
              />
            ) : type === "textarea" ? (
              <Textarea
                {...formField}
                placeholder={placeholder}
                className={cn(
                  "min-h-[100px]",
                  form.formState.errors[field] && "border-red-500",
                )}
              />
            ) : (
              <Input
                {...formField}
                type={type}
                placeholder={placeholder}
                className={cn(form.formState.errors[field] && "border-red-500")}
              />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
