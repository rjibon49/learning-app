'use client';
import { useState, type FormEvent } from 'react';
/** Web UI for the existing /auth/register and /auth/verify-email flow. */
export function LearnerSignup({ apiBase }: { apiBase: string }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [whatsAppOptIn, setWhatsAppOptIn] = useState(false);
  const [code, setCode] = useState('');
  const [phase, setPhase] = useState<'register'|'verify'>('register');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function request(path: string, payload: unknown) {
    const response = await fetch(`${apiBase.replace(/\/$/,'')}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json() as { message?: string };
    if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
    return data;
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      if (phase === 'register') {
        if (password !== confirm) throw new Error('Passwords do not match');
        await request('/auth/register', { displayName, email, password, ...(phone.trim() ? { phoneNumber: phone.trim() } : {}),
          marketing: { email: emailOptIn, whatsapp: whatsAppOptIn, sms: false } });
        setPhase('verify'); setMessage('Check your email for the six-digit verification code (including Spam/Junk).');
      } else {
        await request('/auth/verify-email', { email, code });
        setMessage('Email verified. You may now log in.');
      }
    } catch(err) { setMessage(err instanceof Error ? err.message : 'Request failed'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={e=>void submit(e)} className="mx-auto max-w-md space-y-3 rounded-xl border p-5">
    <h2 className="text-xl font-bold">{phase === 'register'?'Create learner account':'Verify email'}</h2>
    {phase === 'register' && <><label className="block">Name<input required minLength={2} className="block w-full rounded border p-2" value={displayName} onChange={e=>setDisplayName(e.target.value)}/></label></>}
    <label className="block">Email<input type="email" required autoComplete="email" className="block w-full rounded border p-2" disabled={phase==='verify'} value={email} onChange={e=>setEmail(e.target.value)}/></label>
    {phase==='register' ? <>
      <label className="block">Password<input type="password" autoComplete="new-password" required minLength={12} className="block w-full rounded border p-2" value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <label className="block">Confirm password<input type="password" required minLength={12} className="block w-full rounded border p-2" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
      <label className="block">Phone (optional)<input type="tel" placeholder="+8801712345678" className="block w-full rounded border p-2" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={emailOptIn} onChange={e=>setEmailOptIn(e.target.checked)}/> I agree to receive marketing offers by email</label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={whatsAppOptIn} onChange={e=>setWhatsAppOptIn(e.target.checked)}/> I agree to receive WhatsApp offers if I provide a valid phone number</label>
    </> : <label className="block">Email verification code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className="block w-full rounded border p-2" value={code} onChange={e=>setCode(e.target.value)}/></label>}
    {message && <p role="status" className="text-sm">{message}</p>}
    <button disabled={busy} type="submit" className="rounded bg-indigo-700 px-4 py-2 text-white disabled:opacity-50">{busy?'Working...':phase==='register'?'Sign up':'Verify email'}</button>
  </form>;
}
