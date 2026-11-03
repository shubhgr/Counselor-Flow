'use client';
import { useEffect, useState } from 'react';
import { Switch } from './ui/switch';
export function PreferenceSwitch({ name, label, defaultChecked = true }) {
  const [checked, setChecked] = useState(defaultChecked);
  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem('gradright_notification_preferences_v1') || '{}',
      );
      if (typeof stored[name] === 'boolean') setChecked(stored[name]);
    } catch {}
  }, [name]);
  function change(value) {
    setChecked(value);
    try {
      const stored = JSON.parse(
        localStorage.getItem('gradright_notification_preferences_v1') || '{}',
      );
      localStorage.setItem(
        'gradright_notification_preferences_v1',
        JSON.stringify({ ...stored, [name]: value }),
      );
    } catch {}
  }
  return <Switch aria-label={label} checked={checked} onCheckedChange={change} />;
}
