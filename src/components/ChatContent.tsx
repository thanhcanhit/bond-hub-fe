import { Button } from "./ui/button";

function ChatContent({
  chat,
}: {
  chat: {
    id: number;
    name: string;
    message?: string;
    time?: string;
    avatar: string;
    phone?: string;
    content?: string;
  };
}) {
  return (
    <div className="flex flex-col h-full justify-end overflow-y-auto gap-4">
      <div className="flex flex-col h-full justify-end overflow-y-scroll scroll-container custom-scrollbar gap-4 p-4">
        <div className="bg-blue-100 p-2 rounded-lg max-w-xs self-end">
          <p>{chat.message}</p>
        </div>
        <div className="bg-gray-200 p-2 rounded-lg max-w-xs">
          <p>{chat.name}: Tin nhắn trả lời...</p>
        </div>
      </div>

      <div className="border p-4 bg-white flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <img src="/attachment-icon.png" alt="Attach" className="h-5 w-5" />
        </Button>
        <input
          type="text"
          placeholder="Nhập tin nhắn..."
          className="flex-1 p-2 border rounded-lg focus:outline-none"
        />
        <Button variant="ghost" size="icon">
          <img src="/emoji-icon.png" alt="Emoji" className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <img src="/send-icon.png" alt="Send" className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
export default ChatContent;
