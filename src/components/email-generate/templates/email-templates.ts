import { Calendar, FileText, Users, Sparkles } from "lucide-react";

export const EMAIL_TEMPLATES = [
  {
    id: "leave",
    name: "Xin nghỉ phép",
    icon: Calendar,
    description: "Tạo email xin nghỉ phép chuyên nghiệp và đúng chuẩn",
    prompt: `Viết một email xin nghỉ phép với thông tin sau:

- Người nhận: {recipientName}
- Lý do nghỉ: {reason}
- Thời gian: từ {startDate} đến {endDate} ({days} ngày)
- Người bàn giao công việc (nếu có): [handoverTo]

Hãy viết email một cách tự nhiên, chuyên nghiệp và phù hợp với môi trường công sở. Email cần có đầy đủ tiêu đề, lời chào, nội dung và lời kết. Đặc biệt chú ý:
- Thể hiện sự tôn trọng với người nhận
- Trình bày lý do nghỉ phép một cách hợp lý và thuyết phục
- Thể hiện trách nhiệm với công việc được giao
- Sử dụng markdown để định dạng
- KHÔNG thêm bất kỳ lời giới thiệu hay kết luận nào trước hoặc sau nội dung email
- Chỉ trả về nội dung email, không có phần "Chắc chắn rồi" hay "Đây là email..."`,
    fields: [
      {
        id: "recipientName",
        label: "Người nhận",
        type: "text",
        placeholder: "Ví dụ: Trưởng phòng A, Anh B",
      },
      {
        id: "reason",
        label: "Lý do nghỉ phép",
        type: "textarea",
        placeholder: "Nhập lý do chi tiết...",
      },
      {
        id: "dateRange",
        label: "Thời gian nghỉ",
        type: "dateRange",
        placeholder: "Chọn ngày",
      },
      {
        id: "handoverTo",
        label: "Người bàn giao công việc (tùy chọn)",
        type: "text",
        placeholder: "Tên đồng nghiệp hoặc để trống",
      },
    ],
  },
  {
    id: "report",
    name: "Báo cáo công việc",
    icon: FileText,
    description: "Tạo email báo cáo tiến độ công việc rõ ràng, đầy đủ",
    prompt: `Viết một email báo cáo công việc với thông tin sau:

- Người nhận: {recipientName}
- Kỳ báo cáo: {reportingPeriod}
- Công việc đã hoàn thành: {completedTasks}
- Công việc đang thực hiện: {ongoingTasks}
- Kế hoạch sắp tới: {nextPeriodPlans}
- Khó khăn/vướng mắc (nếu có): [issues]

Hãy viết email một cách chuyên nghiệp, súc tích và dễ theo dõi. Email cần có đầy đủ tiêu đề, lời chào, nội dung và lời kết. Đặc biệt chú ý:
- Trình bày thông tin rõ ràng, có trọng tâm
- Nhấn mạnh các thành tựu đạt được
- Thể hiện tinh thần trách nhiệm và chủ động
- Sử dụng markdown để định dạng
- KHÔNG thêm bất kỳ lời giới thiệu hay kết luận nào trước hoặc sau nội dung email
- Chỉ trả về nội dung email, không có phần "Chắc chắn rồi" hay "Đây là email..."`,
    fields: [
      {
        id: "recipientName",
        label: "Người nhận báo cáo",
        type: "text",
        placeholder: "Tên người quản lý, phòng ban...",
      },
      {
        id: "reportingPeriod",
        label: "Kỳ báo cáo",
        type: "text",
        placeholder: "Ví dụ: Tuần 25, Tháng 7/2024",
      },
      {
        id: "completedTasks",
        label: "Công việc đã hoàn thành",
        type: "textarea",
        placeholder: "Liệt kê các công việc đã hoàn thành...",
      },
      {
        id: "ongoingTasks",
        label: "Công việc đang thực hiện",
        type: "textarea",
        placeholder: "Liệt kê các công việc đang thực hiện...",
      },
      {
        id: "nextPeriodPlans",
        label: "Kế hoạch cho kỳ tới",
        type: "textarea",
        placeholder: "Dự kiến công việc tiếp theo...",
      },
      {
        id: "issues",
        label: "Vấn đề/Khó khăn",
        type: "textarea",
        placeholder: "Mô tả vấn đề nếu có",
      },
    ],
  },
  {
    id: "meeting",
    name: "Mời họp",
    icon: Users,
    description: "Tạo email mời họp lịch sự và đầy đủ thông tin",
    prompt: `Viết một email mời họp với thông tin sau:

- Chủ đề: {topic}
- Thời gian: {meetingTime} ngày {meetingDate}
- Địa điểm/nền tảng: {locationOrPlatform}
- Thành phần tham dự: {attendees}
- Nội dung chính: {agenda}
- Người chủ trì (nếu có): [meetingHost]
- Tài liệu chuẩn bị (nếu có): [preparationMaterials]

Hãy viết email một cách chuyên nghiệp và thu hút. Email cần có đầy đủ tiêu đề, lời chào, nội dung và lời kết. Đặc biệt chú ý:
- Tạo động lực tham dự cho người nhận
- Trình bày thông tin rõ ràng, dễ nắm bắt
- Nhấn mạnh tầm quan trọng của cuộc họp
- Sử dụng markdown để định dạng
- KHÔNG thêm bất kỳ lời giới thiệu hay kết luận nào trước hoặc sau nội dung email
- Chỉ trả về nội dung email, không có phần "Chắc chắn rồi" hay "Đây là email..."`,
    fields: [
      {
        id: "topic",
        label: "Chủ đề cuộc họp",
        type: "text",
        placeholder: "Nhập chủ đề cuộc họp",
      },
      {
        id: "agenda",
        label: "Nội dung cuộc họp",
        type: "textarea",
        placeholder: "Mô tả nội dung cuộc họp...",
      },
      {
        id: "meetingTime",
        label: "Thời gian họp",
        type: "time",
        placeholder: "Chọn thời gian",
      },
      {
        id: "meetingDate",
        label: "Ngày họp",
        type: "date",
        placeholder: "Chọn ngày",
      },
      {
        id: "locationOrPlatform",
        label: "Địa điểm/Nền tảng họp",
        type: "text",
        placeholder: "Ví dụ: Phòng họp A, Google Meet",
      },
      {
        id: "attendees",
        label: "Thành phần tham dự",
        type: "textarea",
        placeholder: "Liệt kê người tham dự...",
      },
      {
        id: "meetingHost",
        label: "Người chủ trì",
        type: "text",
        placeholder: "Tên người chủ trì",
      },
      {
        id: "preparationMaterials",
        label: "Tài liệu chuẩn bị",
        type: "textarea",
        placeholder: "Link hoặc tên tài liệu",
      },
    ],
  },
  {
    id: "custom",
    name: "Tùy chỉnh",
    icon: Sparkles,
    description: "Tạo email theo yêu cầu riêng của bạn",
    prompt: `Viết một email dựa trên yêu cầu sau:

{customPrompt}

Hãy viết email một cách chuyên nghiệp và phù hợp với yêu cầu. Email cần có đầy đủ tiêu đề, lời chào, nội dung và lời kết. Đặc biệt chú ý:
- Sử dụng ngôn ngữ phù hợp với đối tượng và mục đích
- Trình bày nội dung rõ ràng, logic
- Tạo ấn tượng tốt với người đọc
- Sử dụng markdown để định dạng
- KHÔNG thêm bất kỳ lời giới thiệu hay kết luận nào trước hoặc sau nội dung email
- Chỉ trả về nội dung email, không có phần "Chắc chắn rồi" hay "Đây là email..."`,
    fields: [
      {
        id: "customPrompt",
        label: "Mô tả chi tiết email bạn muốn tạo",
        type: "textarea",
        placeholder:
          "Nhập mô tả yêu cầu của bạn tại đây. Ví dụ: Viết email cảm ơn đối tác X đã tham gia sự kiện Y...",
      },
    ],
  },
];
