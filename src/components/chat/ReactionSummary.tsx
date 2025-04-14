"use client";

import { ReactionType } from "@/types/base";

interface ReactionSummaryProps {
  reactions: Array<{
    userId: string;
    reactionType?: ReactionType;
    reaction?: string;
    count?: number;
  }>;
}

// Helper functions for reaction handling
const getReactionEmojis = () => ({
  [ReactionType.LIKE]: "👍",
  [ReactionType.LOVE]: "❤️",
  [ReactionType.HAHA]: "😂",
  [ReactionType.WOW]: "😮",
  [ReactionType.SAD]: "😢",
  [ReactionType.ANGRY]: "😡",
});

// Helper function to get reaction type from object
const getReactionTypeFromObject = (reaction: any): ReactionType => {
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
const getReactionCount = (reaction: any): number => {
  // Check if the reaction has a count property
  if ("count" in reaction && typeof reaction.count === "number") {
    return reaction.count;
  }
  return 1; // Default count
};

// Process reactions to count by type
const processReactions = (reactions: any[]) => {
  const reactionCounts: Record<string, number> = {};
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

export default function ReactionSummary({ reactions }: ReactionSummaryProps) {
  if (!reactions || reactions.length === 0) {
    return null;
  }

  // Process reactions using helper function
  const { reactionCounts, totalReactions } = processReactions(reactions);

  // Get emoji mapping
  const reactionEmojis = getReactionEmojis();

  return (
    <div className="flex items-center bg-white rounded-full shadow-sm px-1 py-0.5 text-xs">
      {/* Display unique reaction types */}
      {Object.entries(reactionCounts).map(([type, count]) => (
        <span
          key={type}
          className="mr-0.5"
          title={`${count} ${type.toLowerCase()}`}
        >
          {reactionEmojis[type as ReactionType]}
        </span>
      ))}
      <span className="text-gray-600 font-medium ml-0.5">{totalReactions}</span>
    </div>
  );
}
