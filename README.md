# HTTP response analyzer

Identify likely sensitive HTTP responses in web applications, based on empirical heuristics

## Project structure

This Chrome extension is based on `Manifest V3`, and includes:

- Content Script
- Background Script
- Manifest
- Automatic build with `esbuild`

## How to use it

- `npm install`
- `npm run build`
- Upload the extension in `chrome://extensions/`, selecting the `dist` folder

