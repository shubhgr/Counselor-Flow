'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { countryMatches, customCountry } from '@/lib/domain/countries';

export function CountrySelector() {
  const [selected, setSelected] = useState(['USA', 'UK', 'Canada']);
  const selectedRef = useRef(selected);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef(null);
  const root = useRef(null);
  const matches = countryMatches(query, selected);
  const custom = customCountry(query, selected);
  const options = [
    ...matches.map((country) => ({ name: country.name, custom: false })),
    ...(custom ? [{ name: custom, custom: true }] : []),
  ];
  function update(next) {
    selectedRef.current = next;
    setSelected(next);
  }
  useLayoutEffect(() => {
    const api = {
      get: () => [...selectedRef.current],
      restore: (value) => {
        update(value || []);
        setQuery('');
        setOpen(false);
        setActive(0);
      },
    };
    window.GradRightCountriesDraft = api;
    return () => {
      if (window.GradRightCountriesDraft === api) delete window.GradRightCountriesDraft;
    };
  }, []);
  useEffect(() => {
    window.GradRightProfileDirty?.edit?.();
    window.dispatchEvent(new Event('gradright:public-draft'));
  }, [selected]);
  useEffect(() => {
    if (open)
      document.getElementById(`country-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);
  function add(name) {
    if (!selectedRef.current.includes(name)) update([...selectedRef.current, name]);
    setQuery('');
    setActive(0);
    setOpen(false);
    input.current?.focus();
  }
  function keyDown(event) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActive(
        open
          ? (active + direction + options.length) % Math.max(options.length, 1)
          : direction === 1
            ? 0
            : Math.max(options.length - 1, 0),
      );
      setOpen(true);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (open && options[active]) add(options[active].name);
      else setOpen(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Backspace' && !query && selected.length)
      root.current.querySelectorAll('.country-token-remove')[selected.length - 1]?.focus();
  }
  return (
    <div
      className="field country-combobox"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="profile-field-heading">
        <Label htmlFor="country-search">Countries you advise on</Label>
        <span className="hint-text" aria-live="polite">
          {selected.length} selected
        </span>
      </div>
      <div className="country-combobox-anchor">
        <div
          className="country-token-field"
          id="countries"
          onClick={(event) => {
            if (!event.target.closest('button')) input.current?.focus();
          }}
        >
          {selected.map((country) => (
            <span className="country-token" key={country}>
              <span>{country}</span>
              <button
                className="country-token-remove"
                type="button"
                aria-label={`Remove ${country}`}
                onClick={() => {
                  update(selected.filter((name) => name !== country));
                  input.current?.focus();
                }}
              >
                <X aria-hidden="true" />
              </button>
            </span>
          ))}
          <input
            ref={input}
            id="country-search"
            className="country-token-search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls="country-options"
            aria-activedescendant={open && options[active] ? `country-option-${active}` : undefined}
            aria-describedby="country-help"
            autoComplete="off"
            placeholder="Search countries…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
              setOpen(true);
            }}
            onKeyDown={keyDown}
            onFocus={() => {
              if (query) setOpen(true);
            }}
          />
        </div>
        {open && (
          <div
            id="country-options"
            role="listbox"
            aria-label="Country suggestions"
            className="country-results"
          >
            {options.length ? (
              options.map((option, index) => (
                <button
                  type="button"
                  role="option"
                  tabIndex={-1}
                  id={`country-option-${index}`}
                  key={`${option.custom}:${option.name}`}
                  aria-selected={index === active}
                  className="country-result"
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => add(option.name)}
                >
                  <span>
                    {option.custom ? `+ Add “${option.name}” as a custom country` : option.name}
                  </span>
                  {index === active && !option.custom && (
                    <span className="hint-text">Enter to add</span>
                  )}
                </button>
              ))
            ) : (
              <p className="hint-text country-no-results">
                No matching countries. Already selected countries are excluded.
              </p>
            )}
          </div>
        )}
      </div>
      <p className="hint-text" id="country-help">
        Pick from the list, or type a country that isn’t listed.
      </p>
    </div>
  );
}
