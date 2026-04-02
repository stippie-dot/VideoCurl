# Installation

Install Video.js and build your first player with streaming support and accessible controls

Beta Software

Video.js v10 is currently in *beta* . The API may evolve with [feedback🙏](https://github.com/videojs/v10/issues). See the [Changelog](https://github.com/videojs/v10/blob/main/CHANGELOG.md) for recent updates and the [Roadmap](/docs/framework/react/concepts/v10-roadmap) for more details on what’s coming.

Video.js is a **React video player component library** — composable primitives, hooks, and TypeScript types for building accessible, customizable players with minimal bundle size.

Answer the questions below to get started quickly with your first embed code.

## Choose your JS framework

Video.js aims to provide idiomatic development experiences in your favorite JS and CSS frameworks. More to come.

React

HTML

## Choose your use case

The default presets work well for general website playback. More pre-built players to come.

Video

Audio

Background Video

## Choose skin

Choose how your player looks.

Default

Minimal

## Choose your media source type

Video.js supports a wide range of file types and hosting services. It’s easy to switch between them.

Select your source

Enter the URL to a video to auto-detect

or select manuallyHTML5 Video 

Or upload your media for free to [Mux](https://www.mux.com?utm_source=videojs&utm_campaign=vjs10)

Drop a video— or —Select a file

## Install Video.js

*   npm*   pnpm*   yarn*   bun

```
npm install @videojs/react
```

```
pnpm add @videojs/react
```

```
yarn add @videojs/react
```

```
bun add @videojs/react
```

## Create your player

Add it to your components folder in a new file.

*   ./components/player/index.tsx

```
'use client';

import '@videojs/react/video/skin.css';
import { createPlayer, videoFeatures } from '@videojs/react';
import { VideoSkin, Video } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

interface MyPlayerProps {
  src: string;
}

export const MyPlayer = ({ src }: MyPlayerProps) => {
  return (
    <Player.Provider>
      <VideoSkin>
        <Video src={src} playsInline />
      </VideoSkin>
    </Player.Provider>
  );
};
```

```
'use client';

import '@videojs/react/video/skin.css';
import { createPlayer, videoFeatures } from '@videojs/react';
import { VideoSkin, Video } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

interface MyPlayerProps {
  src: string;
}

export const MyPlayer = ({ src }: MyPlayerProps) => {
  return (
    <Player.Provider>
      <VideoSkin>
        <Video src={src} playsInline />
      </VideoSkin>
    </Player.Provider>
  );
};
```

## Use your player

*   ./app/page.tsx

```
import { MyPlayer } from '../components/player';

export const HomePage = () => {
  return (
    <div>
      <h1>Welcome to My App</h1>
      <MyPlayer src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4" />
    </div>
  );
};
```

```
import { MyPlayer } from '../components/player';

export const HomePage = () => {
  return (
    <div>
      <h1>Welcome to My App</h1>
      <MyPlayer src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4" />
    </div>
  );
};
```

## CSP

If your application uses a Content Security Policy, you may need to allow additional sources for player features to work correctly.

### Common requirements

*   `media-src` must allow your media URLs.
*   `img-src` must allow any poster or thumbnail image URLs.
*   `connect-src` must allow HLS manifests, playlists, captions, and segment requests when using HLS playback.
*   `media-src blob:` is required when using the HLS player variants, which use MSE-backed playback.
*   `worker-src blob:` is required when using the `hls.js` player variants.
*   `style-src 'unsafe-inline'` is currently required for some player UI and HTML player styling behavior.

### Example

*   http

```
Content-Security-Policy:
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' https: data: blob:;
  media-src 'self' https: blob:;
  connect-src 'self' https:;
  worker-src 'self' blob:;
```

## See also

[

Skins

Some skins expose CSS custom properties

](/docs/framework/react/concepts/skins)

* * *

That’s it! You now have a fully functional Video.js player. Go forth and play.

Something not quite right? You can [submit an issue](https://github.com/videojs/v10/issues) and ask for help, or explore [other support options](/html5-video-support).

---

React documentation: https://videojs.org/docs/framework/react/llms.txt
All documentation: https://videojs.org/llms.txt