"use client";

import { Button } from "@/components/ui/button";
import { Heart, X } from "lucide-react";
import { ReactionType } from "@/types/base";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EmojiStyle } from "emoji-picker-react";
import {
  getReactionUnifiedCodes,
  getReactionLabels,
  getReactionTypeFromObject,
  renderCenteredEmoji,
  ReactionObject,
} from "@/utils/reactionUtils";

interface ReactionPickerProps {
  isCurrentUser: boolean;
  userReaction?: ReactionObject | null;
  onReaction: (reactionType: ReactionType) => Promise<void>;
  onRemoveReaction: () => Promise<void>;
}

export default function ReactionPicker({
  isCurrentUser,
  userReaction,
  onReaction,
  onRemoveReaction,
}: ReactionPickerProps) {
  // State to control popover open state
  const [open, setOpen] = useState(false);

  // Get emoji unified codes and labels
  const reactionUnifiedCodes = getReactionUnifiedCodes();
  const reactionLabels = getReactionLabels();

  // If user has already reacted, show buttons to add more or remove reaction
  if (userReaction) {
    // Get the unified code for the current reaction
    const reactionType = getReactionTypeFromObject(userReaction);
    const unifiedCode = reactionUnifiedCodes[reactionType];

    // When user has already reacted, show two buttons: add more and remove
    return (
      <div className="flex gap-1 ml-1">
        {/* Button to add more of the same reaction */}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 rounded-full bg-blue-50 shadow-sm hover:bg-blue-100 p-0 flex items-center justify-center"
          onClick={() => onReaction(reactionType)}
          title={`Thêm biểu cảm ${reactionLabels[reactionType]}`}
        >
          {renderCenteredEmoji(unifiedCode, 16, EmojiStyle.FACEBOOK)}
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
          <Heart className="h-3 w-3 text-gray-600" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto p-1 rounded-full shadow-lg flex items-center gap-1 z-[999999]"
        align={isCurrentUser ? "end" : "center"}
        side={isCurrentUser ? "top" : "bottom"}
        sideOffset={8}
      >
        {Object.entries(reactionUnifiedCodes).map(
          ([reactionType, unifiedCode]) => (
            <button
              key={reactionType}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all duration-150 hover:scale-125 hover:shadow-md group/reaction"
              onClick={() => onReaction(reactionType as ReactionType)}
            >
              {renderCenteredEmoji(unifiedCode, 24, EmojiStyle.FACEBOOK)}
            </button>
          ),
        )}
      </PopoverContent>
    </Popover>
  );
}
