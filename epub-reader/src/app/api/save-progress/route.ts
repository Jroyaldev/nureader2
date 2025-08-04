import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const bookId = formData.get('bookId') as string;
    const progress = parseFloat(formData.get('progress') as string);

    if (!bookId || isNaN(progress)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Save progress to database
    const { error } = await supabase
      .from('reading_progress')
      .upsert({
        user_id: user.id,
        book_id: bookId,
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