"use client";

import { useState, useRef, useEffect } from "react";

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  multi?: boolean;
  onSearchChange?: (search: string) => void;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Cari...",
  required,
  multi,
  onSearchChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedValues = multi ? value.split(",").filter(Boolean) : [];
  const selectedLabels = multi
    ? options.filter((o) => selectedValues.includes(o.value)).map((o) => o.label)
    : [];

  function toggleMulti(v: string) {
    const set = new Set(selectedValues);
    if (set.has(v)) set.delete(v);
    else set.add(v);
    onChange([...set].join(","));
  }

  if (multi) {
    return (
      <div ref={ref} className="relative">
        <div
          onClick={() => setOpen(!open)}
          className="flex min-h-[38px] w-full cursor-pointer flex-wrap items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
        >
          {selectedLabels.length > 0 ? (
            selectedLabels.map((l, i) => (
              <span
                key={i}
                className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-200"
              >
                {l}
              </span>
            ))
          ) : (
            <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
          )}
          <svg
            className={`ml-auto h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500 transition ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                onSearchChange?.(e.target.value);
              }}
              placeholder="Cari..."
              className="w-full border-b border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              autoFocus
            />
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">Tidak ditemukan</p>
              ) : (
                filtered.map((o) => {
                  const checked = selectedValues.includes(o.value);
                  return (
                    <label
                      key={o.value}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-blue-900/30"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMulti(o.value)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      {o.label}
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}

        {required && <input type="hidden" value={value} />}
      </div>
    );
  }

  const selectedLabel = options.find((o) => o.value === value)?.label || "";

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
      >
        <span className={`${selectedLabel ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"}`}>
          {selectedLabel || placeholder}
        </span>
        <svg
          className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              onSearchChange?.(e.target.value);
            }}
            placeholder="Cari..."
            className="w-full border-b border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">Tidak ditemukan</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-blue-900/30 ${
                    o.value === value ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-200" : ""
                  }`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {required && <input type="hidden" value={value} />}
    </div>
  );
}
