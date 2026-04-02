# UI components

How Video.js UI components work — one element per component, data attributes for state, and compound composition.

UI components are controls like buttons, sliders, and time displays.

Every UI component renders exactly one HTML element, taking inspiration from projects like [shadcn/ui](https://ui.shadcn.com/) and [Base UI](https://base-ui.com/). This approach gives you control over styling and behavior while handling the complex interactions for you.

## Where to put your components

UI Components can go anywhere inside a [`<Player.Provider>`](/docs/framework/react/reference/player-provider).

However, you should consider placing your components in `<Player.Container>`. Components in `<Player.Container>` will go fullscreen with the player, respond to user activity, and more.

[Read more about `<Player.Container>`](/docs/framework/react/reference/player-container)

## Styling and customization

### The `render` prop

The `render` prop is the primary customization mechanism. It accepts a function that receives `props` and `state`, and returns your element. The `props` object includes event handlers, ARIA attributes, data attributes, and a ref — always spread `{...props}` to keep everything working:

*   tsx

```
<PlayButton
  render={(props, state) => (
    <button {...props}>
      {state.paused ? 'Play' : 'Pause'}
    </button>
  )}
/>
```

`className` and `style` also accept functions of state for dynamic styling without a full render prop:

*   tsx

```
<PlayButton
  className={(state) =>
    state.paused ? 'btn btn--paused' : 'btn btn--playing'
  }
/>
```

### Data attributes and CSS custom properties

Components reflect player state as `data-*` attributes on their element. For example, `data-paused` or `data-volume-level="high"`.

This lets you style state changes in pure CSS:

*   css

```
/* Show/hide icons based on play state */
.play-icon  { display: none; }
.pause-icon { display: none; }

button[data-paused] .play-icon        { display: inline; }
button:not([data-paused]) .pause-icon { display: inline; }
```

Each component’s reference page documents its full set of data attributes.

Some components also expose **CSS custom properties** for continuous values like fill percentage and pointer position. Sliders, for example, set `--media-slider-fill` and `--media-slider-pointer`. See individual component reference pages for specifics.

## Compound components

Complex interactions are split into composable parts. A parent manages shared state while children consume it. Each part is still one element.

Compound components use dot notation off a shared namespace:

*   tsx

```
<VolumeSlider.Root orientation="vertical">
  <VolumeSlider.Track>
    <VolumeSlider.Fill />
  </VolumeSlider.Track>
  <VolumeSlider.Thumb />
</VolumeSlider.Root>
```

---

React documentation: https://videojs.org/docs/framework/react/llms.txt
All documentation: https://videojs.org/llms.txt