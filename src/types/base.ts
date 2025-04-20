// Interfaces for specific Json fields
export interface MediaMetadata {
  path: string;
  size: number;
  mimeType: string;
  extension: string;
  bucketName: string;
  uploadedAt: string;
  sizeFormatted: string;
}

export interface Media {
  url: string;
  type: string; // e.g., "IMAGE", "VIDEO", "DOCUMENT"
  fileId: string;
  fileName: string;
  metadata: MediaMetadata;
  thumbnailUrl?: string;
}

export interface MessageContent {
  text?: string;
  image?: string;
  video?: string;
  media?: Media[];
}

export interface Reaction {
  userId: string;
  reactionType: ReactionType;
}

export interface NotificationReference {
  postId?: string;
  commentId?: string;
  messageId?: string;
}

// Model interfaces
export interface User {
  id: string;
  email?: string | null;
  phoneNumber?: string | null;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  userInfo?: UserInfo | null;
  infoId?: string | null;
  refreshTokens: RefreshToken[];
  qrCodes: QrCode[];
  posts: Post[];
  stories: Story[];
  groupMembers: GroupMember[];
  cloudFiles: CloudStorage[];
  pinnedItems: PinnedItem[];
  sentFriends: Friend[];
  receivedFriends: Friend[];
  contacts: Contact[];
  contactOf: Contact[];
  settings: UserSetting[];
  postReactions: PostReaction[];
  hiddenPosts: HiddenPost[];
  addedBy: GroupMember[];
  notifications: Notification[];
  sentMessages: Message[];
  receivedMessages: Message[];
  comments: Comment[];
}

export interface UserInfo {
  id: string;
  fullName?: string | null;
  dateOfBirth?: Date | null;
  gender?: Gender | null;
  bio?: string | null;
  blockStrangers: boolean;
  profilePictureUrl?: string | null;
  statusMessage?: string | null;
  lastSeen?: Date | null;
  coverImgUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  userAuth: User;
}

export interface Friend {
  id: string;
  userOne: User;
  userOneId: string;
  userTwo: User;
  userTwoId: string;
  status: FriendStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSetting {
  id: string;
  userId: string;
  user: User;
  notificationEnabled: boolean;
  darkMode: boolean;
  lastUpdated: Date;
}

export interface Post {
  id: string;
  userId: string;
  user: User;
  content?: string | null;
  media?: Media[] | null; // Specific Media interface
  privacyLevel: string;
  createdAt: Date;
  updatedAt: Date;
  reactions: PostReaction[];
  hiddenBy: HiddenPost[];
  comments: Comment[];
}

export interface Story {
  id: string;
  userId: string;
  user: User;
  mediaUrl: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface Group {
  id: string;
  name: string;
  creatorId: string;
  avatarUrl?: string | null;
  createdAt: Date;
  members: GroupMember[];
  messages: Message[];
  // Add memberUsers for simplified UI display
  memberUsers?: Array<{
    id: string;
    fullName: string;
    profilePictureUrl?: string | null;
    role: GroupRole;
  }>;
}

export interface GroupMember {
  id: string;
  groupId: string;
  group: Group;
  userId: string;
  user: User;
  role: GroupRole;
  joinedAt: Date;
  addedBy: User;
  addedById: string;
}

export interface CloudStorage {
  id: string;
  userId: string;
  user: User;
  fileName: string;
  fileUrl: string;
  fileType?: string | null;
  fileSize?: number | null;
  uploadedAt: Date;
}

export interface PinnedItem {
  id: string;
  userId: string;
  user: User;
  itemType: MessageType;
  itemId: string;
  pinnedAt: Date;
}

export interface Contact {
  id: string;
  userId: string;
  user: User;
  contactUserId: string;
  contactUser: User;
  nickname?: string | null;
  addedAt: Date;
}

export interface PostReaction {
  id: string;
  postId: string;
  post: Post;
  userId: string;
  user: User;
  reactionType: ReactionType;
  reactedAt: Date;
}

export interface HiddenPost {
  id: string;
  userId: string;
  user: User;
  postId: string;
  post: Post;
  hiddenAt: Date;
}

export interface RefreshToken {
  id: string;
  token: string;
  userId: string;
  user: User;
  deviceName?: string | null;
  deviceType?: DeviceType | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface QrCode {
  id: string;
  qrToken: string;
  userId?: string | null;
  user?: User | null;
  status: QrCodeStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  user: User;
  type: string;
  content: Record<string, string | number | boolean | null>; // Simple key-value object
  read: boolean;
  reference?: NotificationReference | null; // Specific NotificationReference interface
  createdAt: Date;
}

export interface Message {
  id: string;
  content: MessageContent; // Specific MessageContent interface
  senderId: string;
  sender: User;
  receiverId?: string | null;
  receiver?: User | null;
  groupId?: string | null;
  group?: Group | null;
  recalled: boolean;
  deletedBy: string[];
  repliedTo?: string | null;
  reactions: Reaction[]; // Specific Reaction interface
  readBy: string[];
  createdAt: Date;
  updatedAt: Date;
  messageType?: MessageType | null;
  forwardedFrom?: string | null; // ID of the original message if this is a forwarded message
}

export interface Comment {
  id: string;
  postId: string;
  post: Post;
  userId: string;
  user: User;
  content: string;
  repliedTo?: string | null;
  reactions: Reaction[]; // Specific Reaction interface
}

// Enums
enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

enum GroupRole {
  LEADER = "LEADER",
  CO_LEADER = "CO_LEADER",
  MEMBER = "MEMBER",
}

enum MessageType {
  GROUP = "GROUP",
  USER = "USER",
}

enum DeviceType {
  MOBILE = "MOBILE",
  TABLET = "TABLET",
  DESKTOP = "DESKTOP",
  OTHER = "OTHER",
}

enum FriendStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  BLOCKED = "BLOCKED",
}

enum QrCodeStatus {
  PENDING = "PENDING",
  SCANNED = "SCANNED",
  CONFIRMED = "CONFIRMED",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
}

enum ReactionType {
  LIKE = "LIKE",
  LOVE = "LOVE",
  HAHA = "HAHA",
  WOW = "WOW",
  SAD = "SAD",
  ANGRY = "ANGRY",
}

export {
  // Enums
  Gender,
  GroupRole,
  MessageType,
  DeviceType,
  FriendStatus,
  QrCodeStatus,
  ReactionType,
};
