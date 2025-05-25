import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Send,
  Copy,
  Mail,
  Sparkles,
  Calendar as CalendarIcon,
  Eye,
  Code,
  ArrowLeft,
} from "lucide-react";
import { generateAIResponse } from "@/actions/ai.action";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import { useAuthStore } from "@/stores/authStore";

import { EMAIL_TEMPLATES } from "./templates/email-templates";
import { FormFieldWithTooltip } from "./components/FormFieldWithTooltip";
import {
  leaveFormSchema,
  reportFormSchema,
  meetingFormSchema,
  customFormSchema,
} from "./schemas/form-schemas";
import type {
  AIEmailDialogProps,
  FormData,
  LeaveFormData,
  MeetingFormData,
} from "./types";

export default function AIEmailDialog({ isOpen, onClose }: AIEmailDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(
    EMAIL_TEMPLATES[0].id,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [viewMode, setViewMode] = useState<"preview" | "markdown">("preview");
  const { user } = useAuthStore();

  const selectedTemplateData = EMAIL_TEMPLATES.find(
    (t) => t.id === selectedTemplate,
  );

  const getFormSchema = () => {
    switch (selectedTemplate) {
      case "leave":
        return leaveFormSchema;
      case "report":
        return reportFormSchema;
      case "meeting":
        return meetingFormSchema;
      case "custom":
        return customFormSchema;
      default:
        return leaveFormSchema;
    }
  };

  // Use type assertions to handle the dynamic form types
  const form = useForm({
    // @ts-expect-error - Dynamic schema validation
    resolver: zodResolver(getFormSchema()),
    defaultValues: {
      recipientName: "",
    },
  });

  const handleTemplateChange = (value: string) => {
    setSelectedTemplate(value);
    // Reset form with empty values
    form.reset();
    setGeneratedEmail("");
  };

  const onSubmit = form.handleSubmit(async (data) => {
    if (!selectedTemplateData) return;

    setIsGenerating(true);
    try {
      let prompt = selectedTemplateData.prompt;

      // Add user information to data object
      const formattedData: Record<string, any> = { ...data };
      if (user) {
        formattedData.senderInfo = user.email;
      }

      // Format dates for leave form
      if (selectedTemplate === "leave" && "dateRange" in data) {
        const dateRange = data.dateRange;
        if (dateRange?.from && dateRange?.to) {
          const startDate = format(dateRange.from, "dd/MM/yyyy", {
            locale: vi,
          });
          const endDate = format(dateRange.to, "dd/MM/yyyy", { locale: vi });
          const diffTime = Math.abs(
            dateRange.to.getTime() - dateRange.from.getTime(),
          );
          const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

          Object.assign(formattedData, { startDate, endDate, days });
        }
      }

      // Format date for meeting form
      if (
        selectedTemplate === "meeting" &&
        "meetingDate" in data &&
        data.meetingDate instanceof Date
      ) {
        formattedData.meetingDate = format(data.meetingDate, "dd/MM/yyyy", {
          locale: vi,
        });
      }

      // Replace all placeholders in the prompt
      Object.entries(formattedData).forEach(([key, value]) => {
        if (
          value !== undefined &&
          (typeof value === "string" || typeof value === "number")
        ) {
          prompt = prompt.replace(new RegExp(`{${key}}`, "g"), String(value));
        }
      });

      // Remove any remaining placeholders
      prompt = prompt.replace(/\{[^}]+\}/g, "");

      const result = await generateAIResponse(prompt);
      if (result.success && result.response) {
        setGeneratedEmail(result.response);
        toast.success("Email đã được tạo thành công");
      } else {
        toast.error("Không thể tạo email", {
          description: result.error || "Đã xảy ra lỗi khi tạo email",
        });
      }
    } catch (error) {
      toast.error("Không thể tạo email", {
        description: "Đã xảy ra lỗi khi kết nối đến dịch vụ AI",
      });
    } finally {
      setIsGenerating(false);
    }
  });

  const handleCopy = () => {
    if (generatedEmail) {
      navigator.clipboard.writeText(generatedEmail);
      toast.success("Đã sao chép email vào clipboard");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0">
        <DialogHeader className="px-6 pt-6">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              AI Viết Email
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate
                ? EMAIL_TEMPLATES.find((t) => t.id === selectedTemplate)?.name
                : "Tạo email chuyên nghiệp nhanh chóng với sự hỗ trợ của AI"}
            </DialogDescription>
            {selectedTemplate && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  if (generatedEmail) {
                    setGeneratedEmail("");
                  } else {
                    setSelectedTemplate("");
                    form.reset();
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="px-6">
          <ScrollArea className="h-[calc(90vh-180px)]">
            <div className="mt-4">
              {!selectedTemplate ? (
                // Step 1: Template Selection
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {EMAIL_TEMPLATES.map((template) => (
                      <Card
                        key={template.id}
                        className={cn(
                          "cursor-pointer transition-all hover:border-blue-500",
                          selectedTemplate === template.id && "border-blue-500",
                        )}
                        onClick={() => handleTemplateChange(template.id)}
                      >
                        <CardHeader className="flex flex-row items-center gap-2">
                          <template.icon className="h-5 w-5 text-blue-500" />
                          <CardTitle className="text-lg">
                            {template.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <CardDescription>
                            {template.description}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : !generatedEmail ? (
                // Step 2: Form Input
                <div className="space-y-4">
                  <Form {...form}>
                    <form
                      id="email-form"
                      onSubmit={onSubmit}
                      className="space-y-4"
                    >
                      {selectedTemplate === "leave" && (
                        <>
                          <FormFieldWithTooltip
                            form={form}
                            field="recipientName"
                            label="Người nhận"
                            tooltip="Người có thẩm quyền phê duyệt đơn xin nghỉ của bạn"
                            placeholder="Ví dụ: Trưởng phòng A, Anh B"
                          />
                          <FormFieldWithTooltip
                            form={form}
                            field="dateRange"
                            label="Thời gian nghỉ"
                            tooltip="Chọn ngày bắt đầu và kết thúc kỳ nghỉ"
                            type="dateRange"
                            placeholder="Chọn ngày"
                          />
                          <FormFieldWithTooltip
                            form={form}
                            field="reason"
                            label="Lý do nghỉ phép"
                            tooltip="Nêu rõ lý do xin nghỉ phép của bạn"
                            type="textarea"
                            placeholder="Nhập lý do chi tiết..."
                          />
                          <FormFieldWithTooltip
                            form={form}
                            field="handoverTo"
                            label="Người bàn giao công việc"
                            tooltip="Đồng nghiệp sẽ đảm nhận công việc trong thời gian bạn nghỉ"
                            placeholder="Tên đồng nghiệp"
                            optional
                          />
                        </>
                      )}

                      {selectedTemplate === "report" && (
                        <>
                          <FormFieldWithTooltip
                            form={form}
                            field="recipientName"
                            label="Người nhận báo cáo"
                            tooltip="Người quản lý hoặc phòng ban cần nhận báo cáo"
                            placeholder="Tên người quản lý, phòng ban..."
                          />
                          <FormFieldWithTooltip
                            form={form}
                            field="reportingPeriod"
                            label="Kỳ báo cáo"
                            tooltip="Khoảng thời gian của báo cáo"
                            placeholder="Ví dụ: Tuần 25, Tháng 7/2024"
                          />
                          <FormFieldWithTooltip
                            form={form}
                            field="completedTasks"
                            label="Công việc đã hoàn thành"
                            tooltip="Liệt kê các công việc đã hoàn thành trong kỳ"
                            type="textarea"
                            placeholder="Liệt kê các công việc đã hoàn thành..."
                          />
                          <FormFieldWithTooltip
                            form={form}
                            field="ongoingTasks"
                            label="Công việc đang thực hiện"
                            tooltip="Các công việc đang trong quá trình thực hiện"
                            type="textarea"
                            placeholder="Liệt kê các công việc đang thực hiện..."
                          />
                          <FormFieldWithTooltip
                            form={form}
                            field="nextPeriodPlans"
                            label="Kế hoạch cho kỳ tới"
                            tooltip="Dự kiến công việc sẽ thực hiện trong kỳ tiếp theo"
                            type="textarea"
                            placeholder="Dự kiến công việc tiếp theo..."
                          />
                          <FormFieldWithTooltip
                            form={form}
                            field="issues"
                            label="Vấn đề/Khó khăn"
                            tooltip="Các vấn đề gặp phải cần được hỗ trợ"
                            type="textarea"
                            placeholder="Mô tả vấn đề nếu có"
                            optional
                          />
                        </>
                      )}

                      {selectedTemplate === "meeting" && (
                        <>
                          <FormFieldWithTooltip
                            form={form}
                            field="topic"
                            label="Chủ đề cuộc họp"
                            tooltip="Tiêu đề chính của cuộc họp"
                            placeholder="Nhập chủ đề cuộc họp"
                          />
                          <FormFieldWithTooltip
                            form={form}
                            field="agenda"
                            label="Nội dung cuộc họp"
                            tooltip="Các vấn đề sẽ thảo luận trong cuộc họp"
                            type="textarea"
                            placeholder="Mô tả nội dung cuộc họp..."
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <FormFieldWithTooltip
                              form={form}
                              field="meetingDate"
                              label="Ngày họp"
                              tooltip="Ngày diễn ra cuộc họp"
                              type="date"
                              placeholder="Chọn ngày"
                            />
                            <FormFieldWithTooltip
                              form={form}
                              field="meetingTime"
                              label="Thời gian họp"
                              tooltip="Thời gian bắt đầu cuộc họp"
                              type="time"
                              placeholder="Chọn thời gian"
                            />
                          </div>
                          <FormFieldWithTooltip
                            form={form}
                            field="locationOrPlatform"
                            label="Địa điểm/Nền tảng họp"
                            tooltip="Địa điểm hoặc link meeting online"
                            placeholder="Ví dụ: Phòng họp A, Google Meet"
                          />
                          <FormFieldWithTooltip
                            form={form}
                            field="attendees"
                            label="Thành phần tham dự"
                            tooltip="Danh sách người tham dự cuộc họp"
                            type="textarea"
                            placeholder="Liệt kê người tham dự..."
                          />
                          <FormFieldWithTooltip
                            form={form}
                            field="meetingHost"
                            label="Người chủ trì"
                            tooltip="Người điều phối cuộc họp"
                            placeholder="Tên người chủ trì"
                            optional
                          />
                          <FormFieldWithTooltip
                            form={form}
                            field="preparationMaterials"
                            label="Tài liệu chuẩn bị"
                            tooltip="Tài liệu cần xem trước cuộc họp"
                            type="textarea"
                            placeholder="Link hoặc tên tài liệu"
                            optional
                          />
                        </>
                      )}

                      {selectedTemplate === "custom" && (
                        <FormFieldWithTooltip
                          form={form}
                          field="customPrompt"
                          label="Mô tả chi tiết email"
                          tooltip="Mô tả càng chi tiết càng tốt để AI hiểu đúng yêu cầu của bạn"
                          type="textarea"
                          placeholder="Nhập mô tả yêu cầu của bạn tại đây. Ví dụ: Viết email cảm ơn đối tác X đã tham gia sự kiện Y..."
                        />
                      )}
                    </form>
                  </Form>
                </div>
              ) : (
                // Step 3: Preview
                <div className="space-y-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setViewMode(
                          viewMode === "preview" ? "markdown" : "preview",
                        )
                      }
                    >
                      {viewMode === "preview" ? (
                        <>
                          <Code className="h-4 w-4 mr-2" />
                          Markdown
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Xem trước
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      <Copy className="h-4 w-4 mr-2" />
                      Sao chép
                    </Button>
                  </div>
                  <div className="border rounded-md">
                    <ScrollArea className="h-[400px] p-4">
                      {viewMode === "preview" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown>{generatedEmail}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap font-mono text-sm">
                          {generatedEmail}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          {!selectedTemplate ? (
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Đóng
              </Button>
            </div>
          ) : !generatedEmail ? (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button
                type="submit"
                form="email-form"
                disabled={isGenerating}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Tạo Email
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setGeneratedEmail("");
                  form.reset();
                }}
              >
                Quay lại
              </Button>
              <Button onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Sao chép
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
