import { GoogleGenAI, Type } from '@google/genai';
import type {
  DonationCategory,
  NgoMatchSuggestion,
  NgoNeed,
  Organisation,
} from '../src/types.ts';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim().length < 10) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function isGeminiConfigured(): boolean {
  return getGeminiClient() !== null;
}

function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenced ? fenced[1].trim() : trimmed;
}

export function extractReadableAiError(err: unknown, fallback = 'AI service request failed.'): string {
  const raw = err instanceof Error ? err.message : String(err || '');
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    const inner = parsed?.error?.message || parsed?.message;
    if (typeof inner === 'string' && inner.trim()) return inner.trim();
  } catch {
    // Not raw JSON
  }
  return raw;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s.`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isTransientAiError(err: unknown): boolean {
  const msg = extractReadableAiError(err, '').toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit')
  );
}

async function withAiRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; timeoutMs?: number; label?: string } = {}
): Promise<T> {
  const { retries = 1, timeoutMs = 5500, label = 'AI request' } = options;
  try {
    return await withTimeout(fn(), timeoutMs, label);
  } catch (err) {
    if (retries > 0 && isTransientAiError(err)) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return withAiRetry(fn, { retries: retries - 1, timeoutMs, label });
    }
    throw new Error(extractReadableAiError(err));
  }
}

function buildFallbackDescription(input: {
  title: string;
  category: DonationCategory;
  subCategory?: string;
  quantityValue?: number;
  quantityUnit?: string;
  city?: string;
  notes?: string;
}): string {
  const qty = input.quantityValue
    ? `${input.quantityValue} ${input.quantityUnit || 'units'}`
    : 'surplus items';
  return `${qty} of ${input.title} (${input.category}${input.subCategory ? ` — ${input.subCategory}` : ''}) available for community pickup in ${input.city || 'your area'}. ${input.notes ? input.notes : 'Prepared and organized for verified NGO collection.'}`;
}

export async function generateDonationDescription(input: {
  title: string;
  category: DonationCategory;
  subCategory?: string;
  quantityValue?: number;
  quantityUnit?: string;
  city?: string;
  notes?: string;
}): Promise<{ description: string; aiPowered: boolean }> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      description: buildFallbackDescription(input),
      aiPowered: false,
    };
  }

  const prompt = `Write a clear, concise, factual 2-3 sentence donation listing description for a food & essentials rescue platform.
Item title: ${input.title}
Category: ${input.category} (${input.subCategory || 'General'})
Quantity: ${input.quantityValue ?? 'Unspecified'} ${input.quantityUnit || ''}
City: ${input.city || 'Unspecified'}
Donor notes: ${input.notes || 'None'}

Rules:
- Be practical and informative for NGO coordinators and volunteer drivers.
- Never claim or certify that food is "guaranteed safe" or "inspected".
- Keep it under 55 words, plain prose without bullet points or hashtags.`;

  try {
    const response = await withAiRetry(
      () =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
        }),
      { retries: 0, timeoutMs: 5500, label: 'AI description generation' }
    );

    const text = (response.text || '').trim();
    if (!text) {
      return {
        description: buildFallbackDescription(input),
        aiPowered: false,
      };
    }

    return {
      description: text,
      aiPowered: true,
    };
  } catch {
    return {
      description: buildFallbackDescription(input),
      aiPowered: false,
    };
  }
}

export async function categorizeDonationImage(input: {
  base64Data: string;
  mimeType: string;
}): Promise<{
  category: DonationCategory;
  subCategory: string;
  suggestedTitle: string;
  suggestedUnit: string;
  requiresHumanFoodInspection: boolean;
  confidenceNote: string;
  aiPowered: boolean;
}> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const normalizedMimeType =
    input.mimeType === 'image/jpg' ? 'image/jpeg' : input.mimeType;

  const response = await withAiRetry(
    () =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: normalizedMimeType,
                data: input.base64Data,
              },
            },
            {
              text: `Inspect this donation photo and classify it into exactly one of these four categories:
- "Food"
- "Clothing & Warmth"
- "Education & Children"
- "Household & Daily Needs"

