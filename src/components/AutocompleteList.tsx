"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export interface CodeItem {
  code: string;
  description?: string;
  name?: string;
}

interface AutocompleteListProps {
  label: string;
  searchEndpoint: string;
  items: CodeItem[];
  onItemsChange: (items: CodeItem[]) => void;
  placeholder?: string;
  helperText?: string;
  displayField?: "description" | "name";
}

export default function AutocompleteList({
  label,
  searchEndpoint,
  items,
  onItemsChange,
  placeholder = "Search to add...",
  helperText,
  displayField = "description",
}: AutocompleteListProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CodeItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const getDisplayText = (item: CodeItem) =>
    displayField === "name" ? item.name || "" : item.description || "";

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `${searchEndpoint}?q=${encodeURIComponent(q)}`
        );
        if (res.ok) {
          const data = await res.json();
          // Filter out already-selected items
          const existingCodes = new Set(items.map((i) => i.code));
          setResults(data.filter((r: CodeItem) => !existingCodes.has(r.code)));
          setIsOpen(true);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [searchEndpoint, items]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addItem(item: CodeItem) {
    onItemsChange([...items, item]);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }

  function removeItem(code: string) {
    onItemsChange(items.filter((i) => i.code !== code));
  }

  return (
    <div>
      <label className="label">{label}</label>
      {helperText && (
        <p className="text-xs text-gray-500 mb-1">{helperText}</p>
      )}

      {/* Selected items */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {items.map((item) => (
            <span
              key={item.code}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-800 rounded-md text-sm border border-primary-200"
            >
              <span className="font-mono text-xs text-primary-600">
                {item.code}
              </span>
              <span>{getDisplayText(item)}</span>
              <button
                type="button"
                onClick={() => removeItem(item.code)}
                className="ml-1 text-primary-400 hover:text-red-600 font-bold"
                aria-label={`Remove ${getDisplayText(item)}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div ref={wrapperRef} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          className="input-field"
          placeholder={placeholder}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Dropdown results */}
        {isOpen && results.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {results.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => addItem(item)}
                className="w-full text-left px-3 py-2 hover:bg-primary-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <span className="font-mono text-xs text-gray-500">
                  {item.code}
                </span>{" "}
                <span className="text-sm text-gray-800">
                  {getDisplayText(item)}
                </span>
              </button>
            ))}
          </div>
        )}

        {isOpen && query.length >= 2 && results.length === 0 && !loading && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500">
            No results found for &quot;{query}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
