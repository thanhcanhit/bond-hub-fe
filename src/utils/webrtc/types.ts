import { Device } from "mediasoup-client";
import { Socket } from "socket.io-client";

// Polyfill for MediaStream constructor in some browsers
declare global {
  interface Window {
    webkitMediaStream?: typeof MediaStream;
  }
}

/**
 * WebRTC state interface
 */
export interface WebRTCState {
  device: Device | null;
  socket: Socket | null;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  sendTransport: any;
  recvTransport: any;
  producers: Map<string, any>;
  consumers: Map<string, any>;
}

/**
 * Create initial WebRTC state
 */
export const createInitialState = (): WebRTCState => ({
  device: null,
  socket: null,
  localStream: null,
  remoteStreams: new Map(),
  sendTransport: null,
  recvTransport: null,
  producers: new Map(),
  consumers: new Map(),
});
