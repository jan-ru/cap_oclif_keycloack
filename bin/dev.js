#!/usr/bin/env -S node --loader ts-node/esm --disable-warning=ExperimentalWarning

import { executeCLI } from '../src/cli.js';

await executeCLI({ development: true, dir: import.meta.url });
