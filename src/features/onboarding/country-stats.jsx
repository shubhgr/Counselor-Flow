'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COUNTRIES, countryMatches, customCountry } from '@/lib/domain/countries';

const POPULAR = [
  'USA',
  'UK',
  'Canada',
  'Australia',
  'Germany',
  'Ireland',
  'New Zealand',
  'Singapore',
];

function buildOptions(query, selected) {
  if (query.trim()) {
    const custom = customCountry(query, selected);
    return [
      ...countryMatches(query, selected).map((country) => ({ name: country.name })),
      ...(custom ? [{ name: custom, custom: true }] : []),
    ];
  }
  const taken = new Set(selected);
  const popular = POPULAR.filter((name) => !taken.has(name));
  const popularSet = new Set(popular);
  return [
    ...popular.map((name) => ({ name })),
    ...COUNTRIES.filter((country) => !taken.has(country.name) && !popularSet.has(country.name)).map(
      (country) => ({ name: country.name }),
    ),
  ];
}

function CountryPicker({ selected, onPick, onCancel }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [navigated, setNavigated] = useState(false);
  const input = useRef(null);
  const list = useRef(null);
  const options = buildOptions(query, selected);

  useEffect(() => {
    input.current?.focus();
  }, []);

  useEffect(() => {
    list.current
      ?.querySelector(`[data-option-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function keyDown(event) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setNavigated(true);
      setActive((current) => (current + direction + options.length) % Math.max(options.length, 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if ((query.trim() || navigated) && options[active]) onPick(options[active].name);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <div
      className="country-stat-picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onCancel();
      }}
    >
      <div className="country-stat-search">
        <Icon name="search" className="app-icon" aria-hidden="true" />
        <Input
          ref={input}
          className="country-stat-search-input"
          role="combobox"
          aria-expanded="true"
          aria-controls="country-stat-options"
          aria-label="Search countries"
          autoComplete="off"
          placeholder="Search a country…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={keyDown}
        />
      </div>
      <div
        id="country-stat-options"
        role="listbox"
        ref={list}
        aria-label={query.trim() ? 'Matching countries' : 'Countries'}
        className="country-results country-stat-results"
      >
        {options.length ? (
          options.map((option, index) => (
            <button
              type="button"
              role="option"
              tabIndex={-1}
              key={`${option.custom ? 'custom' : 'country'}:${option.name}`}
              data-option-index={index}
              aria-selected={index === active}
              className="country-result"
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => onPick(option.name)}
            >
              <span>
                {option.custom ? `+ Add “${option.name}” as a custom country` : option.name}
              </span>
            </button>
          ))
        ) : (
          <p className="hint-text country-no-results">No matching countries.</p>
        )}
      </div>
    </div>
  );
}

export function CountryStats() {
  const [rows, setRows] = useState([]);
  const [picking, setPicking] = useState(false);
  const rowsRef = useRef(rows);

  useLayoutEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useLayoutEffect(() => {
    const api = { get: () => rowsRef.current.map((row) => ({ ...row })) };
    window.GradRightOnboardingCountries = api;
    return () => {
      if (window.GradRightOnboardingCountries === api) delete window.GradRightOnboardingCountries;
    };
  }, []);

  function add(country) {
    setRows((current) =>
      current.some((row) => row.country === country)
        ? current
        : [...current, { country, served: '', admits: '' }],
    );
    setPicking(false);
  }

  function update(country, patch) {
    setRows((current) =>
      current.map((row) => (row.country === country ? { ...row, ...patch } : row)),
    );
  }

  function remove(country) {
    setRows((current) => current.filter((row) => row.country !== country));
  }

  return (
    <div className="field country-stats" role="group" aria-label="Countries you give guidance for">
      {rows.length ? (
        <div className="country-stat-table">
          <div className="country-stat-row country-stat-head" aria-hidden="true">
            <span />
            <span>{'Students served'}</span>
            <span>{'Admits'}</span>
            <span />
          </div>
          {rows.map((row) => (
            <div className="country-stat-row" key={row.country}>
              <strong className="country-stat-name">{row.country}</strong>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="e.g. 120"
                aria-label={`Students served in ${row.country}`}
                value={row.served}
                onChange={(event) => update(row.country, { served: event.target.value })}
              />
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="e.g. 85"
                aria-label={`Admits in ${row.country}`}
                value={row.admits}
                onChange={(event) => update(row.country, { admits: event.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="onboard-remove"
                aria-label={`Remove ${row.country}`}
                onClick={() => remove(row.country)}
              >
                <Icon name="close" className="app-icon" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      {picking ? (
        <CountryPicker
          selected={rows.map((row) => row.country)}
          onPick={add}
          onCancel={() => setPicking(false)}
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="onboard-inline-add"
          onClick={() => setPicking(true)}
        >
          <Icon name="add" className="app-icon" aria-hidden="true" />
          {rows.length ? 'Add another country' : 'Add country'}
        </Button>
      )}
    </div>
  );
}
