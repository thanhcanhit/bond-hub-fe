# Tài liệu: Sự khác biệt giữa Chat thường và Chat nhóm

Tài liệu này mô tả chi tiết sự khác biệt giữa chat thường (direct chat) và chat nhóm (group chat) trong hệ thống, bao gồm các bước triển khai và cách thức hoạt động của mỗi loại.

## 1. Mô hình dữ liệu

### 1.1. Cấu trúc trong Database

**Bảng Message:**

```prisma
model Message {
  id          String       @id @default(uuid()) @map("message_id") @db.Uuid
  content     Json         @map("content")
  senderId    String       @map("sender_id") @db.Uuid
  sender      User         @relation(name: "SentMessage", fields: [senderId], references: [id])
  receiverId  String?      @map("receiver_id") @db.Uuid
  receiver    User?        @relation(name: "ReceivedMessage", fields: [receiverId], references: [id])
  groupId     String?      @map("group_id") @db.Uuid
  group       Group?       @relation(name: "GroupMessages", fields: [groupId], references: [id])
  messageType MessageType? @default(USER)
  // Các trường khác...
}

enum MessageType {
  GROUP
  USER
}
```

**Sự khác biệt:**

- **Chat thường**: Sử dụng `receiverId` để xác định người nhận tin nhắn
- **Chat nhóm**: Sử dụng `groupId` để xác định nhóm nhận tin nhắn
- Trường `messageType` xác định loại tin nhắn: `USER` (chat thường) hoặc `GROUP` (chat nhóm)

## 2. Data Transfer Objects (DTOs)

### 2.1. Base Message DTO

```typescript
export class BaseCreateMessageDto {
  content: MessageContentDto;
  repliedTo?: string;
  senderId?: string;
}

export class MessageContentDto {
  text?: string;
  media?: MediaItemDto[] = [];
}
```

### 2.2. User Message DTO (Chat thường)

```typescript
export class UserMessageDto extends BaseCreateMessageDto {
  receiverId: string;
}
```

### 2.3. Group Message DTO (Chat nhóm)

```typescript
export class GroupMessageDto extends BaseCreateMessageDto {
  groupId: string;
}
```

**Sự khác biệt:**

- **Chat thường**: Yêu cầu `receiverId` để xác định người nhận
- **Chat nhóm**: Yêu cầu `groupId` để xác định nhóm nhận tin nhắn

## 3. API Endpoints

### 3.1. Chat thường

```
POST /messages/user
GET /messages/user/:userIdB
GET /messages/user/:userIdB/search
```

### 3.2. Chat nhóm

```
POST /messages/group
GET /messages/group/:groupId
GET /messages/group/:groupId/search
```

**Sự khác biệt:**

- Các endpoint riêng biệt cho mỗi loại chat
- Tham số đường dẫn khác nhau: `userIdB` cho chat thường và `groupId` cho chat nhóm

## 4. Xử lý trong Service

### 4.1. Chat thường

```typescript
async createUserMessage(message: UserMessageDto, userId: string) {
  // Validation: ensure the sender is the authenticated user
  if (message.senderId && message.senderId !== userId) {
    throw new ForbiddenException('You can only send messages as yourself');
  }

  // Tạo tin nhắn
  const savedMessage = await this.prisma.message.create({
    data: {
      senderId: userId,
      receiverId: message.receiverId,
      repliedTo: message.repliedTo,
      content: toPrismaJson({
        text: message.content.text || '',
        media: mediaItems,
      }),
      messageType: 'USER',
    },
  });

  // Thông báo qua WebSocket
  if (this.messageGateway) {
    this.messageGateway.notifyNewUserMessage(savedMessage);
  }

  return savedMessage;
}
```

### 4.2. Chat nhóm

```typescript
async createGroupMessage(message: GroupMessageDto, userId: string) {
  // Validation: ensure the sender is the authenticated user
  if (message.senderId && message.senderId !== userId) {
    throw new ForbiddenException('You can only send messages as yourself');
  }

  // Check if user is a member of the group
  const isMember = await this.prisma.groupMember.findFirst({
    where: {
      groupId: message.groupId,
      userId,
    },
  });

  if (!isMember) {
    throw new ForbiddenException('You are not a member of this group');
  }

  // Tạo tin nhắn
  const savedMessage = await this.prisma.message.create({
    data: {
      senderId: userId,
      groupId: message.groupId,
      repliedTo: message.repliedTo,
      content: toPrismaJson({
        text: message.content.text || '',
        media: mediaItems,
      }),
      messageType: 'GROUP',
    },
  });

  // Thông báo qua WebSocket
  if (this.messageGateway) {
    this.messageGateway.notifyNewGroupMessage(savedMessage);
  }

  return savedMessage;
}
```

