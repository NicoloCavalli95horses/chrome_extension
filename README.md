# HTTP response analyzer

Identify likely sensitive HTTP responses in web applications, based on empirical heuristics

## Project structure

This Chrome extension is based on `Manifest V3`, and includes:

- Content Script (`content_script.js`)
- Background Script (`service_worker.js`)
- Manifest (`manifest.json`)
- Automatic build with `esbuild`

## How to use it

- `npm install`
- `npm run build`
- `npm run test`
- Upload the extension in `chrome://extensions/`, selecting the `dist` folder

