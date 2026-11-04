import React from 'react';
import { createRoot } from 'react-dom/client';
import LandingApp from './LandingApp';
import './base.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><LandingApp /></React.StrictMode>);
