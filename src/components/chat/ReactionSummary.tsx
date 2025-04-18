"use client";

import { ReactionType } from "@/types/base";
import { EmojiStyle } from "emoji-picker-react";
import {
  getReactionUnifiedCodes,
  processReactions,
  renderCenteredEmoji,
  ReactionObject,
} from "@/utils/reactionUtils";

interface ReactionSummaryProps {
  reactions: Array<ReactionObject>;
}

export default function ReactionSummary({ reactions }: ReactionSummaryProps) {
  if (!reactions || reactions.length === 0) {
    return null;
  }

  // Process reactions using helper function
  const { reactionCounts } = processReactions(reactions);

  // Get emoji unified codes
  const reactionUnifiedCodes = getReactionUnifiedCodes();

  return (
    <div className="flex items-center bg-white rounded-full shadow-sm px-1 py-0.5 text-xs">
      {/* Display unique reaction types with individual counts */}
      {Object.entries(reactionCounts).map(([typeStr, count]) => {
        // Ensure that the type string is a valid ReactionType
        const type = typeStr as ReactionType;
        return (
          <span
            key={typeStr}
            className="mr-1.5 flex items-center gap-0.5 group"
            title={`${count} ${typeStr.toLowerCase()}`}
          >
            {renderCenteredEmoji(
              reactionUnifiedCodes[type],
              14,
              EmojiStyle.FACEBOOK,
            )}
            <span className="text-gray-600 font-medium">{count}</span>
          </span>
        );
      })}
    </div>
  );
}
