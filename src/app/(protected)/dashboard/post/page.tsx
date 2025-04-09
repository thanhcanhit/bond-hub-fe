"use client";
import { memo } from "react";
import SimpleSearchHeader from "@/components/SimpleSearchHeader";

// Use memo to prevent unnecessary re-renders
const PostPage = memo(function PostPage() {
  return (
    <div className="flex flex-col flex-1 h-full w-full overflow-hidden">
      <div className="flex border-b bg-white">
        <SimpleSearchHeader />
        <div className="flex-1 p-4">
          <h1 className="text-lg font-semibold">Posts</h1>
        </div>
      </div>

      <div className="flex-1 p-4">
        <p>Đây là trang bài viết</p>
      </div>
    </div>
  );
});

export default PostPage;
