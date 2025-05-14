"use server";

import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/utils/authUtils";

export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { callId } = body;

    if (!callId) {
      return NextResponse.json({ error: "Missing call ID" }, { status: 400 });
    }

    // Call backend API to end the call
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/calls/${callId}/end`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || "Failed to end call" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error ending call:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
