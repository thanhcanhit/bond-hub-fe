"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Phone, Mic, MicOff } from "lucide-react";

interface AudioCallControlsProps {
  isMuted: boolean;
  toggleMute: () => void;
  handleEndCall: () => void;
}

/**
 * Audio call controls component for call page
 */
export default function AudioCallControls({
  isMuted,
  toggleMute,
  handleEndCall,
}: AudioCallControlsProps) {
  return (
    <div className="w-full bg-white p-6 flex items-center justify-center gap-6 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <Button
        onClick={toggleMute}
        variant="ghost"
        size="icon"
        className={`rounded-full p-3 h-14 w-14 ${isMuted ? "bg-gray-200" : "bg-gray-100"}`}
      >
        {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
      </Button>

      <Button
        onClick={handleEndCall}
        variant="destructive"
        size="icon"
        className="rounded-full p-3 h-16 w-16 bg-red-500 hover:bg-red-600"
      >
        <Phone className="h-8 w-8 rotate-135" />
      </Button>
    </div>
  );
}
