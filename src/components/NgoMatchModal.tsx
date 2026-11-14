import { useEffect, useState } from 'react';
import { Building2, Loader2, MapPin, X } from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import type { Donation, NgoMatchSuggestion } from '../types.ts';

interface NgoMatchModalProps {
  donation: Donation | null;
  onClose: () => void;
}

export function NgoMatchModal({ donation, onClose }: NgoMatchModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<NgoMatchSuggestion[]>([]);

  useEffect(() => {
    if (!donation) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setSuggestions([]);

    apiRequest<{ suggestions: NgoMatchSuggestion[] }>('/api/ai/match-ngos', {
      method: 'POST',
      body: JSON.stringify({ donation }),
    })
      .then((res) => {
        if (!cancelled) setSuggestions(res.suggestions);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not fetch NGO match suggestions.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [donation]);

  if (!donation) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-emerald-950/15 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-emerald-950/10 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#0F1F17]">
              Suitable NGO Recommendations
            </h2>
            <p className="text-xs text-[#47554E] mt-0.5 truncate max-w-md">
              Matching verified recipients for: {donation.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-lg text-[#47554E] hover:bg-emerald-50 hover:text-[#0F1F17]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {loading && (
            <div className="flex items-center gap-3 py-10 justify-center text-sm text-[#47554E]">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-700" />
              <span>Evaluating category, quantity, location, and published NGO needs...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              {error}
            </div>
          )}

          {!loading && !error && suggestions.length === 0 && (
            <p className="text-sm text-[#47554E] py-6 text-center">
              No verified NGOs found for matching yet.
            </p>
          )}

          {!loading &&
            suggestions.map((item, idx) => (
              <div
                key={item.orgId}
                className="p-4 rounded-lg border border-emerald-950/12 bg-[#F8FAF9] space-y-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#0F1F17]">
                      <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        {idx + 1}. {item.orgName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#47554E]">
                      <span>{item.orgType}</span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {item.city}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.aiPowered ? 'Gemini Match' : 'Rule Match'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-semibold tabular-nums text-emerald-800">
                      {item.matchScore}% match
                    </span>
                  </div>
                </div>

                <p className="text-sm text-[#0F1F17] leading-relaxed">{item.whySuitable}</p>

                {item.matchedNeeds.length > 0 && (
                  <p className="text-xs text-[#47554E]">
                    <span className="font-semibold text-[#0F1F17]">Matched NGO Needs:</span>{' '}
                    {item.matchedNeeds.join(' · ')}
                  </p>
                )}
              </div>
            ))}
        </div>

        <div className="px-6 py-3.5 border-t border-emerald-950/10 bg-[#F8FAF9] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-emerald-950/15 bg-white text-[#0F1F17] hover:bg-emerald-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
