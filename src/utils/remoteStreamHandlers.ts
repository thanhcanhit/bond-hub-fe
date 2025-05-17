/**
 * Set up handlers for remote audio streams
 */
export function setupRemoteStreamHandlers(): () => void {
  // Handler for remote stream added
  const handleRemoteStream = (event: any) => {
    const { id, stream, kind } = event.detail;
    console.log(`[REMOTE_STREAM] Remote stream added: ${id}, kind: ${kind}`);

    // For audio calls, we just need to create an audio element
    if (kind === "audio") {
      // Check if we already have an audio element for this stream
      let audioElement = document.getElementById(
        `remote-audio-${id}`,
      ) as HTMLAudioElement;

      if (!audioElement) {
        // Create a new audio element
        audioElement = document.createElement("audio");
        audioElement.id = `remote-audio-${id}`;
        audioElement.autoplay = true;
        audioElement.style.display = "none"; // Hide the audio element
        document.body.appendChild(audioElement);
        console.log(
          `[REMOTE_STREAM] Created new audio element for remote stream: ${id}`,
        );
      }

      // Set the stream as the source
      audioElement.srcObject = stream;
      console.log(`[REMOTE_STREAM] Set stream source for audio element: ${id}`);

      // Try to play the audio immediately
      try {
        (async () => {
          try {
            await audioElement.play();
            console.log(
              `[REMOTE_STREAM] Audio playback started for stream: ${id}`,
            );
          } catch (error) {
            console.error(
              `[REMOTE_STREAM] Error starting audio playback: ${error}`,
            );
          }
        })();
      } catch (error) {
        console.error(
          `[REMOTE_STREAM] Exception when trying to play audio: ${error}`,
        );
      }
    }
  };

  // Handler for remote stream removed
  const handleRemoteStreamRemoved = (event: any) => {
    const { id } = event.detail;
    console.log(`[REMOTE_STREAM] Remote stream removed: ${id}`);

    // Remove the audio element
    const audioElement = document.getElementById(`remote-audio-${id}`);
    if (audioElement) {
      audioElement.remove();
      console.log(`[REMOTE_STREAM] Removed audio element for stream: ${id}`);
    }
  };

  // Add event listeners
  window.addEventListener("call:remoteStreamAdded", handleRemoteStream);
  window.addEventListener(
    "call:remoteStreamRemoved",
    handleRemoteStreamRemoved,
  );

  // Return cleanup function
  return () => {
    window.removeEventListener("call:remoteStreamAdded", handleRemoteStream);
    window.removeEventListener(
      "call:remoteStreamRemoved",
      handleRemoteStreamRemoved,
    );
  };
}
