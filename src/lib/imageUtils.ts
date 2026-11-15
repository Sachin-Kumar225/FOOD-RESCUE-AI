import type { DonationCategory } from '../types.ts';

export const STATIC_IMAGES = {
  hero: '/images/hero_food_rescue_1794669342092.jpg',
  about: '/images/about_community_hub_1794669343508.jpg',
  preparedMeals: '/images/donation_prepared_meals_1794669342712.jpg',
  freshProduce: '/images/donation_fresh_produce_1794669343269.jpg',
  essentialsKit: '/images/donation_essentials_kit_1794669344223.jpg',
} as const;

export function getDefaultDonationImage(category?: DonationCategory): string {
  switch (category) {
    case 'Food':
      return STATIC_IMAGES.preparedMeals;
    case 'Clothing & Warmth':
    case 'Education & Children':
      return STATIC_IMAGES.essentialsKit;
    case 'Household & Daily Needs':
      return STATIC_IMAGES.about;
    default:
      return STATIC_IMAGES.freshProduce;
  }
}

/**
 * Normalizes legacy `/src/assets/images/...` development paths (including those
 * previously persisted in Supabase rows) to Vercel/Vite production `/images/...`
 * public assets, while preserving `https://...`, `data:image/...`, and `/uploads/...`.
 */
export function resolveImageUrl(rawUrl?: string | null, fallbackUrl?: string): string {
  const value = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!value) {
    return fallbackUrl || '';
  }

  if (value.startsWith('data:image/') || value.startsWith('blob:')) {
    return value;
  }

  const legacyMatch =
    /(?:^|https?:\/\/[^/]+)\/?src\/assets\/images\/([^?#]+)(?:[?#].*)?$/i.exec(value);
  if (legacyMatch?.[1]) {
    return `/images/${legacyMatch[1]}`;
  }

  if (/^images\/[^?#]+$/i.test(value)) {
    return `/${value}`;
  }

  return value;
}
