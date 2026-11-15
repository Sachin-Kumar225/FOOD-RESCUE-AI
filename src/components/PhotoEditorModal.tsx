import React, { useEffect, useRef, useState } from 'react';
import {
  FlipHorizontal,
  FlipVertical,
  Loader2,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Upload,
  X,
} from 'lucide-react';
import { uploadImageAsset } from '../lib/dataService.ts';

export const PRESET_GALLERY_PHOTOS = [
  {
    label: 'Community Hub',
    url: '/src/assets/images/hero_food_rescue_1794669342092.jpg',
  },
  {
    label: 'Pantry Sorting',
    url: '/src/assets/images/about_community_hub_1794669343508.jpg',
  },
  {
    label: 'Prepared Meals',
    url: '/src/assets/images/donation_prepared_meals_1794669342712.jpg',
  },
  {
    label: 'Fresh Produce',
    url: '/src/assets/images/donation_fresh_produce_1794669343269.jpg',
  },
  {
    label: 'Warmth & Books',
    url: '/src/assets/images/donation_essentials_kit_1794669344223.jpg',
  },
];

type AspectChoice = 'original' | '16:9' | '4:3' | '1:1';

interface PhotoEditorModalProps {
  isOpen: boolean;
  title: string;
  initialUrl: string;
  onClose: () => void;
  onSave: (result: { url: string; dataUrl: string }) => Promise<void> | void;
}

