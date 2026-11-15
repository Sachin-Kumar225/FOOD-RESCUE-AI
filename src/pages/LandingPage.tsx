import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ImagePlus,
  MapPin,
  ShieldCheck,
  Truck,
  Users,
} from 'lucide-react';
import { SafeImage } from '../components/SafeImage.tsx';
import { DonationStatusLabel } from '../components/StatusLabel.tsx';
import { PhotoEditorModal } from '../components/PhotoEditorModal.tsx';
import { updateDonationPhoto, updateSiteSettings } from '../lib/dataService.ts';
import { getDefaultDonationImage, resolveImageUrl, STATIC_IMAGES } from '../lib/imageUtils.ts';
import type { PageRoute } from '../components/Navbar.tsx';
import type { Donation, PlatformStats, SiteSettings, UserRole } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface LandingPageProps {
  stats: PlatformStats | null;
  donations: Donation[];
  siteSettings: SiteSettings | null;
  onRefresh: () => Promise<void>;
  onNavigate: (page: PageRoute, options?: { role?: UserRole }) => void;
}

export function LandingPage({
  stats,
  donations,
  siteSettings,
  onRefresh,
  onNavigate,
}: LandingPageProps) {
  const { user } = useAuth();
  const featuredDonations = donations.filter((d) => d.status === 'Available').slice(0, 3);
  const heroUrl = resolveImageUrl(siteSettings?.heroImageUrl, STATIC_IMAGES.hero);

  const [photoEditTarget, setPhotoEditTarget] = useState<{
    kind: 'hero' | 'donation';
    donationId?: string;
    title: string;
    url: string;
  } | null>(null);
  const [roleNotice, setRoleNotice] = useState<string | null>(null);

  const handleRoleCardClick = (targetRole: UserRole, label: string) => {
    setRoleNotice(null);
    if (user) {
      if (user.role === targetRole) {
        onNavigate('dashboard');
        return;
      }
      setRoleNotice(
        `You are currently signed in as ${user.role.toUpperCase()}. Role workspaces are strictly restricted to your assigned account role — sign out first to access or register as ${label}.`
      );
      return;
    }

    if (targetRole === 'admin') {
      onNavigate('signin', { role: 'admin' });
    } else {
      onNavigate('register', { role: targetRole });
    }
  };

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
                onClick={() => onNavigate(user ? 'dashboard' : 'signin')}
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
            <div className="relative h-72 sm:h-96 lg:h-full min-h-[340px] rounded-xl overflow-hidden border border-emerald-950/10 bg-[#F8FAF9]">
              <SafeImage
                src={heroUrl}
                fallbackSrc={STATIC_IMAGES.hero}
                alt="Volunteers packing fresh produce, bread, and prepared meal boxes at a community food rescue hub"
                className="w-full h-full object-cover"
              />
              {user?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() =>
                    setPhotoEditTarget({
                      kind: 'hero',
                      title: 'Hero Banner Photo',
                      url: heroUrl,
                    })
                  }
                  className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/95 text-[#0F1F17] border border-emerald-950/15 shadow-xs hover:bg-white"
                >
                  <ImagePlus className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Edit Photo</span>
                </button>
              )}
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
            {featuredDonations.map((item) => {
              const canEditPhoto =
                user && (user.role === 'admin' || user.id === item.donorId);
              return (
                <article
                  key={item.id}
                  className="bg-white border border-emerald-950/10 rounded-xl overflow-hidden flex flex-col"
                >
                  <div className="relative h-48 bg-[#F8FAF9] border-b border-emerald-950/10">
                    <SafeImage
                      src={item.imageUrl}
                      fallbackSrc={getDefaultDonationImage(item.category)}
                      alt={item.title}
                      fallbackTitle={item.title}
                      className="w-full h-full object-cover"
                    />
                    {canEditPhoto && (
                      <button
                        type="button"
                        onClick={() =>
                          setPhotoEditTarget({
                            kind: 'donation',
                            donationId: item.id,
                            title: item.title,
                            url: item.imageUrl,
                          })
                        }
                        className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/95 text-[#0F1F17] border border-emerald-950/15 shadow-xs hover:bg-white"
                      >
                        <ImagePlus className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Edit Photo</span>
                      </button>
                    )}
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
              );
            })}
          </div>
        )}
      </section>

      {/* Four Roles Summary */}
      <section className="border-t border-emerald-950/10 bg-[#F8FAF9] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {roleNotice && (
            <div
              role="alert"
              className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <span>{roleNotice}</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                >
                  Open My Workspace
                </button>
                <button
                  type="button"
                  onClick={() => setRoleNotice(null)}
                  className="px-2.5 py-1.5 text-xs font-medium text-amber-900 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(
              [
                {
                  role: 'donor' as UserRole,
                  title: 'Donors',
                  description:
                    'Publish surplus meals or goods in under a minute, manage incoming NGO requests, and inspect AI-ranked recipient recommendations.',
                  cta: user?.role === 'donor' ? 'Open Donor Workspace' : 'Register as Donor',
                  icon: CheckCircle2,
                },
                {
                  role: 'ngo' as UserRole,
                  title: 'NGOs & Shelters',
                  description:
                    'Submit verification credentials, publish ongoing resource needs, claim matching donations, and confirm physical delivery receipts.',
                  cta: user?.role === 'ngo' ? 'Open NGO Workspace' : 'Register NGO / Shelter',
                  icon: Users,
                },
                {
                  role: 'volunteer' as UserRole,
                  title: 'Volunteers',
                  description:
                    'Browse scheduled pickup routes in your city, claim tasks, and update real-time pickup and drop-off status.',
                  cta: user?.role === 'volunteer' ? 'Open Volunteer Dispatch' : 'Join as Volunteer',
                  icon: Truck,
                },
                {
                  role: 'admin' as UserRole,
                  title: 'Administrators',
                  description:
                    'Verify NGO registrations, moderate safety-sensitive listings, resolve user reports, and monitor platform-wide activity.',
                  cta: user?.role === 'admin' ? 'Open Admin Console' : 'Administrator Sign In',
                  icon: ShieldCheck,
                },
              ] as const
            ).map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.role}
                  type="button"
                  onClick={() => handleRoleCardClick(card.role, card.title)}
                  className="group text-left bg-white border border-emerald-950/10 hover:border-emerald-700/40 rounded-xl p-6 flex flex-col justify-between gap-4 transition-all hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                >
                  <div className="space-y-2">
                    <Icon className="w-5 h-5 text-emerald-700" />
                    <h3 className="font-display text-base font-semibold text-[#0F1F17]">
                      {card.title}
                    </h3>
                    <p className="text-sm text-[#47554E] leading-relaxed">{card.description}</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 group-hover:text-emerald-900">
                    <span>{card.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <PhotoEditorModal
        isOpen={photoEditTarget !== null}
        title={photoEditTarget?.title || 'Photo'}
        initialUrl={photoEditTarget?.url || heroUrl}
        onClose={() => setPhotoEditTarget(null)}
        onSave={async ({ url }) => {
          if (!photoEditTarget) return;
          if (photoEditTarget.kind === 'hero') {
            await updateSiteSettings({ heroImageUrl: url });
          } else if (photoEditTarget.donationId) {
            await updateDonationPhoto(photoEditTarget.donationId, url, user);
          }
          await onRefresh();
        }}
      />
    </div>
  );
}