**Sự khác biệt:**

- **Chat thường**: Không cần kiểm tra quyền đặc biệt
- **Chat nhóm**: Cần kiểm tra người gửi có phải là thành viên của nhóm không
- Trường dữ liệu khác nhau: `receiverId` vs `groupId`
- Phương thức thông báo WebSocket khác nhau

## 5. WebSocket Gateway

### 5.1. Cấu trúc Gateway

```typescript
@WebSocketGateway({
  cors: {
    origin: "*",
  },
  namespace: "/message",
  pingInterval: 10000,
  pingTimeout: 15000,
})
export class MessageGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  // ...
}
```

### 5.2. Kết nối và Quản lý phòng

```typescript
async handleConnection(client: Socket) {
  const userId = await this.getUserFromSocket(client);

  // Join user's personal room
  client.join(`user:${userId}`);

  // Join all group rooms the user is a member of
  if (this.messageService) {
    const userGroups = await this.messageService.getUserGroups(userId);
    userGroups.forEach((groupId) => {
      client.join(`group:${groupId}`);
    });
  }
}
```

### 5.3. Thông báo tin nhắn mới

#### Chat thường

```typescript
notifyNewUserMessage(message: MessageData) {
  const eventData = {
    type: 'user',
    message,
    timestamp: new Date(),
  };

  // Phát sự kiện đến người gửi
  this.server.to(`user:${message.senderId}`).emit('newMessage', eventData);

  // Phát sự kiện đến người nhận
  if (message.receiverId) {
    this.server
      .to(`user:${message.receiverId}`)
      .emit('newMessage', eventData);
  }
}
```

#### Chat nhóm

```typescript
notifyNewGroupMessage(message: MessageData) {
  const eventData = {
    type: 'group',
    message,
    timestamp: new Date(),
  };

  // Phát sự kiện đến phòng nhóm
  if (message.groupId) {
    this.server.to(`group:${message.groupId}`).emit('newMessage', eventData);
  }
}
```

**Sự khác biệt:**

- **Chat thường**: Thông báo đến 2 phòng riêng biệt (người gửi và người nhận)
- **Chat nhóm**: Thông báo đến 1 phòng nhóm duy nhất (tất cả thành viên nhóm)

### 5.4. Xử lý sự kiện typing

```typescript
@SubscribeMessage('typing')
async handleTyping(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { receiverId?: string; groupId?: string },
) {
  const userId = await this.getUserFromSocket(client);
  const typingEvent = {
    userId,
    timestamp: new Date(),
  };

  if (data.receiverId) {
    // Chat thường
    this.server.to(`user:${data.receiverId}`).emit('userTyping', {
      ...typingEvent,
      receiverId: data.receiverId,
    });
  } else if (data.groupId) {
    // Chat nhóm
    this.server.to(`group:${data.groupId}`).emit('userTyping', {
      ...typingEvent,
      groupId: data.groupId,
    });
  }
}
```

## 6. Quản lý thành viên (Chỉ có trong Chat nhóm)

### 6.1. Cấu trúc dữ liệu

```prisma
model Group {
  id        String        @id @default(uuid()) @map("group_id") @db.Uuid
  name      String        @map("group_name")
  creatorId String        @map("creator_id") @db.Uuid
  avatarUrl String?       @map("avatar_url")
  createdAt DateTime      @default(now()) @map("created_at")
  members   GroupMember[] @relation(name: "GroupToGroupMember")
  messages  Message[]     @relation(name: "GroupMessages")
}

model GroupMember {
  id        String    @id @default(uuid()) @map("membership_id") @db.Uuid
  groupId   String    @map("group_id") @db.Uuid
  group     Group     @relation(name: "GroupToGroupMember", fields: [groupId], references: [id])
  userId    String    @map("user_id") @db.Uuid
  user      User      @relation(name: "GroupMemberToUser", fields: [userId], references: [id])
  role      GroupRole @default(MEMBER)
  joinedAt  DateTime  @default(now()) @map("joined_at")
  addedBy   User      @relation(name: "AddedBy", fields: [addedById], references: [id])
  addedById String    @map("added_by_id") @db.Uuid
}

enum GroupRole {
  LEADER
  CO_LEADER
  MEMBER
}
```

