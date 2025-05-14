"use client";

import { useState, useEffect, use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff } from "lucide-react";
import { getUserInitials } from "@/utils/userUtils";
import { playCallRingtone, stopAudio } from "@/utils/audioUtils";
import { User } from "@/types/base";
import { fetchUserById } from "@/actions/user";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { useCallStore } from "@/stores/callStore";

export default function IncomingCallPage({
  params,
}: {
  params: { id: string };
}) {
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const callId = unwrappedParams.id;

  const router = useRouter();
  const searchParams = useSearchParams();
  const initiatorId = searchParams.get("initiatorId");
  const roomId = searchParams.get("roomId");
  const callType = searchParams.get("type") as "AUDIO" | "VIDEO";

  const [caller, setCaller] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { accessToken } = useAuthStore();

  // Play call ringtone
  useEffect(() => {
    console.log("Starting call ringtone");
    let audio: HTMLAudioElement | null = null;

    try {
      audio = playCallRingtone(0.7);

      // Add event listeners to debug audio issues
      audio.addEventListener("play", () => {
        console.log("Call ringtone started playing");
      });

      audio.addEventListener("error", (e) => {
        console.error("Error playing call ringtone:", e);
      });

      audio.addEventListener("pause", () => {
        console.log("Call ringtone paused");
      });
    } catch (error) {
      console.error("Exception when trying to play ringtone:", error);
    }

    return () => {
      console.log("Cleaning up call ringtone");
      if (audio) {
        try {
          stopAudio(audio);
        } catch (error) {
          console.error("Error stopping audio:", error);
        }
      }
    };
  }, []);

  // Fetch caller information
  useEffect(() => {
    const getCaller = async () => {
      if (!initiatorId) return;

      try {
        console.log(
          `Fetching caller data for initiatorId: ${initiatorId} with token: ${accessToken ? "exists" : "missing"}`,
        );

        if (!accessToken) {
          console.warn("Cannot fetch caller data: No access token available");
          // Create a placeholder user
          setCaller({
            id: initiatorId,
            email: null,
            phoneNumber: null,
            passwordHash: "",
            createdAt: new Date(),
            updatedAt: new Date(),
            userInfo: {
              id: initiatorId,
              fullName: "Người gọi",
              profilePictureUrl: null,
              statusMessage: "",
              blockStrangers: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              userAuth: null as unknown as User,
            },
            refreshTokens: [],
            qrCodes: [],
            posts: [],
            stories: [],
            groupMembers: [],
            cloudFiles: [],
            pinnedItems: [],
            sentFriends: [],
            receivedFriends: [],
            contacts: [],
            contactOf: [],
            settings: [],
            postReactions: [],
            hiddenPosts: [],
            addedBy: [],
            notifications: [],
            sentMessages: [],
            receivedMessages: [],
            comments: [],
          });
          return;
        }

        // Pass the token explicitly to fetchUserById
        const userData = await fetchUserById(initiatorId, accessToken);
        console.log("Caller data fetched:", userData);

        if (userData) {
          setCaller(userData);
        }
      } catch (error) {
        console.error("Error fetching caller information:", error);
        // Create a placeholder user on error
        setCaller({
          id: initiatorId,
          email: null,
          phoneNumber: null,
          passwordHash: "",
          createdAt: new Date(),
          updatedAt: new Date(),
          userInfo: {
            id: initiatorId,
            fullName: "Người gọi",
            profilePictureUrl: null,
            statusMessage: "",
            blockStrangers: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            userAuth: null as unknown as User,
          },
          refreshTokens: [],
          qrCodes: [],
          posts: [],
          stories: [],
          groupMembers: [],
          cloudFiles: [],
          pinnedItems: [],
          sentFriends: [],
          receivedFriends: [],
          contacts: [],
          contactOf: [],
          settings: [],
          postReactions: [],
          hiddenPosts: [],
          addedBy: [],
          notifications: [],
          sentMessages: [],
          receivedMessages: [],
          comments: [],
        });
      }
    };

    getCaller();
  }, [initiatorId, accessToken]);

  // Handle accepting the call
  const handleAccept = async () => {
    console.log(
      `Accepting call: callId=${callId}, roomId=${roomId}, isProcessing=${isProcessing}`,
    );

    if (!callId || !roomId) {
      console.error("Cannot accept call: Missing callId or roomId");
      return;
    }

    if (isProcessing) {
      console.log(
        "Already processing call acceptance, ignoring duplicate click",
      );
      return;
    }

    setIsProcessing(true);
    console.log("Set isProcessing to true");

    try {
      console.log(`Calling acceptCall with callId=${callId}`);

      // Use the call store to accept the call
      const success = await useCallStore.getState().acceptCall(callId);
      console.log("Call acceptance result:", success);

      if (success) {
        // Determine the appropriate call URL
        const callUrl =
          callType === "VIDEO" ? `/video-call/${roomId}` : `/call/${roomId}`;

        console.log(`Redirecting to call page: ${callUrl}`);
        router.push(callUrl);
      } else {
        console.error("Failed to accept call");
        toast.error("Không thể kết nối cuộc gọi");
        window.close();
      }
    } catch (error) {
      console.error("Error accepting call:", error);
      toast.error("Đã xảy ra lỗi khi kết nối cuộc gọi");
      window.close();
    }
  };

  // Handle rejecting the call
  const handleReject = async () => {
    console.log(
      `Rejecting call: callId=${callId}, isProcessing=${isProcessing}`,
    );

    if (!callId) {
      console.error("Cannot reject call: Missing callId");
      return;
    }

    if (isProcessing) {
      console.log(
        "Already processing call rejection, ignoring duplicate click",
      );
      return;
    }

    setIsProcessing(true);
    console.log("Set isProcessing to true");

    try {
      console.log(`Calling rejectCall with callId=${callId}`);

      // Use the call store to reject the call
      const success = await useCallStore.getState().rejectIncomingCall(callId);

      if (success) {
        console.log("Call rejected successfully");
      } else {
        console.error("Failed to reject call");
      }

      window.close();
    } catch (error) {
      console.error("Error rejecting call:", error);
      toast.error("Đã xảy ra lỗi khi từ chối cuộc gọi");
      window.close();
    }
  };

  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center">
      <div className="bg-white rounded-lg overflow-hidden w-full max-w-md shadow-xl">
        <div className="bg-blue-500 p-4 text-center text-white">
          <h2 className="text-xl font-semibold">
            {callType === "VIDEO" ? "Cuộc gọi video đến" : "Cuộc gọi thoại đến"}
          </h2>
        </div>

        <div className="p-8 flex flex-col items-center">
          <Avatar className="h-32 w-32 mb-6">
            <AvatarImage
              src={caller?.userInfo?.profilePictureUrl || ""}
              alt={caller?.userInfo?.fullName || "Unknown"}
            />
            <AvatarFallback className="text-4xl">
              {caller ? getUserInitials(caller) : "?"}
            </AvatarFallback>
          </Avatar>

          <h3 className="text-2xl font-bold mb-2">
            {caller?.userInfo?.fullName || "Người dùng"}
          </h3>

          <p className="text-gray-500 mb-8">
            {callType === "VIDEO" ? "Cuộc gọi video" : "Cuộc gọi thoại"}
          </p>

          <div className="flex gap-8">
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center disabled:opacity-70"
              aria-label="Từ chối cuộc gọi"
            >
              <PhoneOff className="text-white h-7 w-7" />
            </button>

            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center disabled:opacity-70"
              aria-label="Chấp nhận cuộc gọi"
            >
              <Phone className="text-white h-7 w-7" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