export function PhotoEditorModal({
  isOpen,
  title,
  initialUrl,
  onClose,
  onSave,
}: PhotoEditorModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sourceUrl, setSourceUrl] = useState(initialUrl);
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState('');

  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [aspect, setAspect] = useState<AspectChoice>('original');
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSourceUrl(initialUrl || PRESET_GALLERY_PHOTOS[2].url);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setAspect('original');
    setZoom(1);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setLoadError('');
  }, [isOpen, initialUrl]);

  useEffect(() => {
    if (!isOpen || !sourceUrl) return;
    let cancelled = false;
    setLoadedImg(null);
    setLoadError('');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!cancelled) setLoadedImg(img);
    };
    img.onerror = () => {
      if (!cancelled) {
        setLoadedImg(null);
        setLoadError('Could not load this image for editing. Upload a file or choose a preset.');
      }
    };
    img.src = sourceUrl;
    return () => {
      cancelled = true;
    };
  }, [isOpen, sourceUrl]);

  useEffect(() => {
    if (!isOpen || !loadedImg || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const quarterTurns = ((rotation % 360) + 360) % 360;
    const swapped = quarterTurns === 90 || quarterTurns === 270;
    const orientedW = swapped ? loadedImg.naturalHeight : loadedImg.naturalWidth;
    const orientedH = swapped ? loadedImg.naturalWidth : loadedImg.naturalHeight;

    let targetRatio = orientedW / orientedH;
    if (aspect === '16:9') targetRatio = 16 / 9;
    if (aspect === '4:3') targetRatio = 4 / 3;
    if (aspect === '1:1') targetRatio = 1;

    const baseWidth = 960;
    const outW = baseWidth;
    const outH = Math.round(baseWidth / targetRatio);
    canvas.width = outW;
    canvas.height = outH;

    ctx.save();
    ctx.fillStyle = '#F8FAF9';
    ctx.fillRect(0, 0, outW, outH);

    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    const coverScale = Math.max(outW / orientedW, outH / orientedH) * zoom;
    ctx.translate(outW / 2, outH / 2);
    ctx.rotate((quarterTurns * Math.PI) / 180);
    ctx.scale(flipH ? -coverScale : coverScale, flipV ? -coverScale : coverScale);
    ctx.drawImage(
      loadedImg,
      -loadedImg.naturalWidth / 2,
      -loadedImg.naturalHeight / 2,
      loadedImg.naturalWidth,
      loadedImg.naturalHeight
    );
    ctx.restore();
  }, [isOpen, loadedImg, rotation, flipH, flipV, aspect, zoom, brightness, contrast, saturation]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setLoadError('Please select an image smaller than 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSourceUrl(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setAspect('original');
    setZoom(1);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  const handleSave = async () => {
    if (!canvasRef.current || !loadedImg || saving) return;
    setSaving(true);
    setLoadError('');
    try {
      let dataUrl: string;
      try {
        dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
      } catch {
        throw new Error(
          'This external image blocks canvas export due to CORS restrictions. Upload a local photo or choose a gallery preset instead.'
        );
      }
      const uploadedUrl = await uploadImageAsset(dataUrl, 'edited-photo.jpg');
      await onSave({ url: uploadedUrl, dataUrl });
      onClose();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to save edited photo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-emerald-950/15 rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-emerald-950/10 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#0F1F17]">
              Photo Editor — {title}
            </h2>
            <p className="text-xs text-[#47554E]">
              Upload a new photo, pick a gallery image, or crop, rotate, and adjust lighting.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close photo editor"
            className="p-2 rounded-lg text-[#47554E] hover:bg-emerald-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Canvas Preview */}
          <div className="lg:col-span-7 space-y-3">
            <div className="rounded-xl border border-emerald-950/10 bg-[#F8FAF9] overflow-hidden flex items-center justify-center min-h-[260px] max-h-[420px]">
              {loadError ? (
                <p className="text-sm text-red-700 p-6 text-center">{loadError}</p>
              ) : (
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[400px] w-auto h-auto object-contain"
                />
              )}
            </div>

            {/* Replace / Preset Picker */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-700/20 hover:bg-emerald-100 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload From Device</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-emerald-950/15 hover:bg-emerald-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Edits</span>
                </button>
              </div>

              <div>
                <p className="text-xs font-medium text-[#47554E] mb-1.5">
                  Or pick a project preset:
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_GALLERY_PHOTOS.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => setSourceUrl(preset.url)}
                      className={`rounded-lg overflow-hidden border text-left transition-colors ${
                        sourceUrl === preset.url
                          ? 'border-emerald-700 ring-2 ring-emerald-700/30'
                          : 'border-emerald-950/10 hover:border-emerald-700/40'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-12 object-cover"
                      />
                      <span className="block text-[10px] font-medium text-[#0F1F17] px-1.5 py-1 truncate">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="lg:col-span-5 space-y-5 bg-[#F8FAF9] border border-emerald-950/10 rounded-xl p-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#0F1F17]">Orientation &amp; Flip</p>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setRotation((r) => r - 90)}
                  className="flex flex-col items-center gap-1 py-2 px-2 rounded-lg border border-emerald-950/15 bg-white hover:bg-emerald-50 text-xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>-90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => r + 90)}
                  className="flex flex-col items-center gap-1 py-2 px-2 rounded-lg border border-emerald-950/15 bg-white hover:bg-emerald-50 text-xs"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>+90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlipH((f) => !f)}
                  className={`flex flex-col items-center gap-1 py-2 px-2 rounded-lg border text-xs ${
                    flipH
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                      : 'border-emerald-950/15 bg-white'
                  }`}
                >
                  <FlipHorizontal className="w-4 h-4" />
                  <span>Flip H</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlipV((f) => !f)}
                  className={`flex flex-col items-center gap-1 py-2 px-2 rounded-lg border text-xs ${
                    flipV
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                      : 'border-emerald-950/15 bg-white'
                  }`}
                >
                  <FlipVertical className="w-4 h-4" />
                  <span>Flip V</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#0F1F17]">Crop Aspect Ratio</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(['original', '16:9', '4:3', '1:1'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspect(ratio)}
                    className={`py-1.5 text-xs font-medium rounded-lg border capitalize ${
                      aspect === ratio
                        ? 'border-emerald-700 bg-emerald-700 text-white'
                        : 'border-emerald-950/15 bg-white text-[#47554E]'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F1F17]">
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" />
                <span>Framing &amp; Color Adjustments</span>
              </div>

              <label className="block space-y-1 text-xs text-[#47554E]">
                <div className="flex justify-between">
                  <span>Zoom Crop</span>
                  <span className="font-mono tabular-nums">{zoom.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={2.2}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-emerald-700"
                />
              </label>

              <label className="block space-y-1 text-xs text-[#47554E]">
                <div className="flex justify-between">
                  <span>Brightness</span>
                  <span className="font-mono tabular-nums">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={140}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-emerald-700"
                />
              </label>

              <label className="block space-y-1 text-xs text-[#47554E]">
                <div className="flex justify-between">
                  <span>Contrast</span>
                  <span className="font-mono tabular-nums">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={140}
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-emerald-700"
                />
              </label>

              <label className="block space-y-1 text-xs text-[#47554E]">
                <div className="flex justify-between">
                  <span>Saturation</span>
                  <span className="font-mono tabular-nums">{saturation}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={160}
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="w-full accent-emerald-700"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-emerald-950/10 bg-[#F8FAF9] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-emerald-950/15 bg-white text-[#0F1F17] hover:bg-emerald-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !loadedImg}
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Save Photo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
