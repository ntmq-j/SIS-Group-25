import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import BrandMark from './BrandMark';

export default function PasswordRecovery({ session, ready, onComplete, onBack }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirmation) { setError('Passwords do not match.'); return; }
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword(''); setConfirmation(''); setSaved(true);
    } catch (err) { setError(err.message || 'Unable to change your password. Request a new reset link.'); }
    finally { setSaving(false); }
  };
  return <main className="flex min-h-screen items-center justify-center bg-brand-paper p-4">
    <section className="w-full max-w-md space-y-5 rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
      <BrandMark />
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      {!ready ? <p role="status" className="text-sm text-neutral-500">Checking your reset link…</p> : !session ? <>
        <p role="alert" className="text-sm text-red-700">This reset link is invalid or has expired. Please request a new link.</p>
        <button type="button" onClick={onBack} className="text-sm font-semibold text-orange-700">Return to sign in</button>
      </> : saved ? <>
        <p role="status" className="text-sm text-green-700">Your password has been updated.</p>
        <button type="button" onClick={onComplete} className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white">Continue to Recess</button>
      </> : <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium">New password<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" /></label>
        <label className="block text-sm font-medium">Confirm new password<input type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" /></label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={saving} className="w-full rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Updating…' : 'Update password'}</button>
      </form>}
    </section>
  </main>;
}
