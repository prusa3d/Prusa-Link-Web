import { mount } from 'svelte';

import '../src/styles/global.css';
import Panel from './panel.svelte';

const target = document.getElementById('panel');
if (target) mount(Panel, { target });
