function PostContent({
  post,
}: {
  post: {
    id: number;
    user: string;
    content: string;
    time: string;
    avatar: string;
  };
}) {
  return (
    <div className="p-4">
      <h3 className="font-semibold">{post.user}</h3>
      <p>{post.content}</p>
      <span className="text-sm text-gray-500">{post.time}</span>
    </div>
  );
}
export default PostContent;
