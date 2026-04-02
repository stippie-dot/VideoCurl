# Overview

How Video.js players are structured — state, UI, and media

Video.js v10 is built around a three-part architecture that separates concerns and maximizes flexibility. Each part is designed to work independently or together, allowing you to use as much or as little of Video.js as you need.

## 1\. State management

State is handled by a `Player.Provider`, which creates a central state store that all components can access. When you wrap your player in a `Player.Provider`, the components automatically connect to the state.

*   tsx

```
{/* All components inside automatically connect to state */}
<Player.Provider>
  <VideoSkin>
    <Video src="video.mp4" />
  </VideoSkin>
</Player.Provider>
```

You can access state and actions from anywhere within the provider with the [`usePlayer` hook](/docs/framework/react/reference/use-player).

[Learn more about state and actions](/docs/framework/react/concepts/features)

## 2\. User interface

Use a prebuilt **skin** or build your own from the individual **UI components** .

### Skins

Skins are complete, pre-designed player UIs that package components and styles together:

*   tsx

```
<Player.Provider>
  <VideoSkin>
    <Video src="video.mp4" />
  </VideoSkin>
</Player.Provider>
```

[Learn more about skins](/docs/framework/react/concepts/skins)

### UI components

If you want more control than skins offer you, you can build your own UI from our components.

*   tsx

```
<Player.Provider>
  <Player.Container>
    <Video src="video.mp4" />
    <MediaControls>
      <PlayButton />
      {/* ... */}
    </MediaControls>
  </Player.Container>
</Player.Provider>
```

To get started with UI components, you might consider [ejecting a skin](/docs/framework/react/how-to/customize-skins) and using its pre-styled components as a foundation.

[Learn more about UI components](/docs/framework/react/concepts/ui-components)

## 3\. Media

Media components are the components that actually display your media. They’re essentially “players with no UI”. They handle the video/audio rendering and expose a consistent API.

Media components can be format specific (HLS, DASH), service specific (YouTube, Vimeo, Mux), or use case specific (background video).

Note

DASH, YouTube, Vimeo, Mux, and more media elements are currently under development.

*   tsx

```
<Player.Provider>
  <VideoSkin>
    <HlsVideo src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM.m3u8" />
  </VideoSkin>
</Player.Provider>
```

## Presets

**Presets** preconfigure these parts for a specific use case.

The default presets are `/video` and `/audio`, covering the baseline set of controls you’d expect from the HTML `<video>` and `<audio>` tags.

Beyond the defaults, presets target more specific use cases. For example, `/background` includes a media element with autoplay, mute, and loop built in, a skin with no controls, and just the features needed to power it:

*   tsx

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

[Learn more about presets](/docs/framework/react/concepts/presets)

---

React documentation: https://videojs.org/docs/framework/react/llms.txt
All documentation: https://videojs.org/llms.txt