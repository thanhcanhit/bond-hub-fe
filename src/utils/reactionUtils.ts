import { ReactionType } from "@/types/base";
import { Emoji, EmojiStyle } from "emoji-picker-react";
import React from "react";

// Type for the emoji style parameter
type EmojiStyleType = EmojiStyle | string;

// Type for the Emoji component props
interface EmojiProps {
  unified: string;
  size: number;
  emojiStyle: EmojiStyle;
}

// Define a type for reaction objects with varying structures
export interface ReactionObject {
  userId: string;
  reactionType?: ReactionType;
  reaction?: string;
  count?: number;
}

// Helper function to get reaction emoji unified codes
export const getReactionUnifiedCodes = (): Record<ReactionType, string> => ({
  [ReactionType.LIKE]: "1f44d",
  [ReactionType.LOVE]: "2764-fe0f",
  [ReactionType.HAHA]: "1f602",
  [ReactionType.WOW]: "1f62e",
  [ReactionType.SAD]: "1f622",
  [ReactionType.ANGRY]: "1f621",
});

// Helper function to get reaction labels
export const getReactionLabels = (): Record<ReactionType, string> => ({
  [ReactionType.LIKE]: "Thích",
  [ReactionType.LOVE]: "Yêu thích",
  [ReactionType.HAHA]: "Haha",
  [ReactionType.WOW]: "Wow",
  [ReactionType.SAD]: "Buồn",
  [ReactionType.ANGRY]: "Phẫn nộ",
});

// Helper function to get reaction type from object
export const getReactionTypeFromObject = (
  reaction: ReactionObject,
): ReactionType => {
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

// Helper function to get reaction count
export const getReactionCount = (reaction: ReactionObject): number => {
  // Check if the reaction has a count property
  if ("count" in reaction && typeof reaction.count === "number") {
    return reaction.count;
  }
  return 1; // Default count
};

// Process reactions to count by type
export const processReactions = (reactions: ReactionObject[]) => {
  const reactionCounts: Record<ReactionType, number> = {} as Record<
    ReactionType,
    number
  >;
  let totalReactions = 0;

  // Process each reaction to handle different API response formats
  reactions.forEach((reaction) => {
    const reactionType = getReactionTypeFromObject(reaction);
    const count = getReactionCount(reaction);

    reactionCounts[reactionType] = (reactionCounts[reactionType] || 0) + count;
    totalReactions += count;
  });

  return { reactionCounts, totalReactions };
};

// Reusable component for rendering an emoji with proper centering
export const renderCenteredEmoji = (
  unified: string,
  size: number,
  emojiStyle: EmojiStyleType,
) => {
  return React.createElement(
    "div",
    { className: "flex items-center justify-center w-full h-full" },
    React.createElement(
      "div",
      {
        className: "flex items-center justify-center",
        style: { lineHeight: 0 },
      },
      React.createElement<EmojiProps>(Emoji, {
        unified,
        size,
        emojiStyle: emojiStyle as EmojiStyle,
      }),
    ),
  );
};
