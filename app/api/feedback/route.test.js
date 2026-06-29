import { describe, it, expect, vi, beforeEach } from 'vitest';

// ADMIN_KEY is injected via vitest.config.js before any module loads.
// Mock the store so tests don't touch the filesystem
vi.mock('../../../lib/store', () => ({
  readAll: vi.fn(() => []),
  writeAll: vi.fn(),
}));

import { GET, POST, DELETE } from './route';
import { readAll, writeAll } from '../../../lib/store';

function makeRequest(body, headers = {}) {
  return {
    json: async () => body,
    headers: {
      get: (key) => headers[key.toLowerCase()] ?? null,
    },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  readAll.mockReturnValue([]);
});

// ── GET ──────────────────────────────────────────────────────────────────────

describe('GET /api/feedback', () => {
  it('returns all feedback with displayTime (happy path)', async () => {
    const now = new Date().toISOString();
    readAll.mockReturnValue([{ id: '1', name: 'Alice', text: 'Great!', createdAt: now }]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0]).toHaveProperty('displayTime');
  });
});

// ── POST ─────────────────────────────────────────────────────────────────────

describe('POST /api/feedback', () => {
  it('201 on valid input (happy path)', async () => {
    const req = makeRequest({ name: 'Alice', text: 'Looks good!' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.name).toBe('Alice');
    expect(data.text).toBe('Looks good!');
    expect(writeAll).toHaveBeenCalledOnce();
  });

  it('400 when name is missing', async () => {
    const req = makeRequest({ text: 'No name here' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('400 when text is empty', async () => {
    const req = makeRequest({ name: 'Alice', text: '' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('400 when name exceeds 100 characters', async () => {
    const req = makeRequest({ name: 'A'.repeat(101), text: 'Valid feedback' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('400 when text exceeds 2000 characters', async () => {
    const req = makeRequest({ name: 'Alice', text: 'x'.repeat(2001) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('500 when writeAll throws', async () => {
    writeAll.mockImplementation(() => { throw new Error('disk full'); });
    const req = makeRequest({ name: 'Alice', text: 'Valid' });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

// ── DELETE ───────────────────────────────────────────────────────────────────

describe('DELETE /api/feedback', () => {
  it('200 when Authorization header is valid (happy path)', async () => {
    readAll.mockReturnValue([{ id: '42', name: 'Alice', text: 'Hi', createdAt: '' }]);
    const req = makeRequest({ id: '42' }, { authorization: 'Bearer test-admin-key' });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(writeAll).toHaveBeenCalledOnce();
  });

  it('403 when Authorization header is missing', async () => {
    const req = makeRequest({ id: '42' });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  it('403 when Authorization header has wrong key', async () => {
    const req = makeRequest({ id: '42' }, { authorization: 'Bearer wrong-key' });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  it('500 when writeAll throws', async () => {
    readAll.mockReturnValue([{ id: '42', name: 'Alice', text: 'Hi', createdAt: '' }]);
    writeAll.mockImplementation(() => { throw new Error('disk full'); });
    const req = makeRequest({ id: '42' }, { authorization: 'Bearer test-admin-key' });
    const res = await DELETE(req);
    expect(res.status).toBe(500);
  });
});
