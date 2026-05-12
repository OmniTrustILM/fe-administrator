import * as FloatingUIDOM from '@floating-ui/dom';
(globalThis as any).FloatingUIDOM = FloatingUIDOM;

import HSSelect from 'preline/dist/select.mjs';
(globalThis as any).HSSelect = HSSelect;
// Preline lazily creates $hsSelectCollection only when its first HSSelect instance is
// constructed. The Select component's effect calls HSSelect.getInstance() before its own
// scheduled autoInit fires, so without a pre-existing array it would crash on
// window.$hsSelectCollection.find(...). Pre-seed it.
(globalThis as any).$hsSelectCollection ??= [];

import React from 'react';
import { createRoot } from 'react-dom/client';
import 'reactflow/dist/style.css';
import reportWebVitals from './reportWebVitals';
import 'preline';
import './tailwindcss.css';
import App from './App';
import '@preline/tooltip';
import '@preline/toggle-password';

const container = document.getElementById('root')!;
const root = createRoot(container);

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
