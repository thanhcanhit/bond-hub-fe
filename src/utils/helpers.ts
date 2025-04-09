import { DeviceType } from "@/types/base";
import * as UAParser from "ua-parser-js";

/**
 * Xác định thông tin thiết bị dựa trên userAgent
 * @returns Thông tin về loại thiết bị và tên thiết bị
 */
export const getDeviceInfo = () => {
  if (typeof window === "undefined") {
    return { deviceType: DeviceType.OTHER, deviceName: "Dell Latitude 5290" };
  }

  const parser = new UAParser.UAParser();
  const result = parser.getResult();

  // Xác định deviceType
  let deviceType: DeviceType;
  const device = result.device.type?.toLowerCase();
  const os = result.os.name?.toLowerCase();

  if (device === "mobile" || /iphone|android/.test(result.ua.toLowerCase())) {
    deviceType = DeviceType.MOBILE;
  } else if (device === "tablet" || /ipad/.test(result.ua.toLowerCase())) {
    deviceType = DeviceType.TABLET;
  } else if (os && /mac|win|linux/.test(os)) {
    deviceType = DeviceType.DESKTOP;
  } else {
    deviceType = DeviceType.OTHER;
  }

  // Lấy deviceName
  const deviceName =
    result.device.model || result.os.name || "Dell Latitude 5290";

  return { deviceType, deviceName };
};

/**
 * Kiểm tra xem một chuỗi có phải là email hợp lệ hay không
 * @param input Chuỗi cần kiểm tra
 * @returns true nếu là email hợp lệ, false nếu không phải
 */
export const isEmail = (input: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input);
};

/**
 * Kiểm tra xem một chuỗi có phải là số điện thoại hợp lệ hay không
 * @param input Chuỗi cần kiểm tra
 * @returns true nếu là số điện thoại hợp lệ, false nếu không phải
 */
export const isPhoneNumber = (input: string): boolean => {
  const phoneRegex = /^\d{10,11}$/; // Giả sử số điện thoại Việt Nam có 10-11 chữ số
  return phoneRegex.test(input);
};

/**
 * Định dạng số điện thoại theo định dạng Việt Nam
 * @param phone Số điện thoại cần định dạng
 * @returns Số điện thoại đã được định dạng
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return "";

  // Loại bỏ tất cả các ký tự không phải số
  const cleaned = phone.replace(/\D/g, "");

  // Kiểm tra độ dài và định dạng theo quy tắc Việt Nam
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  } else if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }

  return cleaned;
};

/**
 * Định dạng ngày tháng theo định dạng dd/mm/yyyy
 * @param date Đối tượng Date cần định dạng
 * @returns Chuỗi ngày tháng đã được định dạng
 */
export const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Chuyển đổi giới tính từ tiếng Anh sang tiếng Việt
 * @param gender Giới tính bằng tiếng Anh ("male" hoặc "female")
 * @returns Giới tính bằng tiếng Việt
 */
export const translateGender = (gender: string): string => {
  if (gender.toLowerCase() === "male") return "Nam";
  if (gender.toLowerCase() === "female") return "Nữ";
  return gender;
};

/**
 * Kiểm tra xem một chuỗi có phải là họ tên tiếng Việt hợp lệ hay không
 * @param input Chuỗi cần kiểm tra
 * @returns true nếu là họ tên tiếng Việt hợp lệ, false nếu không phải
 */
export const isVietnameseName = (input: string): boolean => {
  // Regex cho tên tiếng Việt có dấu hoặc không dấu
  // Cho phép chữ cái, dấu cách và dấu tiếng Việt
  // Yêu cầu ít nhất 2 từ (họ và tên)
  const vietnameseNameRegex =
    /^[A-Za-zÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ]+(\s[A-Za-zÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ]+)+$/;
  return vietnameseNameRegex.test(input);
};
