import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readAll, writeAll } from '../../../lib/store';
import { formatRelativeTime } from '../../../lib/dateUtils';

const feedbackSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
  text: z.string().min(1, 'Feedback is required').max(2000, 'Feedback must be 2000 characters or fewer'),
});

// FIX #1: Read secret from environment; fail fast at startup if missing
const ADMIN_KEY = process.env.ADMIN_KEY;
if (!ADMIN_KEY) {
  throw new Error('ADMIN_KEY environment variable is not set');
}

// FIX #6: formatRelativeTime is now a real, tested function in lib/dateUtils.js
export async function GET() {
  const items = readAll();
  const formatted = items.map((item) => ({
    ...item,
    displayTime: formatRelativeTime(item.createdAt),
  }));
  return NextResponse.json(formatted);
}

export async function POST(request) {
  const body = await request.json();

  // FIX #2: Validate input server-side with zod before touching storage
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const items = readAll();
  const newItem = {
    id: Date.now().toString(),
    name: parsed.data.name,
    text: parsed.data.text,
    createdAt: new Date().toISOString(),
  };

  items.push(newItem);

  // FIX #5: Log the error and return 500 so callers know the write failed
  try {
    writeAll(items);
  } catch (e) {
    console.error('Failed to persist feedback (POST):', e);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }

  return NextResponse.json(newItem, { status: 201 });
}

export async function DELETE(request) {
  // FIX #4: Validate Authorization header on the server — client body is untrusted
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token || token !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const items = readAll();
  const updated = items.filter((item) => item.id !== body.id);

  // FIX #5: Log the error and return 500 so the client knows the delete failed
  try {
    writeAll(updated);
  } catch (e) {
    console.error('Failed to persist feedback (DELETE):', e);
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
