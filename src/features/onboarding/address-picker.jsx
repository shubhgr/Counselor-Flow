'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const TILE = 256;
const ZOOM = 14;
const DEFAULT_PLACE = {
  query: '',
  lat: 19.0596,
  lng: 72.8295,
};

const LEGACY_SEED_QUERY = 'Bandra West, Mumbai, Maharashtra';

let addressCount = 1;

function newAddress(partial = {}) {
  addressCount += 1;
  return {
    id: partial.id || `address-${addressCount}`,
    query: DEFAULT_PLACE.query,
    lat: DEFAULT_PLACE.lat,
    lng: DEFAULT_PLACE.lng,
    ...partial,
  };
}

function lon2tile(lon, zoom) {
  return ((lon + 180) / 360) * 2 ** zoom;
}

function lat2tile(lat, zoom) {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom;
}

function tile2lon(x, zoom) {
  return (x / 2 ** zoom) * 360 - 180;
}

function tile2lat(y, zoom) {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** zoom;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function persist(addresses) {
  const session = window.GradRightSession?.get?.();
  if (!session?.phone) return;
  window.GradRightSession.set(session.phone, {
    ...session,
    addresses: addresses.map(({ id, query, lat, lng }) => ({ id, query, lat, lng })),
  });
}

function MapPick({ lat, lng, onPick }) {
  const frame = useRef(null);
  const [size, setSize] = useState({ w: 480, h: 200 });

  useEffect(() => {
    const el = frame.current;
    if (!el) return undefined;
    const sync = () => setSize({ w: el.clientWidth || 480, h: el.clientHeight || 200 });
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const origin = useMemo(() => {
    const worldX = lon2tile(lng, ZOOM) * TILE;
    const worldY = lat2tile(lat, ZOOM) * TILE;
    return { x: worldX - size.w / 2, y: worldY - size.h / 2 };
  }, [lat, lng, size.h, size.w]);

  const tiles = useMemo(() => {
    const minX = Math.floor(origin.x / TILE);
    const maxX = Math.floor((origin.x + size.w) / TILE);
    const minY = Math.floor(origin.y / TILE);
    const maxY = Math.floor((origin.y + size.h) / TILE);
    const next = [];
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        next.push({
          key: `${x}:${y}`,
          src: `https://tile.openstreetmap.org/${ZOOM}/${x}/${y}.png`,
          left: x * TILE - origin.x,
          top: y * TILE - origin.y,
        });
      }
    }
    return next;
  }, [origin.x, origin.y, size.h, size.w]);

  function pick(event) {
    const rect = frame.current.getBoundingClientRect();
    const worldX = event.clientX - rect.left + origin.x;
    const worldY = event.clientY - rect.top + origin.y;
    onPick(tile2lat(worldY / TILE, ZOOM), tile2lon(worldX / TILE, ZOOM));
  }

  return (
    <div className="onboard-map-wrap">
      <button
        type="button"
        className="onboard-map"
        ref={frame}
        onClick={pick}
        aria-label="Choose this location on the map"
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            alt=""
            src={tile.src}
            className="onboard-map-tile"
            style={{ transform: `translate(${tile.left}px, ${tile.top}px)` }}
            draggable={false}
          />
        ))}
        <span className="onboard-map-pin" aria-hidden="true">
          <Icon name="location_on" className="app-icon" />
        </span>
      </button>
      <p className="onboard-map-hint">{'Tap the map to drop a pin.'}</p>
    </div>
  );
}

