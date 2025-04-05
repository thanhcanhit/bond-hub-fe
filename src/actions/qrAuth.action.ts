"use server";

import api from "@/lib/axios";

export interface QrCodeResponse {
  qrToken: string;
  expires_in: number;
}

/**
 * Generates a new QR code for authentication
 * @returns Promise with QR code data including token and expiration time
 */
export const generateQrCode = async (): Promise<QrCodeResponse> => {
  try {
    const response = await api.post("/qrcode/generate");
    const { qrToken, expires_in } = response.data;

    // Log information about the generated QR code
    console.log("QR code generated with token:", qrToken);
    console.log("QR expires_in:", expires_in, "seconds");
    console.log("Current time:", new Date().toISOString());
    console.log(
      "Expiry time:",
      new Date(Date.now() + expires_in * 1000).toISOString(),
    );

    return {
      qrToken,
      expires_in,
    };
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
};

/**
 * Verifies a QR code token
 * @param token The QR code token to verify
 * @returns Promise with verification result
 */
export const verifyQrCode = async (token: string) => {
  try {
    const response = await api.post("/qrcode/verify", { token });
    return response.data;
  } catch (error) {
    console.error("Error verifying QR code:", error);
    throw error;
  }
};

/**
 * Cancels a QR code token
 * @param token The QR code token to cancel
 * @returns Promise with cancellation result
 */
export const cancelQrCode = async (token: string) => {
  try {
    const response = await api.post("/qrcode/cancel", { token });
    return response.data;
  } catch (error) {
    console.error("Error cancelling QR code:", error);
    throw error;
  }
};
