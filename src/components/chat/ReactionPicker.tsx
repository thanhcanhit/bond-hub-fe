"use client";

import { Button } from "@/components/ui/button";
import { ThumbsUp, X } from "lucide-react";
import { ReactionType } from "@/types/base";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ReactionPickerProps {
  isCurrentUser: boolean;
  userReaction?: {
    userId: string;
    reactionType?: ReactionType;
    reaction?: string;
    count?: number;
  } | null;
  onReaction: (reactionType: ReactionType) => Promise<void>;
  onRemoveReaction: () => Promise<void>;
}

// Helper function to get reaction emojis
const getReactionEmojis = () => ({
  [ReactionType.LIKE]: "👍",
  [ReactionType.LOVE]: "❤️",
  [ReactionType.HAHA]: "😂",
  [ReactionType.WOW]: "😮",
  [ReactionType.SAD]: "😢",
  [ReactionType.ANGRY]: "😡",
});

// Helper function to get reaction type from object
const getReactionTypeFromObject = (reaction: {
  reactionType?: ReactionType;
  reaction?: string;
}): ReactionType => {
  // Check if the reaction object has a reactionType property
  if ("reactionType" in reaction && reaction.reactionType) {
    return reaction.reactionType;
  }
  // Check if the reaction object has a reaction property
  else if ("reaction" in reaction && typeof reaction.reaction === "string") {
    return reaction.reaction as ReactionType;
  }
  // Default to LIKE if neither property is found
  return ReactionType.LIKE;
};

export default function ReactionPicker({
  isCurrentUser,
  userReaction,
  onReaction,
  onRemoveReaction,
}: ReactionPickerProps) {
  // State to control popover open state
  const [open, setOpen] = useState(false);

  // Get emoji mapping
  const reactionEmojis = getReactionEmojis();

  // If user has already reacted, show buttons to add more or remove reaction
  if (userReaction) {
    // Get the emoji for the current reaction
    const reactionType = getReactionTypeFromObject(userReaction);
    const emoji = reactionEmojis[reactionType];

    // When user has already reacted, show two buttons: add more and remove
    return (
      <div className="flex gap-1 ml-1">
        {/* Button to add more of the same reaction */}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 rounded-full bg-blue-50 shadow-sm hover:bg-blue-100 p-0"
          onClick={() => onReaction(reactionType)}
          title={`Thêm biểu cảm ${reactionType.toLowerCase()}`}
        >
          <span className="text-xs">{emoji || "👍"}</span>
        </Button>

        {/* Button to remove reaction */}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 rounded-full bg-white shadow-sm hover:bg-gray-100 p-0"
          onClick={onRemoveReaction}
          title="Xóa biểu cảm"
        >
          <X className="h-3 w-3 text-gray-500" />
        </Button>
      </div>
    );
  }

  // When user hasn't reacted yet, show reaction button with picker
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 rounded-full shadow-sm hover:bg-gray-100 bg-white p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-1"
          title="Thêm biểu cảm"
        >
          <ThumbsUp className="h-3 w-3 text-gray-600" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto p-1 rounded-full shadow-lg flex items-center gap-1 z-[999999]"
        align={isCurrentUser ? "end" : "center"}
        side={isCurrentUser ? "top" : "bottom"}
        sideOffset={8}
      >
        <button
          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all duration-150 hover:scale-125 hover:shadow-md group/reaction"
          onClick={() => onReaction(ReactionType.LIKE)}
        >
          <span className="text-xl">👍</span>
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover/reaction:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Thích
          </span>
        </button>
        <button
          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all duration-150 hover:scale-125 hover:shadow-md group/reaction"
          onClick={() => onReaction(ReactionType.LOVE)}
        >
          <span className="text-xl">❤️</span>
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover/reaction:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Yêu thích
          </span>
        </button>
        <button
          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all duration-150 hover:scale-125 hover:shadow-md group/reaction"
          onClick={() => onReaction(ReactionType.HAHA)}
        >
          <span className="text-xl">😂</span>
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover/reaction:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Haha
          </span>
        </button>
        <button
          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all duration-150 hover:scale-125 hover:shadow-md group/reaction"
          onClick={() => onReaction(ReactionType.WOW)}
        >
          <span className="text-xl">😮</span>
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover/reaction:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Wow
          </span>
        </button>
        <button
          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all duration-150 hover:scale-125 hover:shadow-md group/reaction"
          onClick={() => onReaction(ReactionType.SAD)}
        >
          <span className="text-xl">😢</span>
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover/reaction:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Buồn
          </span>
        </button>
        <button
          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all duration-150 hover:scale-125 hover:shadow-md group/reaction"
          onClick={() => onReaction(ReactionType.ANGRY)}
        >
          <span className="text-xl">😡</span>
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover/reaction:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Phẫn nộ
          </span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
