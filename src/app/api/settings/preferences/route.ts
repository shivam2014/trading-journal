import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

// Define schema for preference validation
const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  defaultCurrency: z.string().min(3).max(3).optional(),
  chartPreferences: z.record(z.any()).optional(),
  notificationSettings: z.record(z.any()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Fetch user preferences
    const userPreferences = await prisma.userPreferences.findUnique({
      where: {
        userId,
      },
    });

    // If no preferences exist yet, return default values
    if (!userPreferences) {
      return NextResponse.json({
        theme: "system",
        defaultCurrency: "USD",
        chartPreferences: {
          showVolume: true,
          timeframe: "1D",
        },
        notificationSettings: {
          emailAlerts: false,
          priceAlerts: false,
        },
      });
    }

    return NextResponse.json(userPreferences);
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const data = await req.json();
    
    // Validate the request body
    const validatedData = preferencesSchema.parse(data);
    
    // Update or create user preferences using upsert
    const updatedPreferences = await prisma.userPreferences.upsert({
      where: {
        userId,
      },
      update: validatedData,
      create: {
        userId,
        ...validatedData,
        // Set defaults for any missing fields
        theme: validatedData.theme || "system",
        defaultCurrency: validatedData.defaultCurrency || "USD",
        chartPreferences: validatedData.chartPreferences || {
          showVolume: true,
          timeframe: "1D",
        },
        notificationSettings: validatedData.notificationSettings || {
          emailAlerts: false,
          priceAlerts: false,
        },
      },
    });

    return NextResponse.json(updatedPreferences);
  } catch (error) {
    // Handle zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid preferences data", details: error.format() },
        { status: 400 }
      );
    }
    
    console.error("Error updating user preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}