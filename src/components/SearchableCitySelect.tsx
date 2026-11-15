import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export const INDIAN_CITIES = [
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
  'Other',
] as const;

interface SearchableCitySelectProps {
  value: string;
  onChange: (city: string) => void;
  required?: boolean;
  id?: string;
}

export function SearchableCitySelect({
  value,
  onChange,
  required = true,
  id = 'register-city',
}: SearchableCitySelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const filteredCities = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [...INDIAN_CITIES];
    return INDIAN_CITIES.filter((c) => c.toLowerCase().includes(term));
  }, [search]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search, open]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      return;
    }
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 10);

    const handleOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(
      `[data-city-index="${highlightedIndex}"]`
    );
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [open, highlightedIndex]);

  const handleSelect = (cityName: string) => {
    onChange(cityName);
    setOpen(false);
    setSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredCities.length === 0 ? 0 : (prev + 1) % filteredCities.length
      );
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredCities.length === 0
          ? 0
          : (prev - 1 + filteredCities.length) % filteredCities.length
      );
      return;
    }
    if (e.key === 'Enter' && open && filteredCities.length > 0) {
      e.preventDefault();
      handleSelect(filteredCities[highlightedIndex] || filteredCities[0]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-700"
      >
        <span className={value ? 'text-[#0F1F17] truncate' : 'text-[#47554E]/70 truncate'}>
          {value || 'Select city...'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#47554E] shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="City options"
          onKeyDown={handleKeyDown}
          className="absolute left-0 right-0 mt-1.5 z-40 bg-white border border-emerald-950/15 rounded-lg shadow-lg overflow-hidden"
        >
          <div className="p-2 border-b border-emerald-950/10 bg-[#F8FAF9] flex items-center gap-2">
            <Search className="w-4 h-4 text-[#47554E] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Indian city..."
              aria-label="Search city"
              className="w-full text-sm bg-transparent text-[#0F1F17] placeholder:text-[#47554E]/70 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear city search"
                className="p-0.5 text-[#47554E] hover:text-[#0F1F17]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <ul ref={listRef} className="max-h-56 overflow-y-auto overscroll-contain py-1">
            {filteredCities.length === 0 ? (
              <li className="px-3 py-2.5 text-xs text-[#47554E]">
                No matching city found. Try &ldquo;Other&rdquo;.
              </li>
            ) : (
              filteredCities.map((cityOption, idx) => {
                const selected = value === cityOption;
                const highlighted = idx === highlightedIndex;
                return (
                  <li key={cityOption} data-city-index={idx}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => handleSelect(cityOption)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`w-full px-3 py-2 text-sm text-left flex items-center justify-between gap-2 transition-colors ${
                        selected
                          ? 'bg-emerald-50 text-emerald-900 font-semibold'
                          : highlighted
                            ? 'bg-[#F8FAF9] text-[#0F1F17]'
                            : 'text-[#0F1F17] hover:bg-[#F8FAF9]'
                      }`}
                    >
                      <span>{cityOption}</span>
                      {selected && <Check className="w-4 h-4 text-emerald-700 shrink-0" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
