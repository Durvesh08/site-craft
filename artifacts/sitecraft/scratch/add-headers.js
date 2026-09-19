const fs = require('fs');
const config = fs.readFileSync('vite.config.ts', 'utf8');
const newConfig = config.replace(/server: {/, "server: {\n    headers: {\n      'Cross-Origin-Embedder-Policy': 'require-corp',\n      'Cross-Origin-Opener-Policy': 'same-origin',\n    },");
fs.writeFileSync('vite.config.ts', newConfig);
