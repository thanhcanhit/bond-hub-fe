"use client";

import { useState, useEffect, useRef } from "react";
import { Music, Play, Pause, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioVisualizerProps {
  url: string;
  fileName: string;
  onDownload?: () => void;
  compact?: boolean;
}

export default function AudioVisualizer({
  url,
  fileName,
  onDownload,
  compact = false,
}: AudioVisualizerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create audio element for playback control
  useEffect(() => {
    let isMounted = true;
    let loadAttempts = 0;
    const maxAttempts = 3;

    // Create audio element
    const audio = new Audio();

    // Set up event listeners
    // We no longer need these functions since we don't estimate duration

    // Try to extract duration from filename
    const extractDurationFromFileName = () => {
      try {
        // Check for duration in filename format: audio_message_TIMESTAMP_duration_X.mp3
        const durationMatch = fileName.match(/_duration_(\d+)/);
        if (durationMatch && durationMatch[1]) {
          const extractedDuration = parseFloat(durationMatch[1]);
          if (isFinite(extractedDuration) && extractedDuration > 0) {
            console.log("Extracted duration from filename:", extractedDuration);
            return extractedDuration;
          }
        }
        return 0;
      } catch (error) {
        console.error("Error extracting duration from filename:", error);
        return 0;
      }
    };

    const handleLoadedMetadata = () => {
      if (isMounted) {
        console.log("Audio metadata loaded, duration:", audio.duration);
        if (isFinite(audio.duration) && audio.duration > 0) {
          // If we have a valid duration from the audio element, use it
          setDuration(audio.duration);
        } else {
          // Try to extract duration from filename
          const extractedDuration = extractDurationFromFileName();
          if (extractedDuration > 0) {
            setDuration(extractedDuration);
          } else {
            // If still no valid duration, set it to 0 (will hide progress bar)
            console.log("Invalid duration, hiding progress bar");
            setDuration(0);
          }
        }
        setIsLoading(false);
      }
    };

    const handleTimeUpdate = () => {
      if (isMounted) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      if (isMounted) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    const handleError = (e: ErrorEvent) => {
      console.error("Audio loading error:", e);
      if (loadAttempts < maxAttempts) {
        loadAttempts++;
        // Try loading again with a slight delay
        setTimeout(() => {
          if (isMounted) {
            audio.src = url;
            audio.load();
          }
        }, 1000);
      } else {
        // If we've tried multiple times and failed, try to extract duration from filename
        const extractedDuration = extractDurationFromFileName();
        if (extractedDuration > 0) {
          console.log(
            "Using duration from filename after load failure:",
            extractedDuration,
          );
          setDuration(extractedDuration);
        } else {
          // If still no valid duration, set it to 0 (will hide progress bar)
          console.log(
            "Failed to load audio after multiple attempts, hiding progress bar",
          );
          setDuration(0);
        }
        setIsLoading(false);
      }
    };

    // Add event listeners
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    // Set audio source and load
    audio.preload = "metadata";
    audio.src = url;
    audio.load();

    // Store reference
    audioRef.current = audio;

    // Cleanup function
    return () => {
      isMounted = false;

      // Remove event listeners
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);

      // Stop playback and clean up resources
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [url, fileName]);

  // Progress bar component with click to seek functionality
  const renderProgressBar = () => {
    // If duration is 0 or invalid, show only sound wave visualization
    if (duration <= 0) {
      return (
        <div className="w-full h-3 flex items-center justify-center">
          {isPlaying ? (
            <div className="flex items-end space-x-1 h-3">
              <div className="w-1 h-2 bg-blue-500 rounded-full animate-sound-wave-1"></div>
              <div className="w-1 h-3 bg-blue-500 rounded-full animate-sound-wave-2"></div>
              <div className="w-1 h-1.5 bg-blue-500 rounded-full animate-sound-wave-3"></div>
              <div className="w-1 h-2.5 bg-blue-500 rounded-full animate-sound-wave-2"></div>
              <div className="w-1 h-2 bg-blue-500 rounded-full animate-sound-wave-1"></div>
            </div>
          ) : (
            <div className="h-3 w-full bg-gray-100 rounded-full"></div>
          )}
        </div>
      );
    }

    // Calculate progress percentage safely
    const progress = Math.min(100, Math.max(0, (currentTime / duration) * 100));

    const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!audioRef.current) return;

      // Calculate click position relative to the progress bar width
      const progressBar = e.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const clickPosition = (e.clientX - rect.left) / rect.width;

      // Set the audio current time based on click position
      const newTime = clickPosition * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    };

    return (
      <div className="w-full">
        <div
          className="w-full h-3 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
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

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Reset to beginning if we're at the end
      if (currentTime >= duration - 0.5) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }

      // Use promise to handle play() properly
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((error) => {
          console.error("Error playing audio:", error);
          // Try to reload the audio if play fails
          audioRef.current?.load();
        });
    }
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || time < 0) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const handleDownload = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (onDownload) {
      onDownload();
    } else {
      try {
        // Tạo một thẻ a ẩn để tải file
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName || "audio-file";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
        }, 100);
      } catch (error) {
        console.error("Error downloading file:", error);
        // Fallback: mở file trong tab mới
        window.open(url, "_blank");
      }
    }
  };

  if (compact) {
    return (
      <div className="flex items-center w-full gap-2 p-2 bg-gray-50 rounded-md">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            togglePlayPause();
          }}
          disabled={isLoading}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <div className="w-full">
            <audio
              src={url}
              ref={audioRef}
              className="hidden"
              preload="metadata"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            {renderProgressBar()}
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>{formatTime(currentTime)}</span>
              {duration > 0 ? (
                <span>{formatTime(duration)}</span>
              ) : (
                <span className="text-blue-500 font-medium">
                  {isPlaying ? "Đang phát" : "Âm thanh"}
                </span>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-gray-200 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            handleDownload(e);
          }}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center mb-2">
        <Music className="h-5 w-5 text-blue-500 mr-2" />
        <div className="text-sm font-medium truncate flex-1">{fileName}</div>
        <div className="text-xs text-gray-500">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-center mb-4">
          <div className="w-full">
            <audio
              src={url}
              ref={audioRef}
              className="hidden"
              preload="metadata"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            {renderProgressBar()}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700"
            onClick={togglePlayPause}
            disabled={isLoading}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-gray-200"
            onClick={(e) => handleDownload(e)}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
