// Helper function to format time
export const formatMessageTime = (dateInput: Date | string): string => {
  // Ensure we have a proper Date object
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.error("Invalid date:", dateInput);
    return "Invalid date";
  }

  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than a day
  if (diff < 86400000) {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Less than a week
  if (diff < 604800000) {
    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return days[date.getDay()];
  }

  // More than a week
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
};

// Format date for message groups
export const formatMessageDate = (dateInput: Date | string): string => {
  // Ensure we have a proper Date object
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.error("Invalid date:", dateInput);
    return "Invalid date";
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const messageDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  if (messageDate.getTime() === today.getTime()) {
    return "Hôm nay";
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return "Hôm qua";
  } else {
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
};
