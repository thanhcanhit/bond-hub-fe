import { User } from "@/types/base";

/**
 * Get user initials for avatar display
 * @param user User object
 * @returns String with user initials or fallback
 */
export const getUserInitials = (user?: User | null): string => {
  if (!user) return "??";

  // Try to get initials from fullName
  if (user.userInfo?.fullName) {
    const nameParts = user.userInfo.fullName.split(" ");
    if (nameParts.length > 0 && nameParts[0]) {
      if (nameParts.length > 1 && nameParts[1]) {
        // If we have at least two parts, use first letter of each
        return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
      }
      // Otherwise use first two letters of first part
      return nameParts[0].slice(0, 2).toUpperCase();
    }
  }

  // Try to get initials from email
  if (user.email) {
    // If email has a name part (before @), use first two characters
    const emailParts = user.email.split("@");
    if (emailParts[0]) {
      // If email name part contains a dot or underscore, treat as separate words
      if (emailParts[0].includes(".") || emailParts[0].includes("_")) {
        const nameParts = emailParts[0].split(/[._]/);
        if (nameParts.length > 1 && nameParts[0] && nameParts[1]) {
          return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
        }
      }
      // Otherwise just use first two characters of email
      return emailParts[0].slice(0, 2).toUpperCase();
    }
  }

  // Try to use phone number
  if (user.phoneNumber) {
    return user.phoneNumber.slice(0, 2);
  }

  // Try to use id as last resort
  if (user.id) {
    return user.id.slice(0, 2).toUpperCase();
  }

  // Fallback
  return "US";
};

/**
 * Get display name for a user
 * @param user User object
 * @returns String with user's display name
 */
export const getUserDisplayName = (user?: User | null): string => {
  if (!user) return "Unknown";

  // Try to use fullName from userInfo
  if (user.userInfo?.fullName) {
    return user.userInfo.fullName;
  }

  // Try to extract name from email
  if (user.email) {
    const emailParts = user.email.split("@");
    if (emailParts[0]) {
      // If email contains dots or underscores, format as name
      if (emailParts[0].includes(".") || emailParts[0].includes("_")) {
        return emailParts[0]
          .split(/[._]/)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");
      }
      // Otherwise just capitalize the email username
      return emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1);
    }
  }

  // Use phone number if available
  if (user.phoneNumber) {
    return user.phoneNumber;
  }

  // Fallback
  return "Unknown";
};
