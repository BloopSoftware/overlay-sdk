# Bloopbot Overlay SDK

Typed client for custom OBS Browser Source overlays. The SDK handles the
connection and data. Your page renders the overlay.

This package is under development. The Bloopbot V2 record endpoint and developer
documentation are not yet complete; do not publish this version to npm.

## Use it in a page

```ts
import { createOverlay } from '@bloopbot/overlay-sdk';

const overlay = createOverlay({
  events: ['follow', 'stage.media'],
  variables: ['hype'],
  records: [{ kind: 'widget', id: 'your-widget-id' }],
});

overlay.onEvent('follow', (frame) => {
  document.querySelector('#name')!.textContent = String(frame.name ?? 'Someone');
});
overlay.onState((state) => {
  document.body.dataset.connection = state.status;
});
overlay.onDiagnostic((diagnostic) => console.warn(diagnostic.message));

await overlay.start();
```

The OBS Browser Source URL supplies `?ws=`. During local development, pass
`{ url: 'ws://localhost:3000/overlay/...' }` as the second argument to
`createOverlay`. Keep that URL private: it contains the overlay credential.
Subscriptions are fixed when the connection starts. The server intersects them
with the grants chosen for the named overlay; a requested name does not grant
access by itself.

For a browser page without a build tool, load the versioned script from
Bloopbot (`/assets/overlay-sdk-0.1.0.js`) and use
`BloopbotOverlay.createOverlay(...)`. The browser and npm builds use the same
source and version.

## Simulate locally

```ts
import { createSimulation } from '@bloopbot/overlay-sdk';

const overlay = createSimulation({ events: ['follow'] });
overlay.onEvent('follow', (frame) => console.log(frame.name));
await overlay.start();
overlay.emit({ type: 'follow', name: 'Ada' });
overlay.stop();
```

Simulation never opens a socket. It uses the same event and state interface as
the live client. Use `setVariables` and `setRecord` to exercise state reads.

## Build and test

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run test:coverage
npm run build
npm pack --dry-run
```

The package has no runtime dependency on the Bloopbot application. The
`dist/browser.global.js` file and npm import are built from this source tree.

## Separate repository

The package directory can become the root of its own Git repository using
`git subtree split --prefix=packages/overlay-sdk -b overlay-sdk-release` from
the Bloopbot repository. Push that branch to the package repository after
review. In that repository, run the commands above, inspect the npm tarball,
then publish the reviewed version with `npm publish --access public`. Package
publishing is separate from a Bloopbot deployment. Keep version changes and
the browser artifact from the same source commit; the app's build stages that
artifact at `/assets/overlay-sdk-<version>.js`.
