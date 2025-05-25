import * as z from "zod";

export const leaveFormSchema = z.object({
  recipientName: z.string().min(1, "Vui lòng nhập người nhận"),
  reason: z.string().min(1, "Vui lòng nhập lý do nghỉ phép"),
  dateRange: z.object({
    from: z.date({
      required_error: "Vui lòng chọn ngày bắt đầu",
    }),
    to: z.date({
      required_error: "Vui lòng chọn ngày kết thúc",
    }),
  }),
  handoverTo: z.string().optional(),
});

export const reportFormSchema = z.object({
  recipientName: z.string().min(1, "Vui lòng nhập người nhận"),
  reportingPeriod: z.string().min(1, "Vui lòng nhập kỳ báo cáo"),
  completedTasks: z.string().min(1, "Vui lòng nhập công việc đã hoàn thành"),
  ongoingTasks: z.string().min(1, "Vui lòng nhập công việc đang thực hiện"),
  nextPeriodPlans: z.string().min(1, "Vui lòng nhập kế hoạch cho kỳ tới"),
  issues: z.string().optional(),
});

export const meetingFormSchema = z.object({
  topic: z.string().min(1, "Vui lòng nhập chủ đề cuộc họp"),
  agenda: z.string().min(1, "Vui lòng nhập nội dung cuộc họp"),
  meetingTime: z.string().min(1, "Vui lòng chọn thời gian"),
  meetingDate: z.date({
    required_error: "Vui lòng chọn ngày",
  }),
  locationOrPlatform: z.string().min(1, "Vui lòng nhập địa điểm/nền tảng"),
  attendees: z.string().min(1, "Vui lòng nhập thành phần tham dự"),
  meetingHost: z.string().optional(),
  preparationMaterials: z.string().optional(),
});

export const customFormSchema = z.object({
  recipientName: z.string().min(1, "Vui lòng nhập người nhận"),
  customPrompt: z.string().min(1, "Vui lòng nhập yêu cầu của bạn"),
});
