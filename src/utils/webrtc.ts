/**
 * @deprecated This file is deprecated. Please import directly from the webrtc directory.
 * For example: import { ... } from "@/utils/webrtc/state";
 *
 * This file exists for backward compatibility and will be removed in a future version.
 */

/**
 * WebRTC utilities for handling video/audio calls
 *
 * This file exports all the WebRTC functionality from the webrtc directory
 */

// Core functionality
export * from "./webrtc/index";
export * from "./webrtc/state";
export * from "./webrtc/types";

// Media handling
export * from "./webrtc/media";
export * from "./webrtc/producer";
export * from "./webrtc/consumer";

// Connection handling
export * from "./webrtc/transport";
export * from "./webrtc/socket";
export * from "./webrtc/connection";
export * from "./webrtc/room";

// Event handling and cleanup
export * from "./webrtc/events";
export * from "./webrtc/cleanup";
