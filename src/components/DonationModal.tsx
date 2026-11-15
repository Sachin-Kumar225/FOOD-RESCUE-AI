import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  FileText,
  ImagePlus,
  Loader2,
  ShieldAlert,
  Upload,
  X,
} from 'lucide-react';
import {
  aiCategorizeDonationPhoto,
  aiExtractDonationDetails,
  aiGenerateDonationDescription,
  saveDonationListing,
  uploadImageAsset,
} from '../lib/dataService.ts';
import { PhotoEditorModal, PRESET_GALLERY_PHOTOS } from './PhotoEditorModal.tsx';
import {
  CATEGORY_SUBCATEGORIES,
  DONATION_CATEGORIES,
  type Donation,
  type DonationCategory,
  type FoodType,
  type StorageCondition,
} from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface DonationModalProps {
  isOpen: boolean;
  editingDonation: Donation | null;
  onClose: () => void;
  onSaved: (donation: Donation) => void;
}

function toLocalDateTimeInput(iso?: string, defaultOffsetHours = 6): string {
  const date = iso ? new Date(iso) : new Date(Date.now() + defaultOffsetHours * 60 * 60 * 1000);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function DonationModal({
  isOpen,
  editingDonation,
  onClose,
  onSaved,
}: DonationModalProps) {
  const { user } = useAuth();

  const [quickText, setQuickText] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DonationCategory>('Food');
  const [subCategory, setSubCategory] = useState('Prepared Meals');
  const [quantityValue, setQuantityValue] = useState('25');
  const [quantityUnit, setQuantityUnit] = useState('meals');
  const [city, setCity] = useState(user?.city || 'Bengaluru');
  const [location, setLocation] = useState(user?.address || '');
  const [availableUntil, setAvailableUntil] = useState(
    toLocalDateTimeInput(new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString())
  );
  const [imageUrl, setImageUrl] = useState('');
  const [previewDataUrl, setPreviewDataUrl] = useState('');

  // Food-specific fields
  const [foodType, setFoodType] = useState<FoodType>('prepared_meals');
  const [storageCondition, setStorageCondition] = useState<StorageCondition>('Refrigerated');
  const [preparedAt, setPreparedAt] = useState(
    toLocalDateTimeInput(new Date(Date.now() - 60 * 60 * 1000).toISOString())
  );
  const [expiresAt, setExpiresAt] = useState(
    toLocalDateTimeInput(new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString())
  );
  const [allergens, setAllergens] = useState('');
  const [packagingSealed, setPackagingSealed] = useState(true);

  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState('');
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setAiNote('');
    setQuickText('');
    setPreviewDataUrl('');

    if (editingDonation) {
      setTitle(editingDonation.title);
      setDescription(editingDonation.description);
      setCategory(editingDonation.category);
      setSubCategory(editingDonation.subCategory);
      setQuantityValue(String(editingDonation.quantityValue));
      setQuantityUnit(editingDonation.quantityUnit);
      setCity(editingDonation.city);
      setLocation(editingDonation.location);
      setAvailableUntil(toLocalDateTimeInput(editingDonation.availableUntil));
      setImageUrl(editingDonation.imageUrl);
      if (editingDonation.foodDetails) {
        setFoodType(editingDonation.foodDetails.foodType);
        setStorageCondition(editingDonation.foodDetails.storageCondition);
        setPreparedAt(toLocalDateTimeInput(editingDonation.foodDetails.preparedAt, -1));
        setExpiresAt(toLocalDateTimeInput(editingDonation.foodDetails.expiresAt, 6));
        setAllergens(editingDonation.foodDetails.allergens || '');
        setPackagingSealed(editingDonation.foodDetails.packagingSealed);
      }
    } else {
      setTitle('');
      setDescription('');
      setCategory('Food');
      setSubCategory('Prepared Meals');
      setQuantityValue('25');
      setQuantityUnit('meals');
      setCity(user?.city || 'Bengaluru');
      setLocation(user?.address || '');
      setAvailableUntil(
        toLocalDateTimeInput(new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString())
      );
      setImageUrl('');
      setFoodType('prepared_meals');
      setStorageCondition('Refrigerated');
      setPreparedAt(toLocalDateTimeInput(new Date(Date.now() - 60 * 60 * 1000).toISOString()));
      setExpiresAt(toLocalDateTimeInput(new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()));
      setAllergens('');
      setPackagingSealed(true);
    }
  }, [isOpen, editingDonation, user]);

  if (!isOpen) return null;

  const handleCategoryChange = (next: DonationCategory) => {
    setCategory(next);
    setSubCategory(CATEGORY_SUBCATEGORIES[next][0]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 4.5 * 1024 * 1024) {
      setError('Image must be smaller than 4.5 MB.');
      return;
    }
    const previousPreview = previewDataUrl;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      setPreviewDataUrl(dataUrl);
      setError('');
      setAiBusy('upload');
      try {
        const uploadedUrl = await uploadImageAsset(dataUrl, file.name);
        setImageUrl(uploadedUrl);
      } catch (err) {
        setPreviewDataUrl(previousPreview);
        setError(err instanceof Error ? err.message : 'Image upload failed.');
      } finally {
        setAiBusy(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAiCategorizeImage = async () => {
    if (!previewDataUrl) {
      setError('Please upload an item photo first to run AI image categorization.');
      return;
    }
    setAiBusy('image');
    setError('');
    try {
      const res = await aiCategorizeDonationPhoto(previewDataUrl);
      setCategory(res.category);
      setSubCategory(res.subCategory);
      if (!title.trim()) setTitle(res.suggestedTitle);
      if (res.suggestedUnit) setQuantityUnit(res.suggestedUnit);
      setAiNote(res.confidenceNote);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI image categorization unavailable.');
    } finally {
      setAiBusy(null);
    }
  };

  const handleAiExtractText = async () => {
    if (!quickText.trim()) {
      setError('Enter a short note describing your surplus items first.');
      return;
    }
    setAiBusy('extract');
    setError('');
    try {
      const res = await aiExtractDonationDetails(quickText);
      setTitle(res.title);
      setCategory(res.category);
      setSubCategory(res.subCategory);
      setQuantityValue(String(res.quantityValue));
      setQuantityUnit(res.quantityUnit);
      if (res.city) setCity(res.city);
      if (res.location) setLocation(res.location);
      if (res.foodType) setFoodType(res.foodType);
      if (res.storageCondition) setStorageCondition(res.storageCondition);
      if (res.allergens) setAllergens(res.allergens);
      if (typeof res.packagingSealed === 'boolean') setPackagingSealed(res.packagingSealed);
      setAiNote(res.extractionNotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI extraction unavailable.');
    } finally {
      setAiBusy(null);
    }
  };

  const handleAiGenerateDescription = async () => {
    if (!title.trim()) {
      setError('Enter an item title before generating a description.');
      return;
    }
    setAiBusy('describe');
    setError('');
    try {
      const res = await aiGenerateDonationDescription({
        title,
        category,
        subCategory,
        quantityValue: Number(quantityValue),
        quantityUnit,
        city,
        notes: quickText || undefined,
      });
      setDescription(res.description);
      setAiNote(
        res.aiPowered
          ? 'Description drafted with Gemini AI. Review details before publishing.'
          : 'Description drafted using structured template (Gemini key not set).'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate description.');
    } finally {
      setAiBusy(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || aiBusy === 'upload') return;
    setError('');

    const qty = Number(quantityValue);
    if (
      !title.trim() ||
      !description.trim() ||
      !location.trim() ||
      !city.trim() ||
      !quantityUnit.trim() ||
      !Number.isFinite(qty) ||
      qty <= 0
    ) {
      setError('Please complete all required listing fields.');
      return;
    }

    if (category === 'Food' && foodType === 'prepared_meals' && preparedAt) {
      const preparedMs = new Date(preparedAt).getTime();
      if (!Number.isNaN(preparedMs) && preparedMs > Date.now() + 5 * 60 * 1000) {
        setError('Prepared At timestamp cannot be in the future.');
        return;
      }
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      subCategory,
      quantityValue: qty,
      quantityUnit: quantityUnit.trim(),
      city: city.trim(),
      location: location.trim(),
      availableUntil: availableUntil ? new Date(availableUntil).toISOString() : undefined,
      imageUrl: imageUrl || undefined,
      foodDetails:
        category === 'Food'
          ? {
              foodType,
              storageCondition,
              preparedAt:
                foodType === 'prepared_meals' && preparedAt
                  ? new Date(preparedAt).toISOString()
                  : undefined,
              expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
              allergens: allergens.trim() || 'None declared',
              packagingSealed,
              dietaryTags: [],
            }
          : undefined,
    };

    if (!user) {
      setError('Please sign in to publish a donation.');
      return;
    }
    if (user.role !== 'donor' && user.role !== 'admin') {
      setError('Only Donor or Administrator accounts can publish donation listings.');
      return;
    }

    setSubmitting(true);
    try {
      const saved = await saveDonationListing(editingDonation?.id || null, payload, user);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save donation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-emerald-950/15 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-emerald-950/10 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#0F1F17]">
              {editingDonation ? 'Edit Donation Listing' : 'Create Surplus Donation'}
            </h2>
            <p className="text-xs text-[#47554E]">
              Include accurate quantity, pickup window, and mandatory safety details.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-lg text-[#47554E] hover:bg-emerald-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* AI Text Extractor */}
          {!editingDonation && (
            <div className="p-4 rounded-lg bg-[#F8FAF9] border border-emerald-950/10 space-y-2.5">
              <label className="block text-xs font-semibold text-[#0F1F17]">
                Quick Fill from Natural Language (Gemini AI)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  placeholder='e.g. "30 sealed vegetarian lunch boxes at MG Road Bengaluru ready until 6 PM"'
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
                <button
                  type="button"
                  onClick={handleAiExtractText}
                  disabled={aiBusy !== null}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-700/20 hover:bg-emerald-100 whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  {aiBusy === 'extract' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span>Extract Details</span>
                </button>
              </div>
            </div>
          )}

          {aiNote && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-700/20 text-xs text-emerald-950 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>{aiNote}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Photo upload + editor + AI image categorization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#0F1F17]">
                Donation Photo (Editable)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-emerald-950/15 bg-white hover:bg-emerald-50 cursor-pointer">
                  <Upload className="w-4 h-4 text-emerald-700" />
                  <span>{aiBusy === 'upload' ? 'Uploading...' : 'Upload Image'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setPhotoEditorOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-emerald-950/15 bg-white hover:bg-emerald-50"
                >
                  <ImagePlus className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Edit / Crop Photo</span>
                </button>

                {previewDataUrl && (
                  <button
                    type="button"
                    onClick={handleAiCategorizeImage}
                    disabled={aiBusy !== null}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-700/20 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {aiBusy === 'image' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                    <span>Categorize Photo</span>
                  </button>
                )}
              </div>
            </div>

            {(previewDataUrl || imageUrl) && (
              <div className="relative h-24 rounded-lg overflow-hidden border border-emerald-950/10 bg-[#F8FAF9]">
                <img
                  src={previewDataUrl || imageUrl}
                  alt="Donation preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as DonationCategory)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                {DONATION_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
                Sub-Category *
              </label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                {CATEGORY_SUBCATEGORIES[category].map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
              Listing Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 40 Sealed Vegetarian Lunch Bowls"
              className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#0F1F17]">
                Description *
              </label>
              <button
                type="button"
                onClick={handleAiGenerateDescription}
                disabled={aiBusy !== null}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2 disabled:opacity-50"
              >
                {aiBusy === 'describe' ? 'Drafting...' : 'Draft with Gemini AI'}
              </button>
            </div>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe item condition, packaging, serving notes, or pickup instructions..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min={1}
                required
                value={quantityValue}
                onChange={(e) => setQuantityValue(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
                Unit *
              </label>
              <input
                type="text"
                required
                value={quantityUnit}
                onChange={(e) => setQuantityUnit(e.target.value)}
                placeholder="meals / kg / boxes"
                className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1F17] mb-1">City *</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
                Available Until *
              </label>
              <input
                type="datetime-local"
                required
                value={availableUntil}
                onChange={(e) => setAvailableUntil(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
              Pickup Street Address *
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Street, building, or kitchen entrance details"
              className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          {/* Deterministic Food Safety Section */}
          {category === 'Food' && (
            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 space-y-4">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#0F1F17]">
                    Mandatory Food Eligibility & Safety Details
                  </p>
                  <p className="text-xs text-[#47554E] mt-0.5">
                    Deterministic rules verify expiry and storage data. AI never certifies food as
                    safe; all prepared meals require human inspection at pickup.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#0F1F17] mb-1">
                    Food Type
                  </label>
                  <select
                    value={foodType}
                    onChange={(e) => setFoodType(e.target.value as FoodType)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white"
                  >
                    <option value="prepared_meals">Prepared Meals</option>
                    <option value="packaged_food">Packaged Food</option>
                    <option value="groceries">Groceries & Staples</option>
                    <option value="fruits_vegetables">Fruits & Vegetables</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#0F1F17] mb-1">
                    Storage Condition
                  </label>
                  <select
                    value={storageCondition}
                    onChange={(e) => setStorageCondition(e.target.value as StorageCondition)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white"
                  >
                    <option value="Hot">Hot (&gt; 60°C)</option>
                    <option value="Refrigerated">Refrigerated (0–5°C)</option>
                    <option value="Frozen">Frozen</option>
                    <option value="Ambient">Ambient / Room Temp</option>
                  </select>
                </div>

                {foodType === 'prepared_meals' && (
                  <div>
                    <label className="block text-xs font-medium text-[#0F1F17] mb-1">
                      Prepared At
                    </label>
                    <input
                      type="datetime-local"
                      value={preparedAt}
                      onChange={(e) => setPreparedAt(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[#0F1F17] mb-1">
                    Consume By / Expiry *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-medium text-[#0F1F17] mb-1">
                    Declared Allergens
                  </label>
                  <input
                    type="text"
                    value={allergens}
                    onChange={(e) => setAllergens(e.target.value)}
                    placeholder="e.g. Nuts, Dairy, Wheat, or None"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-medium text-[#0F1F17] pt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={packagingSealed}
                    onChange={(e) => setPackagingSealed(e.target.checked)}
                    className="w-4 h-4 accent-emerald-700 rounded"
                  />
                  <span>Packaging is sealed / tamper-evident</span>
                </label>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-emerald-950/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-emerald-950/15 text-[#0F1F17] hover:bg-emerald-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || aiBusy === 'upload'}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {(submitting || aiBusy === 'upload') && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {aiBusy === 'upload'
                  ? 'Uploading Photo...'
                  : editingDonation
                    ? 'Save Changes'
                    : 'Publish Donation'}
              </span>
            </button>
          </div>
        </form>
      </div>

      <PhotoEditorModal
        isOpen={photoEditorOpen}
        title={title.trim() || 'Donation Listing'}
        initialUrl={previewDataUrl || imageUrl || PRESET_GALLERY_PHOTOS[2].url}
        onClose={() => setPhotoEditorOpen(false)}
        onSave={({ url, dataUrl }) => {
          setImageUrl(url);
          setPreviewDataUrl(dataUrl);
        }}
      />
    </div>
  );
}
