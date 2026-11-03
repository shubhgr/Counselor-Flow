import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import './styles.css';
import { Header, Sidebar } from './components/app-shell';

const roots = new WeakMap();
function render(element, component) {
  let root = roots.get(element);
  if (!root) {
    root = createRoot(element);
    roots.set(element, root);
  }
  flushSync(() => root.render(component));
}

window.GradRightReactShell = {
  renderSidebar(element, props) {
    render(element, <Sidebar {...props} />);
  },
  renderHeader(element, title, actions) {
    if (!roots.has(element)) actions?.remove();
    render(element, <Header title={title} actions={actions} />);
  },
};

// Keep access gating, notification integration, and mobile navigation in the
// existing controller until those workflows are converted to React state.
await import('../js/shell.js');
