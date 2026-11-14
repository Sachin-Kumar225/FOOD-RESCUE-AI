import React, { useState } from 'react';
import { CheckCircle2, Database, Loader2, Mail, Server } from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import type { PlatformStats } from '../types.ts';

export function ContactPage({ stats }: { stats: PlatformStats | null }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('NGO Onboarding & Verification');
  const [roleInterest, setRoleInterest] = useState('NGO / Shelter');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiRequest('/api/contact', {
        method: 'POST',
        body: JSON.stringify({ name, email, subject, roleInterest, message }),
      });
      setSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F8FAF9] min-h-[calc(100vh-4rem)] py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Form */}
        <div className="lg:col-span-7 bg-white border border-emerald-950/10 rounded-xl p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#0F1F17]">
              Contact &amp; Support
            </h1>
            <p className="text-sm text-[#47554E] mt-1">
              Questions about restaurant partnerships, NGO document verification, or volunteer
              dispatch? Messages are logged directly to the Admin console.
            </p>
          </div>

          {submitted && (
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-700/20 text-sm text-emerald-950 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                Your inquiry has been saved. Platform administrators can review it inside the Admin
                Dashboard.
              </span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F1F17] mb-1">Topic</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
                  Participant Type
                </label>
                <select
                  value={roleInterest}
                  onChange={(e) => setRoleInterest(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white"
                >
                  <option>Restaurant / Hotel Donor</option>
                  <option>NGO / Shelter</option>
                  <option>Pickup Volunteer</option>
                  <option>Technical / Hackathon Team</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1F17] mb-1">Message *</label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can our coordination desk help?"
                className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              <span>Send Message</span>
            </button>
          </form>
        </div>

        {/* Backend & Setup Guide */}
        <div className="lg:col-span-5 bg-white border border-emerald-950/10 rounded-xl p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-[#0F1F17]">
              Environment &amp; Setup Status
            </h2>
            <p className="text-xs text-[#47554E]">
              Transparent report of active backend services and optional cloud setup.
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="p-3.5 rounded-lg bg-[#F8FAF9] border border-emerald-950/10 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-[#0F1F17]">
                <Server className="w-4 h-4 text-emerald-700" />
                <span>Express Backend &amp; Persistent Store</span>
              </div>
              <p className="text-xs text-[#47554E]">
                Active ({stats?.backendStatus.databaseEngine || 'Server-side JSON persistence'}).
                All auth, donations, requests, tasks, and image uploads persist on the server.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#F8FAF9] border border-emerald-950/10 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-[#0F1F17]">
                <Database className="w-4 h-4 text-emerald-700" />
                <span>Gemini AI Server Integration</span>
              </div>
              <p className="text-xs text-[#47554E]">
                {stats?.backendStatus.geminiConfigured
                  ? 'Configured via server-side GEMINI_API_KEY.'
                  : 'Waiting for GEMINI_API_KEY in server environment secrets; deterministic template fallbacks remain active for descriptions and NGO matching.'}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#F8FAF9] border border-emerald-950/10 space-y-1.5">
              <p className="text-xs font-semibold text-[#0F1F17]">
                Optional Firebase Migration Checklist
              </p>
              <p className="text-xs text-[#47554E] leading-relaxed">
                Firebase provisioning was skipped during setup, so this build uses a real local
                Express database instead of mocking Firebase. To migrate during the offline
                hackathon: enable Firebase Auth, Firestore, and Storage, add credentials to server
                secrets, and swap the `server/db.ts` adapter.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
