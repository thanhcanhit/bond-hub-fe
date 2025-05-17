"use server";

import { createAxiosInstance } from "@/lib/axios";

// Define interfaces for AI enhance feature
interface PreviousMessage {
  content: string;
  type: string;
  senderId: string;
  senderName: string;
}

interface EnhanceMessageResponse {
  enhancedMessage: string;
}

/**
 * Enhance a message using AI
 * @param message The message to enhance
 * @param previousMessages Optional array of previous messages for context
 * @returns Enhanced message
 */
export async function enhanceMessage(
  message: string,
  previousMessages?: PreviousMessage[],
) {
  try {
    const axiosInstance = createAxiosInstance();
    console.log("axiosInstance", axiosInstance.defaults.baseURL);
    const response = await axiosInstance.post("/ai/enhance", {
      message,
      previousMessages,
    });

    const result = response.data as EnhanceMessageResponse;
    return { success: true, enhancedMessage: result.enhancedMessage };
  } catch (error) {
    console.error("AI message enhancement failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate AI response based on a prompt
 * @param prompt The prompt for AI generation
 * @returns Generated AI response
 */
export async function generateAIResponse(prompt: string) {
  try {
    const axiosInstance = createAxiosInstance();

    const response = await axiosInstance.post("/ai/generate", {
      prompt,
    });

    return { success: true, response: response.data.response };
  } catch (error) {
    console.error("AI response generation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Summarize text using AI
 * @param text The text to summarize
 * @param maxLength Optional maximum length for the summary
 * @param previousMessages Optional array of previous messages for context
 * @returns Summarized text
 */
export async function summarizeText(
  text: string,
  maxLength?: number,
  previousMessages?: PreviousMessage[],
) {
  try {
    const axiosInstance = createAxiosInstance();

    const payload: any = { text };

    if (maxLength) {
      payload.maxLength = maxLength.toString();
    }

    if (previousMessages) {
      payload.previousMessages = previousMessages;
    }

    const response = await axiosInstance.post("/ai/summarize", payload);

    return { success: true, summary: response.data.summary };
  } catch (error) {
    console.error("AI text summarization failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send a freestyle prompt to AI with optional system prompt
 * @param prompt The main prompt for AI
 * @param systemPrompt Optional system prompt to control AI behavior
 * @returns AI response
 */
export async function freestyleAI(prompt: string, systemPrompt?: string) {
  try {
    const axiosInstance = createAxiosInstance();

    const payload: any = { prompt };

    if (systemPrompt) {
      payload.systemPrompt = systemPrompt;
    }

    const response = await axiosInstance.post("/ai/freestyle", payload);

    return { success: true, response: response.data.response };
  } catch (error) {
    console.error("AI freestyle request failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
