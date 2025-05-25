# Test Plan: Group Member Updates

## Mục tiêu

Đảm bảo rằng khi thành viên được thêm hoặc bị xóa khỏi nhóm, cả GroupInfo và GroupChatHeader đều nhận được sự kiện và cập nhật đúng cách.

## Các thay đổi đã thực hiện

### 1. Cải thiện GroupSocketHandler.tsx

- **handleMemberAdded**: Luôn cập nhật conversationsStore cho cả nhóm được chọn và không được chọn
- **handleMemberRemoved**: Cập nhật cả selectedGroup và conversationsStore khi thành viên khác bị xóa
- **updateConversationWithLatestGroupData**: Thêm forceUpdate để đảm bảo UI được cập nhật ngay lập tức

### 2. Tạo GroupChatHeaderSocketHandler.tsx

- Component mới để xử lý socket events riêng cho GroupChatHeader
- Lắng nghe các sự kiện: memberAdded, memberRemoved, memberRoleUpdated, groupUpdated
- Tự động force update conversationsStore để đảm bảo header được cập nhật

### 3. Cập nhật GroupChatHeader.tsx

- Thêm GroupChatHeaderSocketHandler component
- Thêm callback handleGroupUpdated để force re-render khi có thay đổi
- Cải thiện memberCount calculation để phản ứng với forceUpdateCounter

### 4. Cải thiện GroupInfoSocketHandler.tsx

- Thêm forceUpdate cho conversationsStore trong tất cả event handlers
- Đảm bảo GroupInfo luôn được cập nhật khi có thay đổi thành viên

## Luồng hoạt động

### Khi thành viên được thêm:

1. Backend gửi sự kiện `memberAdded`
2. **GroupSocketHandler** nhận sự kiện:
   - Nếu là nhóm đang được chọn: gọi `refreshSelectedGroup()`
   - Luôn gọi `updateConversationWithLatestGroupData()` để cập nhật conversationsStore
   - Force update conversationsStore sau 100ms
3. **GroupInfoSocketHandler** nhận sự kiện:
   - Gọi `onGroupUpdated()` callback (nếu có)
   - Force update conversationsStore sau 100ms
4. **GroupChatHeaderSocketHandler** nhận sự kiện:
   - Nếu là nhóm đang được chọn: gọi `refreshSelectedGroup()`
   - Gọi `onGroupUpdated()` callback để force re-render
   - Force update conversationsStore sau 100ms

### Khi thành viên bị xóa:

1. Backend gửi sự kiện `memberRemoved`
2. **GroupSocketHandler** nhận sự kiện:
   - Nếu là user hiện tại bị xóa: xóa nhóm khỏi UI
   - Nếu là thành viên khác: cập nhật selectedGroup và conversationsStore
   - Force update conversationsStore sau 100ms
3. **GroupInfoSocketHandler** và **GroupChatHeaderSocketHandler** xử lý tương tự như memberAdded

## Các cải thiện chính

### 1. Đồng bộ hóa dữ liệu

- Cả selectedGroup (chatStore) và conversations (conversationsStore) đều được cập nhật
- Force update đảm bảo UI phản ứng ngay lập tức

### 2. Tránh duplicate API calls

- Sử dụng throttling để tránh gọi API quá thường xuyên
- Cache system để tránh redundant calls

### 3. Real-time updates

- Multiple socket handlers đảm bảo tất cả components đều nhận được updates
- Callback system cho phép components tự force re-render khi cần

### 4. Error handling

- Graceful fallback khi không thể cập nhật qua socket
- Logging chi tiết để debug

## Test Cases

### Test 1: Thêm thành viên vào nhóm đang được chọn

- **Expected**: GroupInfo và GroupChatHeader đều hiển thị số thành viên mới
- **Verify**: Kiểm tra console logs và UI updates

### Test 2: Thêm thành viên vào nhóm không được chọn

- **Expected**: Conversations list được cập nhật, khi chọn nhóm sẽ thấy thành viên mới
- **Verify**: Chuyển đến nhóm và kiểm tra danh sách thành viên

### Test 3: Xóa thành viên khỏi nhóm đang được chọn

- **Expected**: GroupInfo và GroupChatHeader đều hiển thị số thành viên giảm
- **Verify**: Kiểm tra console logs và UI updates

### Test 4: Xóa thành viên khỏi nhóm không được chọn

- **Expected**: Conversations list được cập nhật
- **Verify**: Chuyển đến nhóm và kiểm tra danh sách thành viên

### Test 5: User hiện tại bị xóa khỏi nhóm

- **Expected**: Nhóm biến mất khỏi conversations list, nếu đang chọn thì clear selection
- **Verify**: Kiểm tra UI và navigation

## Monitoring

### Console Logs để theo dõi:

- `[GroupSocketHandler] Member added/removed event received`
- `[GroupInfoSocketHandler] Member added/removed to group`
- `[GroupChatHeaderSocketHandler] Member added/removed from group`
- `[conversationsStore] Forcing UI update`

### UI Elements để kiểm tra:

- Số thành viên trong GroupChatHeader
- Danh sách thành viên trong GroupInfo
- Conversations list updates
- Toast notifications

## Kết luận

Với các thay đổi này, hệ thống đã được cải thiện để đảm bảo:

1. **Real-time updates**: Tất cả components nhận được updates ngay lập tức
2. **Data consistency**: selectedGroup và conversations luôn đồng bộ
3. **Performance**: Throttling và caching để tránh lag
4. **Reliability**: Multiple handlers và fallback mechanisms
