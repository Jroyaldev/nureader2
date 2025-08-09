import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    await createClient();
    
    // Simple health check: just verify we can create a Supabase client
    // This tests basic connectivity without requiring specific tables
    
    return NextResponse.json({ 
      ok: true, 
      message: "Supabase client initialized successfully",
      timestamp: new Date().toISOString()
    });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}