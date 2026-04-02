# Presets

Pre-packaged player configurations that bundle state management, skins, and media elements for specific use cases.

A **preset** packages what you need for a specific player use case. It can include special [state management](/docs/framework/react/concepts/features), one or more [skins](/docs/framework/react/concepts/skins) for UI, and specific media elements. Instead of assembling these pieces individually, you pick a preset that matches what you’re building.

For example, the `/background` preset includes a media element with autoplay, mute, and loop built in, a skin with no controls, and just the features needed to power them:

*   App.tsx

```
import { createPlayer } from '@videojs/react';
import { backgroundFeatures, BackgroundVideo, BackgroundVideoSkin } from '@videojs/react/background';

const Player = createPlayer({ features: backgroundFeatures });

function Hero() {
  return (
    <Player.Provider>
      <BackgroundVideoSkin>
        <BackgroundVideo src="hero.mp4" />
      </BackgroundVideoSkin>
    </Player.Provider>
  );
}
```

## Available presets

The default presets are `/video` and `/audio`. These cover the baseline controls you’d expect from the HTML `<video>` and `<audio>` tags. Beyond the defaults, presets target more specific use cases — the `/background` preset, for example, needs layout but not controls. Over time we’ll add more: short-form players, podcast players, TV streaming players, and others.

Preset

Feature bundle

Skins

Default media element

`/video`

`videoFeatures`

`<VideoSkin>`, `<MinimalVideoSkin>`

`<Video>`

`/audio`

`audioFeatures`

`<AudioSkin>`, `<MinimalAudioSkin>`

`<Audio>`

`/background`

`backgroundFeatures`

`<BackgroundVideoSkin>`

`<BackgroundVideo>`

## What’s in a preset

Each preset exports up to three things:

*   **Feature bundle** — An array of [features](/docs/framework/react/concepts/features) that define the player’s state and actions. For example, the video feature bundle includes playback, volume, time, fullscreen, and more.
*   **Skins** — Pre-built UIs designed for that feature bundle. For example, a video skin renders fullscreen and PiP controls because the video feature bundle includes those features. An audio skin doesn’t.
*   **Media element** — A media component suited to the use case. For example, the background video element bakes in autoplay, mute, and loop.

These parts aren’t equally tied together. Skins depend tightly on their feature bundle — a skin expects specific features to exist. Media elements are more interchangeable — you can swap in an HLS or DASH provider without changing your skin or features.

## Customizing a preset

You can customize a preset in three ways: extend its feature bundle, eject its skin, or swap its media element.

### Extend the feature bundle

Add features to a preset’s feature bundle to enable new functionality. For example, adding playback controls to a background video:

*   App.tsx

```
import { createPlayer, playback } from '@videojs/react';
import { backgroundFeatures, BackgroundVideo } from '@videojs/react/background';

const Player = createPlayer({
  features: [...backgroundFeatures, playback],
});

function Hero() {
  return (
    <Player.Provider>
      <Player.Container>
        <BackgroundVideo src="hero.mp4" />
        <PlayButton />
      </Player.Container>
    </Player.Provider>
  );
}
```

### Eject the skin

If a preset’s skin is close but not quite right, you can [eject it](/docs/framework/react/how-to/customize-skins) — copy its internal components into your project and customize from there.

### Swap the media element

A preset’s default media element is just the starting point. You can replace it with any compatible media provider. For example, using an HLS source with the video preset:

*   tsx

```
<Player.Provider>
  <VideoSkin>
    <HlsVideo src="https://example.com/stream.m3u8" />
  </VideoSkin>
</Player.Provider>
```

---

React documentation: https://videojs.org/docs/framework/react/llms.txt
All documentation: https://videojs.org/llms.txt