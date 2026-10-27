# Contributing

Multiedit is a small local utility. The best contribution makes a repeated editing task easier without collecting data or adding a service dependency.

## Development

Use Node.js 24+, then run:

```sh
npm ci
npm run dev
```

The site runs at http://127.0.0.1:4173. `src/core.js` is the shared transformation engine. The landing demo and extension both use it.

```sh
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:browser
```

Load `dist-extension` as an unpacked extension at chrome://extensions. Rebuild, reload the extension, and refresh the test tab after changing extension code.

## Useful contributions

- Small, predictable transforms with tests for punctuation, Unicode, identifiers, and empty values.
- Reproducible compatibility fixes for real text inputs. Include a minimal page without private data.
- Keyboard and assistive-technology improvements.
- Better installation instructions and accurate translations.

Do not add remote model calls, analytics, automatic form submission, broad host permissions, or claims of support for untested apps as incidental changes. Open an issue to discuss larger features first.

## Pull requests

Describe the user-visible problem, the resulting behavior, and checks you ran. Keep changes focused. Include screenshots for UI changes, and explain any browser limitations. Contributions are provided under the project's MIT license.