Never certify food safety from the photo. If the item is Food, set requiresHumanFoodInspection to true and state clearly in confidenceNote that physical food-safety inspection is required.`,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description:
                  'Must be one of: Food, Clothing & Warmth, Education & Children, Household & Daily Needs',
              },
              subCategory: { type: Type.STRING },
              suggestedTitle: { type: Type.STRING },
              suggestedUnit: { type: Type.STRING },
              requiresHumanFoodInspection: { type: Type.BOOLEAN },
              confidenceNote: { type: Type.STRING },
            },
            required: [
              'category',
              'subCategory',
              'suggestedTitle',
              'suggestedUnit',
              'requiresHumanFoodInspection',
              'confidenceNote',
            ],
          },
        },
      }),
    { retries: 1, timeoutMs: 11000, label: 'AI image categorization' }
  );

  const raw = stripJsonFences(response.text || '{}');
  const parsed = JSON.parse(raw);

  const allowedCategories: DonationCategory[] = [
    'Food',
    'Clothing & Warmth',
    'Education & Children',
    'Household & Daily Needs',
  ];
  const validCategory = allowedCategories.includes(parsed.category)
    ? (parsed.category as DonationCategory)
    : 'Food';

  return {
    category: validCategory,
    subCategory: String(parsed.subCategory || 'General'),
    suggestedTitle: String(parsed.suggestedTitle || 'Surplus Donation Item'),
    suggestedUnit: String(parsed.suggestedUnit || 'units'),
    requiresHumanFoodInspection:
      validCategory === 'Food' ? true : Boolean(parsed.requiresHumanFoodInspection),
    confidenceNote: String(
      parsed.confidenceNote ||
        'AI visual suggestion only — verify item condition and food safety manually.'
    ),
    aiPowered: true,
  };
}

const KNOWN_CITIES = [
  'Kolkata',
  'Delhi',
  'Mumbai',
  'Bengaluru',
  'Chennai',
  'Hyderabad',
  'Pune',
  'Lucknow',
  'Patna',
  'Jaipur',
  'Ahmedabad',
  'Bhopal',
  'Ranchi',
  'Bhubaneswar',
  'Guwahati',
  'Varanasi',
  'Kanpur',
  'Surat',
  'Indore',
];

function buildFallbackExtractedDetails(rawText: string): {
  title: string;
  category: DonationCategory;
  subCategory: string;
  quantityValue: number;
  quantityUnit: string;
  city: string;
  location: string;
  foodType?: 'prepared_meals' | 'packaged_food' | 'groceries' | 'fruits_vegetables';
  storageCondition?: 'Hot' | 'Refrigerated' | 'Frozen' | 'Ambient';
  allergens?: string;
  packagingSealed?: boolean;
  extractionNotes: string;
  aiPowered: boolean;
} {
  const lower = rawText.toLowerCase();

  let category: DonationCategory = 'Food';
  let subCategory = 'Surplus Food';

  if (/\b(blanket|jacket|sweater|coat|cloth|apparel|shawl|saree|wool|warmth|shirt|winter)\b/.test(lower)) {
    category = 'Clothing & Warmth';
    subCategory = 'Warm Clothing & Blankets';
  } else if (/\b(book|notebook|stationery|school|backpack|uniform|pen|pencil|toy|study)\b/.test(lower)) {
    category = 'Education & Children';
    subCategory = 'School Supplies & Books';
  } else if (/\b(hygiene|soap|mattress|utensil|bucket|sanitary|detergent|bedsheet|household|towel)\b/.test(lower)) {
    category = 'Household & Daily Needs';
    subCategory = 'Household & Hygiene Kits';
  }

  let foodType: 'prepared_meals' | 'packaged_food' | 'groceries' | 'fruits_vegetables' | undefined;
  let storageCondition: 'Hot' | 'Refrigerated' | 'Frozen' | 'Ambient' | undefined;

  if (category === 'Food') {
    if (/\b(packaged|sealed|biscuit|canned|carton|bottle|tetrapack|dry ration|snack)\b/.test(lower)) {
      foodType = 'packaged_food';
    } else if (/\b(rice|dal|lentil|flour|atta|oil|grain|sugar|wheat|grocery|groceries|pulses)\b/.test(lower)) {
      foodType = 'groceries';
    } else if (/\b(fruit|vegetable|produce|banana|apple|tomato|potato|onion|greens)\b/.test(lower)) {
      foodType = 'fruits_vegetables';
    } else {
      foodType = 'prepared_meals';
    }

    if (/\b(hot|warm|freshly cooked)\b/.test(lower)) {
      storageCondition = 'Hot';
    } else if (/\b(frozen|deep freeze)\b/.test(lower)) {
      storageCondition = 'Frozen';
    } else if (/\b(refrigerated|chilled|cold|fridge)\b/.test(lower)) {
      storageCondition = 'Refrigerated';
    } else {
      storageCondition = 'Ambient';
    }
  }

  const qtyMatch =
    /\b(\d+(?:\.\d+)?)\s*(packs?|packets?|boxes?|crates?|kg|kilograms?|g|liters?|litres?|meals?|servings?|plates?|bags?|sets?|pairs?|kits?|units?|items?|blankets?|books?)?\b/i.exec(
      rawText
    );
  const quantityValue = qtyMatch && Number(qtyMatch[1]) > 0 ? Number(qtyMatch[1]) : 10;
  const quantityUnit = qtyMatch?.[2] ? qtyMatch[2].toLowerCase() : category === 'Food' ? 'meals' : 'units';

  let city = '';
  if (/\bbangalore\b/i.test(rawText)) {
    city = 'Bengaluru';
  } else if (/\bnew delhi\b/i.test(rawText)) {
    city = 'Delhi';
  } else {
    for (const candidate of KNOWN_CITIES) {
      if (new RegExp(`\\b${candidate}\\b`, 'i').test(rawText)) {
        city = candidate;
        break;
      }
    }
  }

  const locationMatch = /\b(?:at|from|near)\s+([^.,;]+(?:\s+[^.,;]+){0,5})/i.exec(rawText);
  const location = locationMatch ? locationMatch[1].trim() : city ? `${city} pickup point` : '';

  const packagingSealed = !/\b(unsealed|open|opened|loose)\b/i.test(rawText);
  const cleanTitle = rawText.trim().replace(/\s+/g, ' ').slice(0, 72);

  return {
    title: cleanTitle || 'Surplus Donation Item',
    category,
    subCategory,
    quantityValue,
    quantityUnit,
    city,
    location,
    foodType,
    storageCondition,
    packagingSealed,
    extractionNotes:
      'Extracted using local structured parser while Gemini AI was busy — please review fields and confirm safety details before publishing.',
    aiPowered: false,
  };
}

export async function extractDonationDetailsFromText(rawText: string): Promise<{
  title: string;
  category: DonationCategory;
  subCategory: string;
  quantityValue: number;
  quantityUnit: string;
  city: string;
  location: string;
  foodType?: 'prepared_meals' | 'packaged_food' | 'groceries' | 'fruits_vegetables';
  storageCondition?: 'Hot' | 'Refrigerated' | 'Frozen' | 'Ambient';
  allergens?: string;
  packagingSealed?: boolean;
  extractionNotes: string;
  aiPowered: boolean;
}> {
  const ai = getGeminiClient();
  if (!ai) {
    return buildFallbackExtractedDetails(rawText);
  }

  try {
    const response = await withAiRetry(
      () =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Extract structured donation listing fields from the following donor message.
Message: "${rawText}"

Allowed categories: "Food", "Clothing & Warmth", "Education & Children", "Household & Daily Needs".
Allowed foodType (only if Food): "prepared_meals", "packaged_food", "groceries", "fruits_vegetables".
Allowed storageCondition (only if Food): "Hot", "Refrigerated", "Frozen", "Ambient".
Never certify food as safe.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                category: { type: Type.STRING },
                subCategory: { type: Type.STRING },
                quantityValue: { type: Type.NUMBER },
                quantityUnit: { type: Type.STRING },
                city: { type: Type.STRING },
                location: { type: Type.STRING },
                foodType: { type: Type.STRING },
                storageCondition: { type: Type.STRING },
                allergens: { type: Type.STRING },
                packagingSealed: { type: Type.BOOLEAN },
                extractionNotes: { type: Type.STRING },
              },
              required: [
                'title',
                'category',
                'subCategory',
                'quantityValue',
                'quantityUnit',
                'extractionNotes',
              ],
            },
          },
        }),
      { retries: 0, timeoutMs: 5500, label: 'AI detail extraction' }
    );

    const parsed = JSON.parse(stripJsonFences(response.text || '{}'));
    const allowedCategories: DonationCategory[] = [
      'Food',
      'Clothing & Warmth',
      'Education & Children',
      'Household & Daily Needs',
    ];
    const category = allowedCategories.includes(parsed.category)
      ? (parsed.category as DonationCategory)
      : 'Food';

    return {
      title: String(parsed.title || rawText.slice(0, 60)),
      category,
      subCategory: String(parsed.subCategory || 'General'),
      quantityValue: Number(parsed.quantityValue) > 0 ? Number(parsed.quantityValue) : 10,
      quantityUnit: String(parsed.quantityUnit || 'units'),
      city: String(parsed.city || ''),
      location: String(parsed.location || ''),
      foodType:
        category === 'Food'
          ? (['prepared_meals', 'packaged_food', 'groceries', 'fruits_vegetables'].includes(
              parsed.foodType
            )
              ? parsed.foodType
              : 'prepared_meals')
          : undefined,
      storageCondition:
        category === 'Food'
          ? (['Hot', 'Refrigerated', 'Frozen', 'Ambient'].includes(parsed.storageCondition)
              ? parsed.storageCondition
              : 'Ambient')
          : undefined,
      allergens: parsed.allergens ? String(parsed.allergens) : undefined,
      packagingSealed:
        typeof parsed.packagingSealed === 'boolean' ? parsed.packagingSealed : true,
      extractionNotes: String(
        parsed.extractionNotes ||
          'Extracted via Gemini. Please confirm expiry time and safety fields before publishing.'
      ),
      aiPowered: true,
    };
  } catch {
    return buildFallbackExtractedDetails(rawText);
  }
}

export async function matchNgosForDonation(input: {
  donation: {
    title: string;
    category: DonationCategory;
    quantityValue: number;
    quantityUnit: string;
    city: string;
    description: string;
  };
  organisations: Organisation[];
  needs: NgoNeed[];
}): Promise<NgoMatchSuggestion[]> {
  const verifiedOrgs = input.organisations.filter((o) => o.verificationStatus === 'verified');
  if (verifiedOrgs.length === 0) return [];

  const ai = getGeminiClient();
  if (!ai) {
    return deterministicNgoMatch(input.donation, verifiedOrgs, input.needs);
  }

  try {
    const context = verifiedOrgs.map((org) => {
      const orgNeeds = input.needs.filter((n) => n.orgId === org.id && n.active);
      return {
        orgId: org.id,
        orgName: org.name,
        orgType: org.type,
        city: org.city,
        capacityNote: org.capacityNote,
        publishedNeeds: orgNeeds.map((n) => ({
          title: n.title,
          category: n.category,
          quantityNeeded: `${n.quantityNeeded} ${n.unit}`,
          urgency: n.urgency,
        })),
      };
    });

    const response = await withAiRetry(
      () =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Rank the verified NGOs below for suitability to receive this donation based on category alignment, city proximity, quantity capacity, and published needs. Explain clearly WHY each NGO is a suitable match.

Donation:
${JSON.stringify(input.donation)}

Verified NGOs & Published Needs:
${JSON.stringify(context)}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  orgId: { type: Type.STRING },
                  matchScore: { type: Type.NUMBER },
                  matchedNeeds: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  whySuitable: { type: Type.STRING },
                },
                required: ['orgId', 'matchScore', 'matchedNeeds', 'whySuitable'],
              },
            },
          },
        }),
      { retries: 0, timeoutMs: 5500, label: 'AI NGO matching' }
    );

    const parsed = JSON.parse(stripJsonFences(response.text || '[]')) as Array<{
      orgId: string;
      matchScore: number;
      matchedNeeds: string[];
      whySuitable: string;
    }>;

    const results: NgoMatchSuggestion[] = [];
    for (const item of parsed) {
      const org = verifiedOrgs.find((o) => o.id === item.orgId);
      if (!org) continue;
      results.push({
        orgId: org.id,
        orgName: org.name,
        orgType: org.type,
        city: org.city,
        matchScore: Math.max(1, Math.min(99, Math.round(item.matchScore))),
        matchedNeeds: Array.isArray(item.matchedNeeds) ? item.matchedNeeds : [],
        whySuitable: item.whySuitable,
        aiPowered: true,
      });
    }

    if (results.length > 0) {
      return results.sort((a, b) => b.matchScore - a.matchScore);
    }
    return deterministicNgoMatch(input.donation, verifiedOrgs, input.needs);
  } catch {
    return deterministicNgoMatch(input.donation, verifiedOrgs, input.needs);
  }
}

function deterministicNgoMatch(
  donation: {
    category: DonationCategory;
    city: string;
    quantityValue: number;
    quantityUnit: string;
  },
  verifiedOrgs: Organisation[],
  needs: NgoNeed[]
): NgoMatchSuggestion[] {
  return verifiedOrgs
    .map((org) => {
      const orgNeeds = needs.filter((n) => n.orgId === org.id && n.active);
      const categoryNeeds = orgNeeds.filter((n) => n.category === donation.category);
      const sameCity = org.city.toLowerCase() === donation.city.toLowerCase();

      let score = 45;
      const reasons: string[] = [];

      if (sameCity) {
        score += 25;
        reasons.push(`Located in ${org.city}, enabling fast local pickup`);
      }
      if (categoryNeeds.length > 0) {
        score += 25;
        const urgent = categoryNeeds.some((n) => n.urgency === 'Urgent');
        if (urgent) score += 4;
        reasons.push(
          `Actively requested "${categoryNeeds[0].title}" (${categoryNeeds[0].urgency} priority)`
        );
      } else {
        reasons.push(`Verified ${org.type} capable of receiving ${donation.category} supplies`);
      }

      return {
        orgId: org.id,
        orgName: org.name,
        orgType: org.type,
        city: org.city,
        matchScore: Math.min(99, score),
        matchedNeeds: categoryNeeds.map((n) => n.title),
        whySuitable: `${reasons.join('. ')}. ${org.capacityNote}`,
        aiPowered: false,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}
