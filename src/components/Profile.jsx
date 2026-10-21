import { useEffect, useState } from 'react';
import { BookOpen, Briefcase, Edit3, Mail, Save, X } from 'lucide-react';
import { loadOwnProfile, updateOwnProfile } from '../services/profiles';
import { ModerationPanel, PreferencesPanel } from './CommunityHub';

const emptyProfile = {
  display_name: '',
  bio: '',
  course_or_role: '',
  account_type: '',
  organisations: null,
};

export default function Profile({ safetyTargetId = '' }) {
  const [tab, setTab] = useState(safetyTargetId ? 'safety' : 'profile');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(emptyProfile);
  const [formData, setFormData] = useState(emptyProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    loadOwnProfile()
      .then(({ user: currentUser, profile: currentProfile }) => {
        if (!active) return;
        setUser(currentUser);
        setProfile(currentProfile);
        setFormData(currentProfile);
      })
      .catch((loadError) => {
        if (active) setError(loadError?.message ?? 'Unable to load your profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateOwnProfile(formData);
      setProfile(updated);
      setFormData(updated);
      setIsEditing(false);
      setSaved(true);
    } catch (saveError) {
      setError(saveError?.message ?? 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-4xl p-6 text-center text-sm text-slate-400">Loading your profile…</div>;
  }

  if (error && !user) {
    return <p role="alert" className="mx-auto max-w-4xl rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  }

  const organisationName = profile.organisations?.name || 'Organisation pending';
  const accountType = profile.account_type === 'student' ? 'Student' : 'Professional';

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-2 sm:p-6">
      <nav aria-label="Profile settings" className="flex gap-1 overflow-x-auto rounded-2xl border border-neutral-100 bg-white p-1.5">
        {[['profile', 'Profile details'], ['preferences', 'Availability & interests'], ['safety', 'Safety']].map(([value, label]) => <button type="button" key={value} onClick={() => setTab(value)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold ${tab === value ? 'bg-orange-600 text-white' : 'text-neutral-600 hover:bg-neutral-50'}`}>{label}</button>)}
      </nav>
      {tab === 'preferences' && <PreferencesPanel />}
      {tab === 'safety' && <ModerationPanel key={safetyTargetId} targetUserId={safetyTargetId} />}
      {tab === 'profile' && <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="px-4 pb-6 sm:px-8 sm:pb-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 pt-6">
            <div className="flex h-32 w-32 items-center justify-center rounded-2xl border border-slate-100 bg-white p-2 shadow-md">
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-orange-600 text-3xl font-bold text-white">
                {(profile.display_name || user?.email || '?').charAt(0).toUpperCase()}
              </div>
            </div>

            {!isEditing ? (
              <button type="button" onClick={() => { setSaved(false); setIsEditing(true); }} className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700">
                <Edit3 size={16} />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button type="button" onClick={() => { setFormData(profile); setIsEditing(false); }} className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <X size={16} /> Cancel
                </button>
                <button type="submit" form="profile-form" disabled={saving} className="flex items-center gap-1 rounded-xl bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 disabled:opacity-60">
                  <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {error && <p role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {saved && <p role="status" className="mb-4 rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-700">Profile updated.</p>}

          {!isEditing ? (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{profile.display_name || 'Recess member'}</h1>
                <p className="mt-1 flex items-center gap-1.5 break-all text-sm text-slate-500"><Mail size={14} className="shrink-0 text-slate-400" />{user?.email}</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bio</h3>
                <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 leading-relaxed text-slate-700">{profile.bio || 'No bio provided yet.'}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-3">
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="rounded-lg bg-orange-50 p-2.5 text-orange-600"><Briefcase size={20} /></div>
                  <div><span className="block text-xs font-medium text-slate-400">Account</span><span className="text-sm font-semibold text-slate-800">{accountType}</span></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600"><BookOpen size={20} /></div>
                  <div><span className="block text-xs font-medium text-slate-400">Course / role</span><span className="text-sm font-semibold text-slate-800">{profile.course_or_role || 'Not specified'}</span></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="rounded-lg bg-orange-50 p-2.5 text-orange-600"><span className="text-lg">✓</span></div>
                  <div><span className="block text-xs font-medium text-slate-400">Organisation</span><span className="text-sm font-semibold text-slate-800">{organisationName}</span></div>
                </div>
              </div>
            </div>
          ) : (
            <form id="profile-form" onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Display name</label>
                <input type="text" name="display_name" value={formData.display_name || ''} onChange={handleChange} maxLength={80} required className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Course / role</label>
                <input type="text" name="course_or_role" value={formData.course_or_role || ''} onChange={handleChange} maxLength={120} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Bio</label>
                <textarea name="bio" rows={4} value={formData.bio || ''} onChange={handleChange} maxLength={500} className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
              </div>
              <p className="text-xs text-slate-400">Your organisation, account type and email are verified fields and cannot be edited here.</p>
            </form>
          )}
        </div>
      </div>}
    </div>
  );
}
