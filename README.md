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

`start()` resolves after the server has acknowledged subscriptions and finished
the initial state replay. Event handlers may receive replay frames while the
connection state is `connecting`; register them before calling `start()`.
Granted named records are read after `start()` and refreshed every 30 seconds;
`onState` reports changed revisions. Pass `recordRefreshMs` to choose an interval
between one second and one hour. `getRecord(kind, id)` reads one requested record
immediately. A missing or revoked record is removed from `state.records` on the
next refresh.

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

The package directory is self-contained: it has its own lockfile, build,
typecheck, lint, WebSocket integration tests, coverage gate, and GitHub Actions
workflow. No package source or build step imports the Bloopbot application.
To establish a separate repository, export `packages/overlay-sdk` as its root:

```sh
git subtree split --prefix=packages/overlay-sdk -b overlay-sdk-release
git push <package-repository-remote> overlay-sdk-release:main
```

Use a new, empty package repository for the first push. Later updates use the
same subtree split without `-b` (it prints the new commit ID), then push that
commit ID to the package repository's `main` without force. Review its `main` branch before
releasing. The `Package` workflow runs the complete package gate for pushes and
pull requests. A published GitHub release whose tag exactly matches
`v<package.json version>` runs the gate and publishes the npm tarball. Configure
the npm trusted publisher for `@bloopbot/overlay-sdk` to authorize that
repository's `.github/workflows/package.yml` workflow with direct publishing.
The publish job uses GitHub's OIDC identity; it needs no stored npm token.
The initial package claim and trusted-publisher configuration require an npm
owner of the `@bloopbot` scope. No release is published by extracting the tree.

Keep each version change and browser artifact from the same source commit. The
app stages that artifact at `/assets/overlay-sdk-<version>.js`. Publishing the
package and deploying the app are separate steps; deploy a compatible V2 server
before directing overlay authors to a new SDK version.
