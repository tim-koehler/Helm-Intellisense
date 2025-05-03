import * as path from 'path';

import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
    files: 'out/test/**/*.test.js',
    launchArgs: ["--disable-extensions"],
    workspaceFolder: './src/test/Test',
});
