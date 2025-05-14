"use server";

import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/utils/authUtils";

export async function POST(
  request: NextRequest,
  { params }: { params: { callId: string } },
) {
  try {
    const token = getAuthToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { callId } = params;

    if (!callId) {
      return NextResponse.json({ error: "Missing call ID" }, { status: 400 });
    }

    // Call backend API to reject the call
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/calls/${callId}/reject`,
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
        { error: errorData.message || "Failed to reject call" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error rejecting call:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
