import { mount } from 'svelte';

import Editor from './editor.svelte';

const target = document.getElementById('editor');
if (target) mount(Editor, { target });
