"use client";
import SearchHeader from "@/components/SearchHeader";

export default function TestSearchPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex border-b">
        <SearchHeader />
        <div className="flex-1 p-4">
          <h1 className="text-lg font-semibold">Test Search Component</h1>
        </div>
      </div>
      <div className="flex-1 p-4">
        <p>This page is for testing the SearchHeader component.</p>
        <p>Try searching for contacts, messages, or files.</p>
      </div>
    </div>
  );
}
