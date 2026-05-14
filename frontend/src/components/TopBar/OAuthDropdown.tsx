import React, { useState } from 'react';

const OAUTH_PROVIDERS = [
  { id: 'google', name: 'Google' },
  { id: 'github', name: 'GitHub' },
];

export const OAuthDropdown: React.FC<{
  onStartOAuth: (provider: string) => void;
  loading?: boolean;
}> = ({ onStartOAuth, loading }) => {
  const [selected, setSelected] = useState(OAUTH_PROVIDERS[0].id);

  return (
    <div className="flex items-center gap-2">
      <select
        className="border rounded px-2 py-1"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={loading}
      >
        {OAUTH_PROVIDERS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button
        className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
        onClick={() => onStartOAuth(selected)}
        disabled={loading}
      >
        {loading ? '...' : 'Login'}
      </button>
    </div>
  );
};
