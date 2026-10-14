import { useState } from 'react';

const MAX = 200;

export default function StatusInput({ onPost }) {
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      const saved = await onPost(text.trim());
      if (saved !== false) setText('');
    } finally {
      setPosting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-neutral-100 rounded-2xl p-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What are you working on right now?"
        maxLength={MAX}
        rows={2}
        className="w-full text-sm border-none focus:outline-none text-neutral-800 placeholder-neutral-400 bg-transparent resize-none leading-relaxed"
      />
      <div className="flex justify-between items-center border-t border-neutral-100 pt-3">
        <span className="text-[11px] text-neutral-400">{MAX - text.length}</span>
        <button
          type="submit"
          disabled={!text.trim() || posting}
          className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-200 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          {posting ? 'Posting…' : 'Post status'}
        </button>
      </div>
    </form>
  );
}
