import { ArrowRight, CheckCircle2, MapPin, ShieldCheck, Truck, Users } from 'lucide-react';
import { SafeImage } from '../components/SafeImage.tsx';
import { DonationStatusLabel } from '../components/StatusLabel.tsx';
import type { PageRoute } from '../components/Navbar.tsx';
import type { Donation, PlatformStats } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface LandingPageProps {
  stats: PlatformStats | null;
  donations: Donation[];
  onNavigate: (page: PageRoute) => void;
}

export function LandingPage({ stats, donations, onNavigate }: LandingPageProps) {
  const { user } = useAuth();
  const featuredDonations = donations.filter((d) => d.status === 'Available').slice(0, 3);

  return (
    <div className="bg-white">
      {/* Hero Split */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 lg:pt-14 lg:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <p className="text-sm font-semibold tracking-wide text-emerald-800">
              FOOD RESCUE AI · Community Surplus Network
            </p>
            <h1
              className="font-display font-bold tracking-tight text-[#0F1F17] leading-[1.08]"
              style={{
                fontSize: 'clamp(2.25rem, 4vw, 3.65rem)',
                textWrap: 'balance',
              }}
            >
              Don&apos;t waste it. Donate it. Make someone smile.
            </h1>
            <p className="text-base sm:text-lg text-[#47554E] leading-relaxed max-w-xl">
              Connect surplus meals, fresh produce, clothing, books, and daily essentials from
              restaurants, hotels, and households directly to verified NGOs, shelters, and local
              pickup volunteers.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => onNavigate(user ? 'dashboard' : 'auth')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap"
              >
                <span>{user ? 'Go to Role Workspace' : 'Start Donating or Join'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('browse')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-[#0F1F17] border border-emerald-950/15 hover:bg-emerald-50 rounded-lg transition-colors whitespace-nowrap"
              >
                <span>Browse Available Donations</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-72 sm:h-96 lg:h-full min-h-[340px] rounded-xl overflow-hidden border border-emerald-950/10 bg-[#F8FAF9]">
              <SafeImage
                src="/src/assets/images/hero_food_rescue_1794669342092.jpg"
                alt="Volunteers packing fresh produce, bread, and prepared meal boxes at a community food rescue hub"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* 4-Column Live KPI Strip directly below hero */}
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 border border-emerald-950/10 rounded-xl bg-[#F8FAF9] p-5 sm:p-6">
          <div className="space-y-1">
            <p className="text-xs font-medium text-[#47554E]">Total Listings Recorded</p>
            <p className="font-mono text-2xl sm:text-3xl font-semibold tabular-nums text-[#0F1F17]">
              {stats ? stats.totalDonations : '—'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-[#47554E]">Available for Pickup</p>
            <p className="font-mono text-2xl sm:text-3xl font-semibold tabular-nums text-emerald-700">
              {stats ? stats.availableDonations : '—'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-[#47554E]">Verified Partner NGOs</p>
            <p className="font-mono text-2xl sm:text-3xl font-semibold tabular-nums text-[#0F1F17]">
              {stats ? stats.registeredNgos : '—'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-[#47554E]">Receiver-Confirmed Deliveries</p>
            <p className="font-mono text-2xl sm:text-3xl font-semibold tabular-nums text-emerald-800">
              {stats ? stats.completedDonations : '—'}
            </p>
          </div>
        </div>
        <p className="mt-2.5 text-xs text-[#47554E]">
          Live figures computed directly from the platform database. Donations count as completed
          only after formal NGO receiver confirmation.
        </p>
      </section>

      {/* How It Works */}
      <section className="border-t border-emerald-950/10 bg-[#F8FAF9] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10 space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F1F17]">
              How the rescue workflow operates
            </h2>
            <p className="text-sm sm:text-base text-[#47554E]">
              Every donation moves through a tracked five-stage lifecycle from listing to verified
              shelter receipt.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-3">
              <p className="font-mono text-xs font-semibold text-emerald-700">01 · List Surplus</p>
              <h3 className="font-display text-lg font-semibold text-[#0F1F17]">
                Donors publish items
              </h3>
              <p className="text-sm text-[#47554E] leading-relaxed">
                Restaurants, markets, and households upload photos, quantities, and mandatory food
                storage details. Gemini AI helps draft descriptions and extract structured fields.
              </p>
            </div>

            <div className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-3">
              <p className="font-mono text-xs font-semibold text-emerald-700">
                02 · Match &amp; Request
              </p>
              <h3 className="font-display text-lg font-semibold text-[#0F1F17]">
                Verified NGOs claim
              </h3>
              <p className="text-sm text-[#47554E] leading-relaxed">
                Gemini matches listings against verified NGO needs and proximity, explaining why
                each shelter fits. Verified NGOs submit pickup requests.
              </p>
            </div>

            <div className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-3">
              <p className="font-mono text-xs font-semibold text-emerald-700">
                03 · Volunteer Dispatch
              </p>
              <h3 className="font-display text-lg font-semibold text-[#0F1F17]">
                Volunteers transport
              </h3>
              <p className="text-sm text-[#47554E] leading-relaxed">
                Once approved, a pickup task opens for local volunteers. Volunteers accept the
                route and update status from Scheduled to Picked Up.
              </p>
            </div>

            <div className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-3">
              <p className="font-mono text-xs font-semibold text-emerald-700">
                04 · Confirm Receipt
              </p>
              <h3 className="font-display text-lg font-semibold text-[#0F1F17]">
                Verified delivery
              </h3>
              <p className="text-sm text-[#47554E] leading-relaxed">
                The receiving NGO inspects condition and confirms receipt, creating an auditable
                delivery record before counting toward completed impact.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Available Donations */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F1F17]">
              Currently available for rescue
            </h2>
            <p className="text-sm text-[#47554E]">
              Live listings ready for verified NGO requests and volunteer pickup.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('browse')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900 whitespace-nowrap"
          >
            <span>View all listings</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {featuredDonations.length === 0 ? (
          <div className="border border-emerald-950/10 rounded-xl p-10 text-center text-sm text-[#47554E]">
            All current listings have been claimed or delivered. Check back soon or publish a new
            donation.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredDonations.map((item) => (
              <article
                key={item.id}
                className="bg-white border border-emerald-950/10 rounded-xl overflow-hidden flex flex-col"
              >
                <div className="h-48 bg-[#F8FAF9] border-b border-emerald-950/10">
                  <SafeImage
                    src={item.imageUrl}
                    alt={item.title}
                    fallbackTitle={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-[#47554E]">
                        {item.category} · {item.subCategory}
                      </span>
                      <DonationStatusLabel status={item.status} />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-[#0F1F17] leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#47554E] line-clamp-2">{item.description}</p>
                  </div>

                  <div className="pt-3 border-t border-emerald-950/10 flex items-center justify-between text-xs text-[#47554E]">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      {item.city}
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-[#0F1F17]">
                      {item.quantityValue} {item.quantityUnit}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Four Roles Summary */}
      <section className="border-t border-emerald-950/10 bg-[#F8FAF9] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              <h3 className="font-display text-base font-semibold text-[#0F1F17]">Donors</h3>
              <p className="text-sm text-[#47554E]">
                Publish surplus meals or goods in under a minute, manage incoming NGO requests, and
                inspect AI-ranked recipient recommendations.
              </p>
            </div>
            <div className="space-y-2">
              <Users className="w-5 h-5 text-emerald-700" />
              <h3 className="font-display text-base font-semibold text-[#0F1F17]">
                NGOs &amp; Shelters
              </h3>
              <p className="text-sm text-[#47554E]">
                Submit verification credentials, publish ongoing resource needs, claim matching
                donations, and confirm physical delivery receipts.
              </p>
            </div>
            <div className="space-y-2">
              <Truck className="w-5 h-5 text-emerald-700" />
              <h3 className="font-display text-base font-semibold text-[#0F1F17]">Volunteers</h3>
              <p className="text-sm text-[#47554E]">
                Browse scheduled pickup routes in your city, claim tasks, and update real-time
                pickup and drop-off status.
              </p>
            </div>
            <div className="space-y-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <h3 className="font-display text-base font-semibold text-[#0F1F17]">
                Administrators
              </h3>
              <p className="text-sm text-[#47554E]">
                Verify NGO registrations, moderate safety-sensitive listings, resolve user reports,
                and monitor platform-wide activity.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
