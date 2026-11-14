import { AlertTriangle, BookOpen, CheckCircle2, HeartHandshake, Home, Utensils } from 'lucide-react';
import { SafeImage } from '../components/SafeImage.tsx';
import type { PageRoute } from '../components/Navbar.tsx';

export function AboutPage({ onNavigate }: { onNavigate: (page: PageRoute) => void }) {
  return (
    <div className="bg-white py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Intro Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 space-y-5 flex flex-col justify-center">
            <p className="text-sm font-semibold text-emerald-800">About FOOD RESCUE AI</p>
            <h1
              className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0F1F17]"
              style={{ textWrap: 'balance' }}
            >
              Practical logistics and responsible AI for zero-waste communities
            </h1>
            <p className="text-base text-[#47554E] leading-relaxed">
              Every day, restaurants, hotels, canteens, and households discard edible surplus food
              and usable daily essentials while nearby shelters, orphanages, and community kitchens
              operate below capacity. FOOD RESCUE AI bridges that gap with verified participant
              roles, transparent status tracking, and assistive Gemini AI tools.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('auth')}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
              >
                Join as Donor, NGO, or Volunteer
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-72 sm:h-96 lg:h-full min-h-[300px] rounded-xl overflow-hidden border border-emerald-950/10">
              <SafeImage
                src="/src/assets/images/about_community_hub_1794669343508.jpg"
                alt="Restaurant staff and community volunteers sorting green crates of packaged groceries and fruit"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Four Categories */}
        <section className="space-y-6">
          <div className="max-w-2xl space-y-1.5">
            <h2 className="font-display text-2xl font-bold text-[#0F1F17]">
              Four Supported Donation Categories
            </h2>
            <p className="text-sm text-[#47554E]">
              Beyond surplus meals, communities regularly need warmth, school supplies, and hygiene
              essentials.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="border border-emerald-950/10 rounded-xl p-6 space-y-2.5 bg-[#F8FAF9]">
              <Utensils className="w-5 h-5 text-emerald-700" />
              <h3 className="font-display text-base font-semibold text-[#0F1F17]">Food</h3>
              <p className="text-sm text-[#47554E]">
                Prepared meals, packaged food, dry groceries, and fresh fruits &amp; vegetables with
                explicit storage &amp; expiry tracking.
              </p>
            </div>

            <div className="border border-emerald-950/10 rounded-xl p-6 space-y-2.5 bg-[#F8FAF9]">
              <HeartHandshake className="w-5 h-5 text-emerald-700" />
              <h3 className="font-display text-base font-semibold text-[#0F1F17]">
                Clothing &amp; Warmth
              </h3>
              <p className="text-sm text-[#47554E]">
                Clean seasonal clothes, footwear, winter wear, and wool blankets for night shelters
                and outreach drives.
              </p>
            </div>

            <div className="border border-emerald-950/10 rounded-xl p-6 space-y-2.5 bg-[#F8FAF9]">
              <BookOpen className="w-5 h-5 text-emerald-700" />
              <h3 className="font-display text-base font-semibold text-[#0F1F17]">
                Education &amp; Children
              </h3>
              <p className="text-sm text-[#47554E]">
                Storybooks, school textbooks, ruled notebooks, stationery kits, and educational toys
                for children&apos;s homes.
              </p>
            </div>

            <div className="border border-emerald-950/10 rounded-xl p-6 space-y-2.5 bg-[#F8FAF9]">
              <Home className="w-5 h-5 text-emerald-700" />
              <h3 className="font-display text-base font-semibold text-[#0F1F17]">
                Household &amp; Daily Needs
              </h3>
              <p className="text-sm text-[#47554E]">
                Usable furniture, kitchen utensils, serving trays, and sealed personal hygiene
                essentials.
              </p>
            </div>
          </div>
        </section>

        {/* AI + Deterministic Safety Policy */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-emerald-950/10 pt-12">
          <div className="border border-emerald-950/10 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-xl font-bold text-[#0F1F17]">
              Gemini AI Capabilities (Server-Side)
            </h2>
            <ul className="space-y-3 text-sm text-[#47554E]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#0F1F17]">Description Drafting:</strong> Turns basic
                  item facts into clear, practical descriptions for NGO coordinators.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#0F1F17]">Image Categorization:</strong> Inspects
                  uploaded item photos to suggest the category, subcategory, and unit.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#0F1F17]">Structured Text Extraction:</strong> Parses
                  natural-language donor notes into structured listing fields.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#0F1F17]">Explainable NGO Matching:</strong> Ranks
                  verified NGOs by category, city, quantity, and published needs with clear reasons.
                </span>
              </li>
            </ul>
          </div>

          <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
              <h2 className="font-display text-xl font-bold text-[#0F1F17]">
                Deterministic Food Safety Guardrails
              </h2>
            </div>
            <p className="text-sm text-[#47554E] leading-relaxed">
              Food safety is governed by strict deterministic rules, never by generative AI. AI
              models are explicitly prohibited from certifying food as safe to eat.
            </p>
            <ul className="space-y-2.5 text-sm text-[#47554E]">
              <li>• Expired items or ambient prepared meals older than 6 hours are rejected.</li>
              <li>
                • Prepared meals, unsealed containers, and short expiry windows automatically flag{' '}
                <strong className="text-[#0F1F17]">Human Review Required</strong>.
              </li>
              <li>
                • Physical temperature, smell, and seal checks by volunteers and NGO staff are
                mandatory before distribution.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
