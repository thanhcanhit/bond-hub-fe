"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Send, Trash2, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioRecorderProps {
  onSend: (audioBlob: Blob, duration?: number) => void;
  onCancel: () => void;
}

export default function AudioRecorder({
  onSend,
  onCancel,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Use correct MIME type for browser compatibility
        // Most browsers support audio/webm or audio/wav better than audio/mpeg for recorded audio
        // Try different formats in order of compatibility
        let audioBlob;

        // First try with audio/webm (most compatible with Chrome/Firefox)
        try {
          audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          console.log("Recording stopped, blob created with type audio/webm");
        } catch (error) {
          console.error("Error creating audio/webm blob:", error);
          // Fallback to audio/wav
          try {
            audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
            console.log("Fallback: blob created with type audio/wav");
          } catch (error2) {
            console.error("Error creating audio/wav blob:", error2);
            // Last resort: use generic audio type
            audioBlob = new Blob(audioChunksRef.current, {
              type: "audio/mpeg",
            });
            console.log("Last resort: blob created with type audio/mpeg");
          }
        }

        // Set the blob to state immediately with the recording time as duration
        setAudioBlob(audioBlob);
        setAudioDuration(recordingTime || 1); // Use recording time as a reliable duration
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop all tracks in the stream
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
      }

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Play recorded audio
  const playAudio = () => {
    if (audioRef.current && audioBlob) {
      // Reset playback to beginning if already at the end
      if (playbackTime >= audioDuration - 0.1) {
        audioRef.current.currentTime = 0;
        setPlaybackTime(0);
      }

      // Start playback
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((error) => {
          console.error("Error playing audio:", error);
        });
    }
  };

  // Pause playback
  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);

      // Store current position
      setPlaybackTime(audioRef.current.currentTime);
    }
  };

  // Cancel recording
  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setAudioBlob(null);
    setIsPlaying(false);
    onCancel();
  };

  // Send recorded audio
  const handleSend = () => {
    if (audioBlob) {
      // Create a new blob with MP3 type for better compatibility when sending
      // But keep the original content unchanged
      const blobToSend = new Blob([audioBlob], {
        type: "audio/mpeg",
      });

      // Create a custom blob with duration information
      // We need to use a wrapper object since Blob doesn't support custom properties
      const blobWithDuration = {
        blob: blobToSend,
        recordingDuration: recordingTime,
      };

      // We'll extract this in the receiver component

      console.log(
        "Sending audio blob with duration:",
        blobWithDuration,
        "duration:",
        recordingTime,
      );
      onSend(blobWithDuration.blob, recordingTime);

      // Clean up
      setAudioBlob(null);
      setIsPlaying(false);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    }
  };

  // Format time (seconds -> MM:SS)
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Create and set up audio element when audioBlob changes
  useEffect(() => {
    if (!audioBlob) return;

    console.log("Setting up audio with blob:", audioBlob);

    // Create a new audio element with the blob
    const objectUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio();

    // Set up event listeners before setting src
    const handleLoadedMetadata = () => {
      console.log("Audio loaded, duration:", audio.duration);
      if (isFinite(audio.duration) && audio.duration > 0) {
        setAudioDuration(audio.duration);
      } else {
        console.warn("Invalid audio duration:", audio.duration);
        // Set a default duration if the actual one is invalid
        setAudioDuration(recordingTime || 1);
      }
    };

    const handleTimeUpdate = () => {
      setPlaybackTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleError = (e: ErrorEvent) => {
      console.error("Audio error:", e);
      // If there's an error, try to use the recording time as a fallback
      setAudioDuration(recordingTime || 1);
    };

    // Add event listeners
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    // Now set the source and load
    audio.src = objectUrl;
    audio.load();

    // Set the audio ref
    audioRef.current = audio;

    // Clean up function
    return () => {
      // Remove event listeners
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);

      // Clean up resources
      audio.pause();
      audio.src = "";
      URL.revokeObjectURL(objectUrl);
    };
  }, [audioBlob, recordingTime]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();

        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream
            .getTracks()
            .forEach((track) => track.stop());
        }
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Render progress bar for playback with click to seek functionality
  const renderProgressBar = () => {
    // Calculate progress percentage safely
    const progress =
      audioDuration > 0
        ? Math.min(100, Math.max(0, (playbackTime / audioDuration) * 100))
        : 0;

    // Debug info - uncomment if needed
    // console.log(`Progress: ${progress}%, Time: ${playbackTime}s, Duration: ${audioDuration}s`);

    const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!audioRef.current || audioDuration === 0) return;

      // Calculate click position relative to the progress bar width
      const progressBar = e.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const clickPosition = (e.clientX - rect.left) / rect.width;

      // Set the audio current time based on click position
      const newTime = clickPosition * audioDuration;
      audioRef.current.currentTime = newTime;
      setPlaybackTime(newTime);
    };

    return (
      <div className="w-full">
        {/* Clickable progress bar */}
        <div
          className="w-full h-4 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
          onClick={handleProgressBarClick}
        >
          <div
            className="h-full bg-blue-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full p-2 bg-gray-50 rounded-lg">
      {!audioBlob ? (
        // Recording state
        <div className="flex items-center gap-3">
          <Button
            variant={isRecording ? "destructive" : "default"}
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? (
              <Square className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>

          <div className="flex-1">
            {isRecording ? (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-sm font-medium">Đang ghi âm...</span>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  {formatTime(recordingTime)}
                </span>
              </div>
            ) : (
              <span className="text-sm text-gray-500">
                Nhấn để bắt đầu ghi âm
              </span>
            )}
          </div>

          {isRecording && (
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Hủy
            </Button>
          )}
        </div>
      ) : (
        // Playback state
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 flex-shrink-0"
              onClick={isPlaying ? pauseAudio : playAudio}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium mb-2 flex justify-between items-center">
                <span className="flex items-center">
                  <span className="mr-2">Đoạn ghi âm</span>
                  {isPlaying && (
                    <span className="text-xs text-blue-600 animate-pulse">
                      Đang phát
                    </span>
                  )}
                </span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {formatTime(audioDuration)}
                </span>
              </div>
              {renderProgressBar()}
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span className="font-medium">{formatTime(playbackTime)}</span>
                <span>
                  {formatTime(Math.max(0, audioDuration - playbackTime))}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-1">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <Trash2 className="h-4 w-4 mr-1" />
              Xóa
            </Button>

            <Button variant="default" size="sm" onClick={handleSend}>
              <Send className="h-4 w-4 mr-1" />
              Gửi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
