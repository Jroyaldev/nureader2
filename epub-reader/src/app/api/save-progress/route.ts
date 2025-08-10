import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user - but for beacon requests, user might be from the payload
    const { data: { user } } = await supabase.auth.getUser();
    
    // Try to parse as JSON first (from sendBeacon)
    let bookId: string;
    let progress: number;
    let location: string = '';
    let userId: string | undefined;
    
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      // Handle JSON from sendBeacon
      const json = await request.json();
      bookId = json.book_id;
      progress = json.progress_percentage;
      location = json.current_location || '';
      userId = json.user_id; // Fallback user ID from payload
    } else {
      // Handle FormData (legacy)
      const formData = await request.formData();
      bookId = formData.get('bookId') as string;
      progress = parseFloat(formData.get('progress') as string);
      location = formData.get('location') as string || '';
    }

    if (!bookId || isNaN(progress)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }
    
    // Use authenticated user if available, otherwise use the one from payload
    const finalUserId = user?.id || userId;
    
    if (!finalUserId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    // Save progress to database
    const { error } = await supabase
      .from('reading_progress')
      .upsert({
        user_id: finalUserId,
        book_id: bookId,
        current_location: location,
        progress_percentage: progress,
        last_read_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,book_id'
      });

    if (error) {
      console.error('Error saving progress via beacon:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error saving progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}