function AddressCard({ address, index, canRemove, onChange, onRemove }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [userTyped, setUserTyped] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    const query = address.query.trim();
    if (!userTyped || query.length < 3) {
      setSuggestions([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('format', 'jsonv2');
        url.searchParams.set('addressdetails', '1');
        url.searchParams.set('limit', '6');
        url.searchParams.set('q', query);
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        const rows = await response.json();
        if (!controller.signal.aborted) {
          setSuggestions(Array.isArray(rows) ? rows : []);
          setOpen(true);
        }
      } catch (error) {
        if (error.name !== 'AbortError') setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [address.query, userTyped]);

  async function reverseGeocode(nextLat, nextLng) {
    onChange({ lat: nextLat, lng: nextLng });
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('lat', String(nextLat));
      url.searchParams.set('lon', String(nextLng));
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await response.json();
      if (data?.display_name) onChange({ lat: nextLat, lng: nextLng, query: data.display_name });
    } catch {
      onChange({ lat: nextLat, lng: nextLng });
    }
  }

  function choose(row) {
    setUserTyped(false);
    setOpen(false);
    setSuggestions([]);
    onChange({
      query: row.display_name,
      lat: Number(row.lat),
      lng: Number(row.lon),
    });
  }

  return (
    <div className="onboard-address-card">
      <div className="onboard-address-row">
        <div className="onboard-address-search">
          <Icon name="search" className="app-icon" aria-hidden="true" />
          <Textarea
            className="onboard-address-input"
            rows={1}
            value={address.query}
            autoComplete="off"
            placeholder="Type an address or search a place"
            aria-label={`Address ${index + 1}`}
            onChange={(event) => {
              setUserTyped(true);
              onChange({ query: event.target.value });
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === 'Escape') {
                event.preventDefault();
                setOpen(false);
              }
            }}
            onFocus={() => suggestions.length && setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 160)}
          />
          <Button
            type="button"
            variant="unstyled"
            size="unstyled"
            className={`onboard-map-toggle${mapOpen ? ' is-active' : ''}`}
            aria-expanded={mapOpen}
            onClick={() => setMapOpen((value) => !value)}
          >
            <Icon name="location_on" className="app-icon" aria-hidden="true" />
            {mapOpen ? 'Hide map' : 'Pick on map'}
          </Button>
        </div>
        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="onboard-remove"
            aria-label={`Remove address ${index + 1}`}
            onClick={onRemove}
          >
            <Icon name="close" className="app-icon" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      {open && suggestions.length ? (
        <ul className="onboard-address-suggest" role="listbox">
          {suggestions.map((row) => (
            <li key={`${row.place_id}`}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(row)}
              >
                {row.display_name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {searching ? <p className="hint-text">{'Searching places…'}</p> : null}
      {mapOpen ? <MapPick lat={address.lat} lng={address.lng} onPick={reverseGeocode} /> : null}
    </div>
  );
}

export function AddressPicker() {
  const [addresses, setAddresses] = useState([
    {
      id: 'address-1',
      query: DEFAULT_PLACE.query,
      lat: DEFAULT_PLACE.lat,
      lng: DEFAULT_PLACE.lng,
    },
  ]);

  useEffect(() => {
    const saved = window.GradRightSession?.get?.()?.addresses;
    const filled = Array.isArray(saved)
      ? saved.filter((item) => item?.query?.trim() && item.query !== LEGACY_SEED_QUERY)
      : [];
    if (filled.length) setAddresses(filled.map((item) => newAddress(item)));
  }, []);

  function update(id, patch) {
    setAddresses((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      persist(next);
      return next;
    });
  }

  function add() {
    setAddresses((current) => {
      const last = current[current.length - 1];
      const next = [...current, newAddress({ lat: last?.lat, lng: last?.lng })];
      persist(next);
      return next;
    });
  }

  function remove(id) {
    setAddresses((current) => {
      const next = current.filter((item) => item.id !== id);
      persist(next);
      return next;
    });
  }

  return (
    <div className="field onboard-addresses">
      {addresses.map((address, index) => (
        <AddressCard
          key={address.id}
          address={address}
          index={index}
          canRemove={addresses.length > 1}
          onChange={(patch) => update(address.id, patch)}
          onRemove={() => remove(address.id)}
        />
      ))}
      <Button type="button" variant="ghost" size="sm" className="onboard-inline-add" onClick={add}>
        <Icon name="add" className="app-icon" aria-hidden="true" />
        Add another address
      </Button>
    </div>
  );
}
