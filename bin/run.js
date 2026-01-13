#!/usr/bin/env node

import { executeCLI } from '../dist/cli.js';

await executeCLI({ dir: import.meta.url });
