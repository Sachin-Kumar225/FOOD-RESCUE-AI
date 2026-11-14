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
    const qty = input.quantityValue ? `${input.quantityValue} ${input.quantityUnit || 'units'}` : 'surplus items';
    return {
      description: `${qty} of ${input.title} (${input.category}${input.subCategory ? ` — ${input.subCategory}` : ''}) available for community pickup in ${input.city || 'your area'}. ${input.notes ? input.notes : 'Prepared and organized for verified NGO collection.'}`,
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

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
  });

  return {
    description: (response.text || '').trim(),
    aiPowered: true,
  };
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

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: input.mimeType,
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
  });

  const raw = (response.text || '{}').trim();
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
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const response = await ai.models.generateContent({
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
  });

  const parsed = JSON.parse((response.text || '{}').trim());
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

    const response = await ai.models.generateContent({
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
    });

    const parsed = JSON.parse((response.text || '[]').trim()) as Array<{
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
