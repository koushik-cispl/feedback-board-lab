'use client';

import { useState, useEffect } from 'react';

// FIX #4: Admin key comes from the user at runtime (prompt/env); never hardcoded.
// In a real app this would be a login session/token — here we use a simple prompt
// so the lab stays dependency-free on the client side.
function getAdminKey() {
  return typeof window !== 'undefined' ? sessionStorage.getItem('adminKey') : null;
}

export default function FeedbackPage() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  async function loadFeedback() {
    const res = await fetch('/api/feedback');
    const data = await res.json();
    setFeedbackList(data);
  }

  useEffect(() => {
    loadFeedback();
    setIsAdmin(!!getAdminKey());
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('Submitting...');
    setErrors([]);
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, text }),
    });
    if (!res.ok) {
      const data = await res.json();
      const msgs = data.details
        ? Object.values(data.details).flat()
        : [data.error ?? 'Submission failed.'];
      setErrors(msgs);
      setStatus('');
      return;
    }
    setName('');
    setText('');
    setErrors([]);
    setStatus('Submitted!');
    loadFeedback();
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;
    const key = getAdminKey();
    if (!key) {
      setStatus('Admin key required. Reload the page and enter it.');
      return;
    }
    // FIX #4: Auth token sent in Authorization header — server validates it
    const res = await fetch('/api/feedback', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ id }),
    });
    if (res.status === 403) {
      setStatus('Forbidden: invalid admin key.');
      return;
    }
    loadFeedback();
  }

  function handleAdminLogin() {
    const key = window.prompt('Enter admin key:');
    if (key) {
      sessionStorage.setItem('adminKey', key);
      setIsAdmin(true);
    }
  }

  return (
    <div>
      {/* FIX #4: Admin login — key stored in sessionStorage, never baked into the bundle */}
      {!isAdmin && (
        <button onClick={handleAdminLogin} style={{ float: 'right', padding: '0.25rem 0.75rem', cursor: 'pointer' }}>
          Admin Login
        </button>
      )}
      <h2>Submit Feedback</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '500px' }}>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: '0.5rem', fontSize: '1rem' }}
        />
        <textarea
          placeholder="Your feedback"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          style={{ padding: '0.5rem', fontSize: '1rem' }}
        />
        <button type="submit" style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
          Submit
        </button>
        {errors.length > 0 && (
          <ul style={{ color: '#c00', margin: '0.25rem 0', paddingLeft: '1.25rem' }}>
            {errors.map((msg, i) => <li key={i}>{msg}</li>)}
          </ul>
        )}
        {status && <p style={{ color: 'green', margin: '0.25rem 0' }}>{status}</p>}
      </form>

      <h2 style={{ marginTop: '2rem' }}>All Feedback</h2>
      {feedbackList.length === 0 && <p>No feedback yet.</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {feedbackList.map((item) => (
          <li
            key={item.id}
            style={{
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '1rem',
              marginBottom: '1rem',
            }}
          >
            <strong>{item.name}</strong>
            <span style={{ color: '#888', marginLeft: '1rem', fontSize: '0.85rem' }}>
              {item.createdAt}
            </span>
            {/* FIX #3: Render as plain text — no XSS possible */}
            <p>{item.text}</p>
            {isAdmin && (
              <button
                onClick={() => handleDelete(item.id)}
                style={{ background: '#c00', color: '#fff', border: 'none', padding: '0.25rem 0.75rem', cursor: 'pointer', borderRadius: '3px' }}
              >
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
