import type { DonationCategory, FoodDetails, SafetyEligibility } from '../src/types.ts';

const SAFETY_DISCLAIMER =
  'Advisory check only — AI never certifies food as safe. All perishable and prepared food requires physical inspection and human verification before distribution.';

export function evaluateFoodSafetyEligibility(
  category: DonationCategory,
  foodDetails?: FoodDetails,
  availableUntil?: string
): SafetyEligibility {
  const checkedAt = new Date().toISOString();

  if (category !== 'Food') {
    return {
      eligible: true,
      requiresHumanReview: false,
      reasons: ['Non-food essential item; standard quality check at pickup applies.'],
      disclaimer:
        'Items should be clean, intact, and suitable for community distribution.',
      checkedAt,
    };
  }

  const reasons: string[] = [];
  let eligible = true;
  let requiresHumanReview = false;

  if (!foodDetails) {
    return {
      eligible: false,
      requiresHumanReview: true,
      reasons: [
        'Missing required food safety metadata (food type, storage condition, packaging status, and expiry window).',
      ],
      disclaimer: SAFETY_DISCLAIMER,
      checkedAt,
    };
  }

  if (!foodDetails.packagingSealed) {
    requiresHumanReview = true;
    reasons.push('Unsealed packaging reported — requires mandatory human food-safety inspection before handoff.');
  }

  const now = Date.now();

  if (foodDetails.expiresAt) {
    const expiryMs = new Date(foodDetails.expiresAt).getTime();
    if (Number.isNaN(expiryMs)) {
      requiresHumanReview = true;
      reasons.push('Invalid expiry date/time format — requires human verification.');
    } else if (expiryMs <= now) {
      eligible = false;
      requiresHumanReview = true;
      reasons.push('Item is past its stated expiry or best-before timestamp and cannot be listed.');
    } else if (expiryMs - now < 2 * 60 * 60 * 1000) {
      requiresHumanReview = true;
      reasons.push('Expires in under 2 hours — immediate dispatch and human inspection required.');
    }
  } else if (foodDetails.foodType === 'prepared_meals' || foodDetails.foodType === 'packaged_food') {
    requiresHumanReview = true;
    reasons.push('Expiry / consume-by timestamp not provided — human verification required.');
  }

  if (foodDetails.foodType === 'prepared_meals') {
    requiresHumanReview = true;
    reasons.push('Prepared meals always require temperature and hygiene verification by the receiving NGO or volunteer.');

    if (!foodDetails.preparedAt) {
      reasons.push('Missing preparation timestamp for cooked/prepared meal.');
    } else {
      const preparedMs = new Date(foodDetails.preparedAt).getTime();
      if (!Number.isNaN(preparedMs)) {
        const hoursSincePrepared = (now - preparedMs) / (1000 * 60 * 60);
        if (hoursSincePrepared > 6 && foodDetails.storageCondition === 'Ambient') {
          eligible = false;
          reasons.push('Prepared food stored at ambient temperature for over 6 hours is ineligible for rescue.');
        } else if (hoursSincePrepared > 4 && foodDetails.storageCondition !== 'Frozen') {
          reasons.push('Prepared more than 4 hours ago — prioritize temperature check before distribution.');
        }
      }
    }
  }

  if (availableUntil) {
    const untilMs = new Date(availableUntil).getTime();
    if (!Number.isNaN(untilMs) && untilMs <= now) {
      eligible = false;
      requiresHumanReview = true;
      reasons.push('Pickup availability window has already ended.');
    }
  }

  if (reasons.length === 0) {
    reasons.push('All required deterministic food fields provided; standard intake inspection still applies.');
  }

  return {
    eligible,
    requiresHumanReview,
    reasons,
    disclaimer: SAFETY_DISCLAIMER,
    checkedAt,
  };
}
