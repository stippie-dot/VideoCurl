# Features

The state and actions each feature adds to the player

Not every player needs to support every use case. To address this, Video.js has a concept of **features** — self-contained units of player functionality. Each one adds state properties and actions to the player. For example, “playback” adds `paused` and `play()`, “volume” adds `volume` and `setVolume()`, and so on.

## Using features

### Feature bundles and presets

You probably don’t want to hand-pick every feature your player needs. A **feature bundle** groups the features needed for a specific use case into a single array.

For example, `videoFeatures` bundles playback, volume, time, fullscreen, and more — everything a general video player needs:

*   tsx

```
import { createPlayer } from '@videojs/react';
import { videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });
```

Feature bundles are usually paired with specific skins and media elements in a **preset** . To learn more about this, and the available presets, you’ll want to check out the presets guide.

[Learn more about presets](/docs/framework/react/concepts/presets)

### Create a player with individual features

If you’re not using presets, you can create a player that has individual features.

*   tsx

```
import { createPlayer, playback, volume, time } from '@videojs/react';

const Player = createPlayer({
  features: [playback, volume, time],
});
```

### Extending a feature bundle

Since feature bundles are just an array of features under the hood, it doesn’t take much to extend one. For example, if you were using the `/background` preset and wanted a play button on your background video, you might add the playback feature.

*   tsx

```
import { createPlayer, playback } from '@videojs/react';
import { backgroundFeatures } from '@videojs/react/background';

const Player = createPlayer({
  features: [...backgroundFeatures, playback],
});
```

### Access features in components

You access feature state and actions through [`usePlayer`](/docs/framework/react/reference/use-player):

*   tsx

```
// Subscribe to state (re-renders when selected values change)
const { paused, volume } = usePlayer((s) => ({
  paused: s.paused,
  volume: s.volume,
}));

// Call actions
const store = usePlayer();
store.play();
store.setVolume(0.8);
```

### Feature selectors

Each feature also has a pre-built selector (e.g. [`selectPlayback`](/docs/framework/react/reference/feature-playback), [`selectVolume`](/docs/framework/react/reference/feature-volume)) that returns just that feature’s state and actions:

*   tsx

```
import { selectPlayback, usePlayer } from '@videojs/react';

const playback = usePlayer(selectPlayback);
playback?.play();
```

### Checking for feature support

Volume, fullscreen, and picture-in-picture expose an `*Availability` property because platform support varies. For example, iOS Safari doesn’t allow programmatic volume control.

Value

Meaning

`'available'`

Ready to use

`'unavailable'`

Could work, not ready yet

`'unsupported'`

Platform can never do this

Components that depend on availability (like [`PiPButton`](/docs/framework/react/reference/pip-button) and [`FullscreenButton`](/docs/framework/react/reference/fullscreen-button)) expose a `data-availability` attribute, so you can hide unsupported controls with CSS:

*   css

```
.pip-button[data-availability="unsupported"] {
  display: none;
}
```

You can also check availability in JS:

*   PiPControl.tsx

```
function PiPControl() {
  const availability = usePlayer((s) => s.pipAvailability);

  if (availability === 'unsupported') return null;

  return <PiPButton />;
}
```

---

React documentation: https://videojs.org/docs/framework/react/llms.txt
All documentation: https://videojs.org/llms.txt