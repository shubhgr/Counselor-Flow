'use client';
import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
export function PageActions({ children }) {
  const [target, setTarget] = useState(null);
  useLayoutEffect(() => {
    setTarget(document.getElementById('page-header-actions'));
  }, []);
  return target ? createPortal(children, target) : null;
}
