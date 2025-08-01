import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Test environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        status: "error",
        message: "Missing environment variables",
        env_vars: {
          url: !!supabaseUrl,
          key: !!supabaseKey
        }
      }, { status: 500 });
    }
    
    // Test basic connection without database query
    return NextResponse.json({
      status: "success",
      message: "Environment variables configured correctly",
      url: supabaseUrl,
      key_length: supabaseKey.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (e: any) {
    return NextResponse.json({
      status: "error",
      message: "Configuration error",
      error: e?.message ?? "Unknown error"
    }, { status: 500 });
  }
}