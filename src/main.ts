import { mount } from 'svelte';

import App from './app.svelte';
import { preferredLanguage, setLanguage } from './lib/i18n.svelte';
import './styles/global.css';

const target = document.getElementById('app');
setLanguage(preferredLanguage(), false);
if (target) mount(App, { target });