### 6.2. Group Gateway

```typescript
@WebSocketGateway({
  cors: {
    origin: "*",
  },
  namespace: "/groups",
})
export class GroupGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // ...

  // Xử lý sự kiện thêm thành viên
  private handleGroupMemberAdded(payload: {
    groupId: string;
    userId: string;
    addedById: string;
  }): void {
    const { groupId, userId, addedById } = payload;

    // Tự động thêm người dùng vào phòng nhóm
    this.joinGroupRoom(userId, groupId);

    // Thông báo cho các thành viên trong nhóm
    this.notifyMemberAdded(groupId, {
      groupId,
      userId,
      addedById,
      timestamp: new Date(),
    });
  }

  // Xử lý sự kiện xóa thành viên
  private handleGroupMemberRemoved(payload: {
    groupId: string;
    userId: string;
    removedById: string;
  }): void {
    const { groupId, userId, removedById } = payload;

    // Xóa người dùng khỏi phòng nhóm
    this.leaveGroupRoom(userId, groupId);

    // Thông báo cho các thành viên trong nhóm
    this.notifyMemberRemoved(groupId, {
      groupId,
      userId,
      removedById,
      timestamp: new Date(),
    });
  }

  // Các phương thức khác...
}
```

## 7. Các bước triển khai Chat nhóm

### 7.1. Tạo các DTO cần thiết

1. Tạo `GroupMessageDto` kế thừa từ `BaseCreateMessageDto`
2. Thêm trường `groupId` vào DTO

### 7.2. Cập nhật Controller

1. Thêm endpoint `POST /messages/group` để tạo tin nhắn nhóm
2. Thêm endpoint `GET /messages/group/:groupId` để lấy tin nhắn nhóm
3. Thêm endpoint `GET /messages/group/:groupId/search` để tìm kiếm tin nhắn trong nhóm

### 7.3. Cập nhật Service

1. Thêm phương thức `createGroupMessage` và `createGroupMessageWithMedia`
2. Thêm kiểm tra thành viên nhóm trước khi cho phép gửi tin nhắn
3. Thêm phương thức `getGroupMessages` để lấy tin nhắn nhóm
4. Cập nhật phương thức `getConversationList` để bao gồm cả nhóm

### 7.4. Cập nhật Gateway

1. Thêm phương thức `notifyNewGroupMessage` để thông báo tin nhắn nhóm mới
2. Cập nhật xử lý kết nối để tự động tham gia các phòng nhóm
3. Cập nhật xử lý sự kiện typing để hỗ trợ nhóm

### 7.5. Tích hợp với Group Module

1. Đảm bảo Group Module đã được triển khai với các chức năng:
   - Tạo nhóm
   - Thêm/xóa thành viên
   - Cập nhật thông tin nhóm
   - Quản lý vai trò thành viên
2. Tích hợp Group Gateway với Message Gateway để đồng bộ sự kiện

## 8. Tóm tắt sự khác biệt

| Khía cạnh               | Chat thường                     | Chat nhóm                                   |
| ----------------------- | ------------------------------- | ------------------------------------------- |
| **Đối tượng nhận**      | Một người dùng cụ thể           | Một nhóm người dùng                         |
| **Tham số định danh**   | `receiverId`                    | `groupId`                                   |
| **Kiểm tra quyền**      | Không cần kiểm tra đặc biệt     | Kiểm tra người gửi có phải thành viên nhóm  |
| **Thông báo WebSocket** | Gửi đến người gửi và người nhận | Gửi đến tất cả thành viên nhóm              |
| **Quản lý thành viên**  | Không cần                       | Cần quản lý thành viên và vai trò           |
| **Phòng WebSocket**     | 2 phòng cá nhân                 | 1 phòng nhóm                                |
| **Chức năng bổ sung**   | Không có                        | Quản lý thành viên, vai trò, thông tin nhóm |

## 9. Lưu ý khi triển khai

1. Đảm bảo kiểm tra quyền hạn khi gửi tin nhắn nhóm
2. Cập nhật danh sách cuộc trò chuyện để hiển thị cả nhóm và chat cá nhân
3. Xử lý đúng các sự kiện WebSocket cho cả hai loại chat
4. Đảm bảo người dùng tự động tham gia các phòng nhóm khi kết nối WebSocket
5. Cập nhật giao diện người dùng để hiển thị rõ sự khác biệt giữa chat cá nhân và chat nhóm
