# Customize skins

Learn how to customize Video.js v10 skins by copying and modifying them

Video.js v10 comes with two pre-built skins; Default and Minimal. Basic customization is possible with CSS custom properties, but if you want more control over the design and functionality of your player, you can copy the skin’s code into your project and modify it as needed. We call this “ejecting” the skin, since you’re taking the internal code that makes up the skin and making it your own.

## Basic customization

Property Name

Description

Type

Example

`--media-border-radius`

The border radius of the media player

A valid [border-radius value](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/border-radius#values)

`1rem`

`--media-color-primary`

The color of icons and text in media controls

[`<color>`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value)

`red`

You can of course also add your own classnames to the skins themselves.

## Ejecting

If you’d like to customize them you can fully customize them by “ejecting” the code and making it your own.

While eventually we’ll have a CLI that will eject skins in your preferred framework and style, for now we invite you to try it out with these copy-paste-ready implementations.

### Default Video Skin

*   Skin.tsx*   skin.css

```
import { type type CSSProperties, type type ComponentProps, forwardRef, type type ReactNode, isValidElement } from 'react';
import { createPlayer, Poster, Container, usePlayer, BufferingIndicator, CaptionsButton, Controls, ErrorDialog, FullscreenButton, MuteButton, PiPButton, PlayButton, PlaybackRateButton, Popover, SeekButton, Slider, Time, TimeSlider, Tooltip, VolumeSlider, type type Poster, type type RenderProp } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';
import './player.css';

// ================================================================
// Player
// ================================================================

const SEEK_TIME = 10;

export const Player = createPlayer({ features: videoFeatures });

export interface VideoPlayerProps {
  src: string;
  style?: CSSProperties;
  className?: string;
  poster?: string | RenderProp<Poster.State> | undefined;
}

/**
 * @example
 * ```tsx
 * <VideoPlayer
 *   src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
 *   poster="https://image.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/thumbnail.webp"
 * />
 * ```
 */
export function VideoPlayer({ src, className, poster, ...rest }: VideoPlayerProps): ReactNode {
  return (
    <Player.Provider>
      <Container className={`media-default-skin media-default-skin--video ${className ?? ''}`} {...rest}>
        <Video src={src} playsInline />

        {poster && (
          <Poster src={isString(poster) ? poster : undefined} render={isRenderProp(poster) ? poster : undefined} />
        )}

        <BufferingIndicator
          render={(props) => (
            <div {...props} className="media-buffering-indicator">
              <div className="media-surface">
                <SpinnerIcon className="media-icon" />
              </div>
            </div>
          )}
        />

        <ErrorDialog.Root>
          <ErrorDialog.Popup className="media-error">
            <div className="media-error__dialog media-surface">
              <div className="media-error__content">
                <ErrorDialog.Title className="media-error__title">Something went wrong.</ErrorDialog.Title>
                <ErrorDialog.Description className="media-error__description" />
              </div>
              <div className="media-error__actions">
                <ErrorDialog.Close className="media-button media-button--primary">OK</ErrorDialog.Close>
              </div>
            </div>
          </ErrorDialog.Popup>
        </ErrorDialog.Root>

        <Controls.Root className="media-surface media-controls">
          <Tooltip.Provider>
            <div className="media-button-group">
              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <PlayButton className="media-button--play" render={<Button />}>
                      <RestartIcon className="media-icon media-icon--restart" />
                      <PlayIcon className="media-icon media-icon--play" />
                      <PauseIcon className="media-icon media-icon--pause" />
                    </PlayButton>
                  }
                />
                <Tooltip.Popup className="media-surface media-tooltip">
                  <PlayLabel />
                </Tooltip.Popup>
              </Tooltip.Root>

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <SeekButton seconds={-SEEK_TIME} className="media-button--seek" render={<Button />}>
                      <span className="media-icon__container">
                        <SeekIcon className="media-icon media-icon--seek media-icon--flipped" />
                        <span className="media-icon__label">{SEEK_TIME}</span>
                      </span>
                    </SeekButton>
                  }
                />
                <Tooltip.Popup className="media-surface media-tooltip">Seek backward {SEEK_TIME} seconds</Tooltip.Popup>
              </Tooltip.Root>

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <SeekButton seconds={SEEK_TIME} className="media-button--seek" render={<Button />}>
                      <span className="media-icon__container">
                        <SeekIcon className="media-icon media-icon--seek" />
                        <span className="media-icon__label">{SEEK_TIME}</span>
                      </span>
                    </SeekButton>
                  }
                />
                <Tooltip.Popup className="media-surface media-tooltip">Seek forward {SEEK_TIME} seconds</Tooltip.Popup>
              </Tooltip.Root>
            </div>

            <div className="media-time-controls">
              <Time.Value type="current" className="media-time" />
              <TimeSlider.Root className="media-slider">
                <TimeSlider.Track className="media-slider__track">
                  <TimeSlider.Fill className="media-slider__fill" />
                  <TimeSlider.Buffer className="media-slider__buffer" />
                </TimeSlider.Track>
                <TimeSlider.Thumb className="media-slider__thumb" />

                <div className="media-surface media-preview media-slider__preview">
                  <Slider.Thumbnail className="media-preview__thumbnail" />
                  <TimeSlider.Value type="pointer" className="media-time media-preview__time" />
                  <SpinnerIcon className="media-preview__spinner media-icon" />
                </div>
              </TimeSlider.Root>
              <Time.Value type="duration" className="media-time" />
            </div>

            <div className="media-button-group">
              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={<PlaybackRateButton className="media-button--playback-rate" render={<Button />} />}
                />
                <Tooltip.Popup className="media-surface media-tooltip">Toggle playback rate</Tooltip.Popup>
              </Tooltip.Root>

              <VolumePopover />

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <CaptionsButton className="media-button--captions" render={<Button />}>
                      <CaptionsOffIcon className="media-icon media-icon--captions-off" />
                      <CaptionsOnIcon className="media-icon media-icon--captions-on" />
                    </CaptionsButton>
                  }
                />
                <Tooltip.Popup className="media-surface media-tooltip">
                  <CaptionsLabel />
                </Tooltip.Popup>
              </Tooltip.Root>

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <PiPButton className="media-button--pip" render={<Button />}>
                      <PipEnterIcon className="media-icon media-icon--pip-enter" />
                      <PipExitIcon className="media-icon media-icon--pip-exit" />
                    </PiPButton>
                  }
                />
                <Tooltip.Popup className="media-surface media-tooltip">
                  <PiPLabel />
                </Tooltip.Popup>
              </Tooltip.Root>

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <FullscreenButton className="media-button--fullscreen" render={<Button />}>
                      <FullscreenEnterIcon className="media-icon media-icon--fullscreen-enter" />
                      <FullscreenExitIcon className="media-icon media-icon--fullscreen-exit" />
                    </FullscreenButton>
                  }
                />
                <Tooltip.Popup className="media-surface media-tooltip">
                  <FullscreenLabel />
                </Tooltip.Popup>
              </Tooltip.Root>
            </div>
          </Tooltip.Provider>
        </Controls.Root>

        <div className="media-overlay" />
      </Container>

    </Player.Provider>
  );
}

// ================================================================
// Labels
// ================================================================

function PlayLabel(): string {
  const paused = usePlayer((s) => Boolean(s.paused));
  const ended = usePlayer((s) => Boolean(s.ended));
  if (ended) return 'Replay';
  return paused ? 'Play' : 'Pause';
}

function CaptionsLabel(): string {
  const active = usePlayer((s) => Boolean(s.subtitlesShowing));
  return active ? 'Disable captions' : 'Enable captions';
}

function PiPLabel(): string {
  const pip = usePlayer((s) => Boolean(s.pip));
  return pip ? 'Exit picture-in-picture' : 'Enter picture-in-picture';
}

function FullscreenLabel(): string {
  const fullscreen = usePlayer((s) => Boolean(s.fullscreen));
  return fullscreen ? 'Exit fullscreen' : 'Enter fullscreen';
}

// ================================================================
// Components
// ================================================================

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(function Button({ className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={`media-button media-button--subtle media-button--icon ${className ?? ''}`}
      {...props}
    />
  );
});

function VolumePopover(): ReactNode {
  const volumeUnsupported = usePlayer((s) => s.volumeAvailability === 'unsupported');

  const muteButton = (
    <MuteButton className="media-button--mute" render={<Button />}>
      <VolumeOffIcon className="media-icon media-icon--volume-off" />
      <VolumeLowIcon className="media-icon media-icon--volume-low" />
      <VolumeHighIcon className="media-icon media-icon--volume-high" />
    </MuteButton>
  );

  if (volumeUnsupported) return muteButton;

  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
      <Popover.Trigger render={muteButton} />
      <Popover.Popup className="media-surface media-popover media-popover--volume">
        <VolumeSlider.Root className="media-slider" orientation="vertical" thumbAlignment="edge">
          <VolumeSlider.Track className="media-slider__track">
            <VolumeSlider.Fill className="media-slider__fill" />
          </VolumeSlider.Track>
          <VolumeSlider.Thumb className="media-slider__thumb media-slider__thumb--persistent" />
        </VolumeSlider.Root>
      </Popover.Popup>
    </Popover.Root>
  );
}

// ================================================================
// Utilities
// ================================================================

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isRenderProp(value: unknown): value is RenderProp<any> {
  return typeof value === 'function' || isValidElement(value);
}

// ================================================================
// Icons
// ================================================================

function CaptionsOffIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><rect width="16" height="12" x="1" y="3" stroke="currentColor" strokeWidth="2" rx="3"/><rect width="3" height="2" x="3" y="8" fill="currentColor" rx="1"/><rect width="2" height="2" x="13" y="8" fill="currentColor" rx="1"/><rect width="4" height="2" x="11" y="11" fill="currentColor" rx="1"/><rect width="5" height="2" x="7" y="8" fill="currentColor" rx="1"/><rect width="7" height="2" x="3" y="11" fill="currentColor" rx="1"/></svg>;
}

function CaptionsOnIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M15 2a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zM4 11a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2zm8 0a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2zM4 8a1 1 0 0 0 0 2h1a1 1 0 0 0 0-2zm4 0a1 1 0 0 0 0 2h3a1 1 0 1 0 0-2zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2"/></svg>;
}

function FullscreenEnterIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M9.57 3.617A1 1 0 0 0 8.646 3H4c-.552 0-1 .449-1 1v4.646a.996.996 0 0 0 1.001 1 1 1 0 0 0 .706-.293l4.647-4.647a1 1 0 0 0 .216-1.089m4.812 4.812a1 1 0 0 0-1.089.217l-4.647 4.647a.998.998 0 0 0 .708 1.706H14c.552 0 1-.449 1-1V9.353a1 1 0 0 0-.618-.924"/></svg>;
}

function FullscreenExitIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M7.883 1.93a.99.99 0 0 0-1.09.217L2.146 6.793A.998.998 0 0 0 2.853 8.5H7.5c.551 0 1-.449 1-1V2.854a1 1 0 0 0-.617-.924m7.263 7.57H10.5c-.551 0-1 .449-1 1v4.646a.996.996 0 0 0 1.001 1.001 1 1 0 0 0 .706-.293l4.646-4.646a.998.998 0 0 0-.707-1.707z"/></svg>;
}

function PauseIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><rect width="5" height="14" x="2" y="2" fill="currentColor" rx="1.75"/><rect width="5" height="14" x="11" y="2" fill="currentColor" rx="1.75"/></svg>;
}

function PipEnterIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M13 2a4 4 0 0 1 4 4v2.035A3.5 3.5 0 0 0 16.5 8H15V6.273C15 5.018 13.96 4 12.679 4H4.32C3.04 4 2 5.018 2 6.273v5.454C2 12.982 3.04 14 4.321 14H6v1.5q0 .255.035.5H4a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z"/><rect width="10" height="7" x="8" y="10" fill="currentColor" rx="2"/><path fill="currentColor" d="M7.129 5.547a.6.6 0 0 0-.656.13L3.677 8.473A.6.6 0 0 0 4.102 9.5h2.796c.332 0 .602-.27.602-.602V6.103a.6.6 0 0 0-.371-.556"/></svg>;
}

function PipExitIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M13 2a4 4 0 0 1 4 4v2.036A3.5 3.5 0 0 0 16.5 8H15V6.273C15 5.018 13.96 4 12.679 4H4.32C3.04 4 2 5.018 2 6.273v5.454C2 12.982 3.04 14 4.321 14H6v1.5q0 .255.036.5H4a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z"/><rect width="10" height="7" x="8" y="10" fill="currentColor" rx="2"/><path fill="currentColor" d="M4.871 10.454a.6.6 0 0 0 .656-.131l2.796-2.796A.6.6 0 0 0 7.898 6.5H5.102a.603.603 0 0 0-.602.602v2.795a.6.6 0 0 0 .371.556"/></svg>;
}

function PlayIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="m14.051 10.723-7.985 4.964a1.98 1.98 0 0 1-2.758-.638A2.06 2.06 0 0 1 3 13.964V4.036C3 2.91 3.895 2 5 2c.377 0 .747.109 1.066.313l7.985 4.964a2.057 2.057 0 0 1 .627 2.808c-.16.257-.373.475-.627.637"/></svg>;
}

function RestartIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M9 17a8 8 0 0 1-8-8h2a6 6 0 1 0 1.287-3.713l1.286 1.286A.25.25 0 0 1 5.396 7H1.25A.25.25 0 0 1 1 6.75V2.604a.25.25 0 0 1 .427-.177l1.438 1.438A8 8 0 1 1 9 17"/><path fill="currentColor" d="m11.61 9.639-3.331 2.07a.826.826 0 0 1-1.15-.266.86.86 0 0 1-.129-.452V6.849C7 6.38 7.374 6 7.834 6c.158 0 .312.045.445.13l3.331 2.071a.858.858 0 0 1 0 1.438"/></svg>;
}

function SeekIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M1 9c0 2.21.895 4.21 2.343 5.657l1.414-1.414a6 6 0 1 1 8.956-7.956l-1.286 1.286a.25.25 0 0 0 .177.427h4.146a.25.25 0 0 0 .25-.25V2.604a.25.25 0 0 0-.427-.177l-1.438 1.438A8 8 0 0 0 1 9"/></svg>;
}

function SpinnerIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" aria-hidden="true" viewBox="0 0 18 18" {...props}><rect width="2" height="5" x="8" y=".5" opacity=".5" rx="1"><animate attributeName="opacity" begin="0s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="2" height="5" x="12.243" y="2.257" opacity=".45" rx="1" transform="rotate(45 13.243 4.757)"><animate attributeName="opacity" begin="0.125s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="5" height="2" x="12.5" y="8" opacity=".4" rx="1"><animate attributeName="opacity" begin="0.25s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="5" height="2" x="10.743" y="12.243" opacity=".35" rx="1" transform="rotate(45 13.243 13.243)"><animate attributeName="opacity" begin="0.375s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="2" height="5" x="8" y="12.5" opacity=".3" rx="1"><animate attributeName="opacity" begin="0.5s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="2" height="5" x="3.757" y="10.743" opacity=".25" rx="1" transform="rotate(45 4.757 13.243)"><animate attributeName="opacity" begin="0.625s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="5" height="2" x=".5" y="8" opacity=".15" rx="1"><animate attributeName="opacity" begin="0.75s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="5" height="2" x="2.257" y="3.757" opacity=".1" rx="1" transform="rotate(45 4.757 4.757)"><animate attributeName="opacity" begin="0.875s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect></svg>;
}

function VolumeHighIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M15.6 3.3c-.4-.4-1-.4-1.4 0s-.4 1 0 1.4C15.4 5.9 16 7.4 16 9s-.6 3.1-1.8 4.3c-.4.4-.4 1 0 1.4.2.2.5.3.7.3.3 0 .5-.1.7-.3C17.1 13.2 18 11.2 18 9s-.9-4.2-2.4-5.7"/><path fill="currentColor" d="M.714 6.008h3.072l4.071-3.857c.5-.376 1.143 0 1.143.601V15.28c0 .602-.643.903-1.143.602l-4.071-3.858H.714c-.428 0-.714-.3-.714-.752V6.76c0-.451.286-.752.714-.752m10.568.59a.91.91 0 0 1 0-1.316.91.91 0 0 1 1.316 0c1.203 1.203 1.47 2.216 1.522 3.208q.012.255.011.51c0 1.16-.358 2.733-1.533 3.803a.7.7 0 0 1-.298.156c-.382.106-.873-.011-1.018-.156a.91.91 0 0 1 0-1.316c.57-.57.995-1.551.995-2.487 0-.944-.26-1.667-.995-2.402"/></svg>;
}

function VolumeLowIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M.714 6.008h3.072l4.071-3.857c.5-.376 1.143 0 1.143.601V15.28c0 .602-.643.903-1.143.602l-4.071-3.858H.714c-.428 0-.714-.3-.714-.752V6.76c0-.451.286-.752.714-.752m10.568.59a.91.91 0 0 1 0-1.316.91.91 0 0 1 1.316 0c1.203 1.203 1.47 2.216 1.522 3.208q.012.255.011.51c0 1.16-.358 2.733-1.533 3.803a.7.7 0 0 1-.298.156c-.382.106-.873-.011-1.018-.156a.91.91 0 0 1 0-1.316c.57-.57.995-1.551.995-2.487 0-.944-.26-1.667-.995-2.402"/></svg>;
}

function VolumeOffIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M.714 6.008h3.072l4.071-3.857c.5-.376 1.143 0 1.143.601V15.28c0 .602-.643.903-1.143.602l-4.071-3.858H.714c-.428 0-.714-.3-.714-.752V6.76c0-.451.286-.752.714-.752M14.5 7.586l-1.768-1.768a1 1 0 1 0-1.414 1.414L13.085 9l-1.767 1.768a1 1 0 0 0 1.414 1.414l1.768-1.768 1.768 1.768a1 1 0 0 0 1.414-1.414L15.914 9l1.768-1.768a1 1 0 0 0-1.414-1.414z"/></svg>;
}
```
```
/* ==========================================================================
   Reset
   ========================================================================== */

.media-default-skin *,
.media-default-skin *::before,
.media-default-skin *::after {
  box-sizing: border-box;
}
.media-default-skin img,
.media-default-skin video,
.media-default-skin svg {
  display: block;
  max-width: 100%;
}
.media-default-skin button {
  font: inherit;
}
@media (prefers-reduced-motion: no-preference) {
  .media-default-skin {
    interpolate-size: allow-keywords;
  }
}

/* ==========================================================================
   Root Container
   ========================================================================== */

.media-default-skin {
  container: media-root / inline-size;
  position: relative;
  isolation: isolate;
  display: block;
  height: 100%;
  width: 100%;
  border-radius: var(--media-border-radius, 2rem);
  font-family:
    Inter Variable,
    Inter,
    ui-sans-serif,
    system-ui,
    sans-serif;
  line-height: 1.5;
  letter-spacing: normal;
  -webkit-font-smoothing: auto;
  -moz-osx-font-smoothing: auto;

  & > * {
    font-size: 0.75rem; /* 12px at 100% font size */
  }

  @container media-root (width > 48rem) {
    & > * {
      font-size: 0.875rem; /* 14px at 100% font size */
    }
  }
}

/* ==========================================================================
   Surface (shared glass effect for tooltips, popovers, controls)
   ========================================================================== */

.media-default-skin .media-surface {
  background-color: var(--media-surface-background-color);
  backdrop-filter: var(--media-surface-backdrop-filter);
  box-shadow:
    0 0 0 1px var(--media-surface-outer-border-color),
    0 1px 3px 0 var(--media-surface-shadow-color),
    0 1px 2px -1px var(--media-surface-shadow-color);

  /* Inner border ring */
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 10;
    border-radius: inherit;
    box-shadow: inset 0 0 0 1px var(--media-surface-inner-border-color);
    pointer-events: none;
  }
}

/* ==========================================================================
   Media Element
   ========================================================================== */

.media-default-skin ::slotted(video),
.media-default-skin video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: var(--media-object-fit, contain);
  object-position: var(--media-object-position, center);
}
.media-default-skin ::slotted(video) {
  border-radius: var(--media-video-border-radius);
}
.media-default-skin video {
  border-radius: inherit;
}

.media-default-skin:fullscreen ::slotted(video),
.media-default-skin:fullscreen video {
  object-fit: contain;
}

/* ==========================================================================
   Overlay / Scrim
   ========================================================================== */

.media-default-skin .media-overlay {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image: linear-gradient(to top, oklch(0 0 0 / 0.5), oklch(0 0 0 / 0.3), oklch(0 0 0 / 0));
  backdrop-filter: blur(0) saturate(1);
  opacity: 0;
  pointer-events: none;
  transition-property: opacity, backdrop-filter;
  transition-duration: var(--media-controls-transition-duration);
  transition-timing-function: ease-out;
}

.media-default-skin .media-error ~ .media-overlay {
  transition-duration: var(--media-error-dialog-transition-duration);
  transition-delay: var(--media-error-dialog-transition-delay);
}

.media-default-skin .media-controls[data-visible] ~ .media-overlay,
.media-default-skin .media-error[data-open] ~ .media-overlay {
  opacity: 1;
}

.media-default-skin .media-error[data-open] ~ .media-overlay {
  backdrop-filter: blur(16px) saturate(1.5);
}

/* ==========================================================================
   Buffering Indicator
   ========================================================================== */

.media-default-skin .media-buffering-indicator {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  color: oklch(1 0 0);
  pointer-events: none;

  &[data-visible] {
    display: flex;
  }

  .media-surface {
    padding: 0.25rem;
    border-radius: 100%;
  }
}

/* ==========================================================================
   Error Dialog
   ========================================================================== */

.media-default-skin .media-error {
  outline: none;
}

.media-default-skin .media-error:not([data-open]) {
  display: none;
}

.media-default-skin .media-error__title {
  font-weight: 600;
  line-height: 1.25;
}

.media-default-skin .media-error__description {
  opacity: 0.7;
  overflow-wrap: anywhere;
}

.media-default-skin .media-error__actions {
  display: flex;
  gap: 0.5rem;

  & > * {
    flex: 1;
  }
}

.media-default-skin .media-error[data-open] ~ .media-controls * {
  visibility: hidden;
}

/* ==========================================================================
   Controls
   ========================================================================== */

.media-default-skin .media-controls {
  container: media-controls / inline-size;
  display: flex;
  align-items: center;
  column-gap: 0.075rem;
  padding: 0.375rem;
  border-radius: 1.5rem;
  --media-controls-current-shadow-color: oklch(from currentColor 0 0 0 / clamp(0, calc((l - 0.5) * 0.5), 0.15));
  --media-controls-current-shadow-color-subtle: oklch(
    from var(--media-controls-current-shadow-color) l c h /
    calc(alpha * 0.4)
  );
  text-shadow: 0 1px 0 var(--media-controls-current-shadow-color);
}

/* ==========================================================================
   Time Display
   ========================================================================== */

.media-default-skin .media-time-controls {
  container: media-time-controls / inline-size;
  display: flex;
  align-items: center;
  flex: 1;
  gap: 0.75rem;
  padding-inline: 0.5rem;
}

.media-default-skin .media-time {
  font-variant-numeric: tabular-nums;
}

/* ==========================================================================
   Buttons
   ========================================================================== */

/* Base button */
.media-default-skin .media-button {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: calc(infinity * 1px);
  outline: 2px solid transparent;
  outline-offset: -2px;
  transition-property: background-color, outline-offset, scale;
  /* Fix weird jumping when clicking on the buttons in Safari. */
  will-change: scale;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
  cursor: pointer;
  user-select: none;
  text-align: center;
  touch-action: manipulation;

  &:focus-visible {
    outline-color: currentColor;
    outline-offset: 2px;
  }

  &:active {
    scale: 0.98;
  }

  &[disabled] {
    opacity: 0.5;
    filter: grayscale(1);
    cursor: not-allowed;
  }

  &[data-availability="unavailable"] {
    display: none;
  }
}

/* Primary button variant */
.media-default-skin .media-button--primary {
  background: oklch(1 0 0);
  color: oklch(0 0 0);
  font-weight: 500;
  text-shadow: none;
}

/* Subtle button variant */
.media-default-skin .media-button--subtle {
  background: transparent;
  color: inherit;
  text-shadow: inherit;

  &:hover,
  &:focus-visible,
  &[aria-expanded="true"] {
    background-color: oklch(from currentColor l c h / 0.1);
    text-decoration: none;
  }
}

/* Icon button variant */
.media-default-skin .media-button--icon {
  display: grid;
  width: 2.25rem;
  padding: 0;
  aspect-ratio: 1;

  &:active {
    scale: 0.9;
  }

  & .media-icon {
    filter: drop-shadow(0 1px 0 var(--media-controls-current-shadow-color, oklch(0 0 0 / 0.25)));
  }
}

/* Seek button */
.media-default-skin .media-button--seek {
  & .media-icon__label {
    position: absolute;
    right: -1px;
    bottom: -3px;
    font-size: 10px;
    font-weight: 480;
    font-variant-numeric: tabular-nums;
  }

  &:has(.media-icon--flipped) .media-icon__label {
    right: unset;
    left: -1px;
  }
}

/* Playback rate button */
.media-default-skin .media-button--playback-rate {
  padding: 0;

  &::after {
    content: attr(data-rate) "\00D7";
    width: 4ch;
    font-variant-numeric: tabular-nums;
  }
}

/* ==========================================================================
   Button Groups
   ========================================================================== */

.media-default-skin .media-button-group {
  display: flex;
  align-items: center;
  gap: 0.075rem;

  @container media-root (width > 42rem) {
    gap: 0.125rem;
  }
}

/* ==========================================================================
   Icons
   ========================================================================== */

.media-default-skin .media-icon__container {
  position: relative;
}
.media-default-skin .media-icon {
  display: block;
  flex-shrink: 0;
  grid-area: 1 / 1;
  width: 18px;
  height: 18px;
  transition-behavior: allow-discrete;
  transition-property: display, opacity;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}
.media-default-skin .media-icon--flipped {
  scale: -1 1;
}

/* ==========================================================================
   Poster Image
   ========================================================================== */

.media-default-skin media-poster,
.media-default-skin > img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.25s;
  pointer-events: none;
}
.media-default-skin media-poster:not([data-visible]),
.media-default-skin > img:not([data-visible]) {
  opacity: 0;
}
.media-default-skin media-poster ::slotted(img) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: var(--media-object-fit, contain);
  object-position: var(--media-object-position, center);
  border-radius: var(--media-video-border-radius);
}
.media-default-skin > img {
  object-fit: var(--media-object-fit, contain);
  object-position: var(--media-object-position, center);
  border-radius: inherit;
}

.media-default-skin:fullscreen media-poster ::slotted(img),
.media-default-skin:fullscreen > img {
  object-fit: contain;
}

/* ==========================================================================
   Media preview
   ========================================================================== */
.media-default-skin .media-preview {
  background-color: oklch(0 0 0 / 0.9);
  border-radius: 0.75rem;
  pointer-events: none;

  & .media-preview__thumbnail {
    display: block;
    position: relative;
    border-radius: inherit;
    overflow: clip;

    &::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background-image: linear-gradient(to top, oklch(0 0 0 / 0.8), oklch(0 0 0 / 0.3), oklch(0 0 0 / 0));
    }
  }

  & .media-preview__time {
    position: absolute;
    bottom: 0.5rem;
    inset-inline: 0;
    text-align: center;
  }

  & .media-overlay {
    opacity: 1;
  }

  & .media-preview__spinner {
    position: absolute;
    top: 50%;
    left: 50%;
    translate: -50% -50%;
    opacity: 0;
  }

  & .media-preview__thumbnail,
  & .media-preview__spinner {
    transition: opacity 150ms ease-out;
  }

  &:has(.media-preview__thumbnail[data-loading]) {
    & .media-preview__thumbnail {
      opacity: 0;
    }
    & .media-preview__spinner {
      opacity: 1;
    }
  }
}

/* ==========================================================================
   Slider
   ========================================================================== */

.media-default-skin .media-slider {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  border-radius: calc(infinity * 1px);
  outline: none;
  cursor: pointer;

  &[data-orientation="horizontal"] {
    min-width: 5rem;
    width: 100%;
    height: 2rem;
  }

  &[data-orientation="vertical"] {
    width: 2rem;
    height: 5rem;
  }
}

/* Track */
.media-default-skin .media-slider__track {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: inherit;
  user-select: none;

  &[data-orientation="horizontal"] {
    width: 100%;
    height: 0.25rem;
  }

  &[data-orientation="vertical"] {
    width: 0.25rem;
    height: 100%;
  }
}

/* Thumb */
.media-default-skin .media-slider__thumb {
  z-index: 10;
  position: absolute;
  translate: -50% -50%;
  width: 0.625rem;
  height: 0.625rem;
  background-color: currentColor;
  border-radius: calc(infinity * 1px);
  box-shadow:
    0 0 0 1px var(--media-controls-current-shadow-color-subtle, oklch(0 0 0 / 0.1)),
    0 1px 3px 0 oklch(0 0 0 / 0.15),
    0 1px 2px -1px oklch(0 0 0 / 0.15);
  opacity: 0;
  transition-property: opacity, height, width, outline-offset;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
  user-select: none;
  outline: 4px solid transparent;
  outline-offset: -4px;

  &[data-orientation="horizontal"] {
    top: 50%;
    left: var(--media-slider-fill);
  }

  &[data-orientation="vertical"] {
    left: 50%;
    top: calc(100% - var(--media-slider-fill));
  }

  &:hover,
  &:focus {
    outline-color: oklch(from currentColor l c h / 0.25);
    outline-offset: 0;
  }

  &::after {
    content: "";
    position: absolute;
    inset: -4px;
    border-radius: inherit;
    box-shadow: 0 0 0 2px oklch(1 0 0);
    transition-property: opacity, scale;
    transition-duration: 150ms;
    transition-timing-function: ease-out;
  }

  &:not(:focus-visible)::after {
    scale: 0.5;
    opacity: 0;
  }
}

.media-default-skin .media-slider:active .media-slider__thumb,
.media-default-skin .media-slider__thumb--persistent {
  width: 0.75rem;
  height: 0.75rem;
}

.media-default-skin .media-slider:hover .media-slider__thumb,
.media-default-skin .media-slider__thumb:focus-visible,
.media-default-skin .media-slider__thumb--persistent {
  opacity: 1;
}

/* Shared track fills */
.media-default-skin .media-slider__buffer,
.media-default-skin .media-slider__fill {
  position: absolute;
  border-radius: inherit;
  pointer-events: none;
}

.media-default-skin .media-slider__buffer[data-orientation="horizontal"],
.media-default-skin .media-slider__fill[data-orientation="horizontal"] {
  inset-block: 0;
  left: 0;
}

.media-default-skin .media-slider__buffer[data-orientation="vertical"],
.media-default-skin .media-slider__fill[data-orientation="vertical"] {
  inset-inline: 0;
  bottom: 0;
}

/* Buffer */
.media-default-skin .media-slider__buffer {
  background-color: oklch(from currentColor l c h / 0.2);
  transition-duration: 0.25s;
  transition-timing-function: ease-out;

  &[data-orientation="horizontal"] {
    width: var(--media-slider-buffer);
    transition-property: width;
  }

  &[data-orientation="vertical"] {
    height: var(--media-slider-buffer);
    transition-property: height;
  }
}

/* Fill */
.media-default-skin .media-slider__fill {
  background-color: currentColor;

  &[data-orientation="horizontal"] {
    width: var(--media-slider-fill);
  }

  &[data-orientation="vertical"] {
    height: var(--media-slider-fill);
  }
}

/* ==========================================================================
   Popups & Tooltips
   ========================================================================== */

.media-default-skin .media-popover,
.media-default-skin .media-tooltip {
  margin: 0;
  border: 0;
  color: inherit;
  overflow: visible;
  transition-property: scale, opacity, filter;
  transition-duration: var(--media-popup-transition-duration);
  transition-timing-function: var(--media-popup-transition-timing-function);

  &[data-starting-style],
  &[data-ending-style] {
    opacity: 0;
    scale: 0.5;
    filter: blur(8px);
  }

  &[data-instant] {
    transition-duration: 0ms;
  }

  &[data-side="top"] {
    transform-origin: bottom;
  }
  &[data-side="bottom"] {
    transform-origin: top;
  }
  &[data-side="left"] {
    transform-origin: right;
  }
  &[data-side="right"] {
    transform-origin: left;
  }

  /* Safe area between trigger and popup */
  &::before {
    content: "";
    position: absolute;
    pointer-events: inherit;
  }

  &[data-side="top"]::before,
  &[data-side="bottom"]::before {
    width: 100%;
    inset-inline: 0;
  }
  &[data-side="top"]::before {
    top: 100%;
  }
  &[data-side="bottom"]::before {
    bottom: 100%;
  }

  &[data-side="left"]::before,
  &[data-side="right"]::before {
    height: 100%;
    inset-block: 0;
  }
  &[data-side="left"]::before {
    left: 100%;
  }
  &[data-side="right"]::before {
    right: 100%;
  }
}

.media-default-skin .media-popover {
  &[data-side="top"]::before,
  &[data-side="bottom"]::before {
    height: var(--media-popover-side-offset);
  }
  &[data-side="left"]::before,
  &[data-side="right"]::before {
    width: var(--media-popover-side-offset);
  }
}
.media-default-skin .media-popover--volume {
  padding: 0.75rem 0;
  border-radius: calc(infinity * 1px);

  &:has(media-volume-slider[data-availability="unsupported"]) {
    display: none;
  }
}

.media-default-skin .media-tooltip {
  padding: 0.25rem 0.625rem;
  border-radius: calc(infinity * 1px);
  font-size: 0.75rem;
  white-space: nowrap;

  &[data-side="top"]::before,
  &[data-side="bottom"]::before {
    height: var(--media-tooltip-side-offset);
  }
  &[data-side="left"]::before,
  &[data-side="right"]::before {
    width: var(--media-tooltip-side-offset);
  }
}

/* ==========================================================================
   Native Caption Track
   ========================================================================== */

.media-default-skin {
  --media-caption-track-duration: var(--media-controls-transition-duration);
  --media-caption-track-delay: 25ms;
  --media-caption-track-y: -0.5rem;

  &:has(.media-controls[data-visible]) {
    --media-caption-track-y: -5.5rem;
  }

  @container media-root (width > 42rem) {
    &:has(.media-controls[data-visible]) > * {
      --media-caption-track-y: -3.5rem;
    }
  }
}

.media-default-skin video::-webkit-media-text-track-container {
  transition: translate var(--media-caption-track-duration) ease-out;
  transition-delay: var(--media-caption-track-delay);
  translate: 0 var(--media-caption-track-y);
  scale: 0.98;
  z-index: 1;
  font-family: inherit;
}

/* ==========================================================================
   Icon State Visibility for Video Skins

   Data-attribute-driven visibility rules for multi-state icon buttons.
   Uses :is() with both element selectors (for HTML custom element wrappers)
   and class selectors (for React rendered SVG elements).
   ========================================================================== */

/* --- All icons hidden by default --- */

.media-button--play .media-icon--restart,
.media-button--play .media-icon--play,
.media-button--play .media-icon--pause,
.media-button--mute .media-icon--volume-off,
.media-button--mute .media-icon--volume-low,
.media-button--mute .media-icon--volume-high,
.media-button--fullscreen .media-icon--fullscreen-enter,
.media-button--fullscreen .media-icon--fullscreen-exit,
.media-button--pip .media-icon--pip-enter,
.media-button--pip .media-icon--pip-exit,
.media-button--captions .media-icon--captions-off,
.media-button--captions .media-icon--captions-on {
  display: none;
  opacity: 0;
}

/* --- Active icon per state --- */

/* Play: ended → restart */
.media-button--play[data-ended] .media-icon--restart,
/* Play: paused (not ended) → play */
.media-button--play:not([data-ended])[data-paused] .media-icon--play,
/* Play: playing (not paused, not ended) → pause */
.media-button--play:not([data-paused]):not([data-ended]) .media-icon--pause,
/* Mute: muted → volume off */
.media-button--mute[data-muted] .media-icon--volume-off,
/* Mute: volume low (not muted) → volume low */
.media-button--mute:not([data-muted])[data-volume-level="low"] .media-icon--volume-low,
/* Mute: volume high (not muted, not low) → volume high */
.media-button--mute:not([data-muted]):not([data-volume-level="low"]) .media-icon--volume-high,
/* Fullscreen: not fullscreen → enter */
.media-button--fullscreen:not([data-fullscreen]) .media-icon--fullscreen-enter,
/* Fullscreen: fullscreen → exit */
.media-button--fullscreen[data-fullscreen] .media-icon--fullscreen-exit,
/* Picture-in-Picture: not active → enter */
.media-button--pip:not([data-pip]) .media-icon--pip-enter,
/* Picture-in-Picture: active → exit */
.media-button--pip[data-pip] .media-icon--pip-exit,
/* Captions: not active → captions off */
.media-button--captions:not([data-active]) .media-icon--captions-off,
/* Captions: active → captions on */
.media-button--captions[data-active] .media-icon--captions-on {
  display: block;
  opacity: 1;
}

/* ==========================================================================
   Tooltip Label State Visibility for Video Skins

   Data-attribute-driven visibility rules for multi-state tooltip labels.
   Uses adjacent sibling selectors to match button state → tooltip content.
   ========================================================================== */

/* --- All multi-state labels hidden by default --- */

.media-tooltip-label {
  display: none;
}

/* --- Active label per state --- */

/* Play: ended → replay */
.media-button--play[data-ended] + .media-tooltip .media-tooltip-label--replay,
/* Play: paused (not ended) → play */
  .media-button--play:not([data-ended])[data-paused] + .media-tooltip
  .media-tooltip-label--play,
/* Play: playing (not paused, not ended) → pause */
  .media-button--play:not([data-paused]):not([data-ended]) + .media-tooltip
  .media-tooltip-label--pause,
/* Fullscreen: not fullscreen → enter */
  .media-button--fullscreen:not([data-fullscreen]) + .media-tooltip
  .media-tooltip-label--enter-fullscreen,
/* Fullscreen: fullscreen → exit */
  .media-button--fullscreen[data-fullscreen] + .media-tooltip
  .media-tooltip-label--exit-fullscreen,
/* Captions: not active → enable */
  .media-button--captions:not([data-active]) + .media-tooltip
  .media-tooltip-label--enable-captions,
/* Captions: active → disable */
  .media-button--captions[data-active] + .media-tooltip
  .media-tooltip-label--disable-captions,
/* PiP: not in pip → enter */
  .media-button--pip:not([data-pip]) + .media-tooltip
  .media-tooltip-label--enter-pip,
/* PiP: in pip → exit */
  .media-button--pip[data-pip] + .media-tooltip
  .media-tooltip-label--exit-pip {
  display: block;
}


/* ==========================================================================
   Root
   ========================================================================== */

.media-default-skin--video {
  background: oklch(0 0 0);
  --media-spring-transition: linear(
    0,
    0.034 1.5%,
    0.763 9.7%,
    1.066 13.9%,
    1.198 19.9%,
    1.184 21.8%,
    0.963 37.5%,
    0.997 50.9%,
    1
  );
  --media-border-color: oklch(0 0 0 / 0.1);
  --media-surface-background-color: oklch(1 0 0 / 0.1);
  --media-surface-inner-border-color: oklch(1 0 0 / 0.05);
  --media-surface-outer-border-color: oklch(0 0 0 / 0.1);
  --media-surface-shadow-color: oklch(0 0 0 / 0.15);
  --media-surface-backdrop-filter: blur(16px) saturate(1.5);
  --media-video-border-radius: var(--media-border-radius, 2rem);
  --media-controls-transition-duration: 100ms;
  --media-controls-transition-timing-function: ease-out;
  --media-error-dialog-transition-duration: 350ms;
  --media-error-dialog-transition-delay: 100ms;
  --media-error-dialog-transition-timing-function: var(--media-spring-transition);
  --media-popup-transition-duration: 100ms;
  --media-popup-transition-timing-function: ease-out;
  --media-tooltip-side-offset: 0.75rem;
  --media-popover-side-offset: 0.5rem;

  @media (prefers-reduced-motion: reduce) {
    --media-error-dialog-transition-duration: 50ms;
    --media-error-dialog-transition-delay: 0ms;
    --media-error-dialog-transition-timing-function: ease-out;
    --media-popup-transition-duration: 0ms;
  }

  @media (prefers-color-scheme: dark) {
    --media-border-color: oklch(1 0 0 / 0.15);
  }

  @media (prefers-reduced-transparency: reduce) or (prefers-contrast: more) {
    --media-surface-background-color: oklch(0 0 0);
    --media-surface-inner-border-color: oklch(1 0 0 / 0.25);
    --media-surface-outer-border-color: transparent;
  }

  &:has(.media-controls:not([data-visible])) {
    /* Slight delay to hide controls on non-touch devices after interaction */
    @media (pointer: fine) {
      --media-controls-transition-duration: 300ms;
    }
    @media (pointer: coarse) {
      --media-controls-transition-duration: 150ms;
    }
    @media (prefers-reduced-motion: reduce) {
      --media-controls-transition-duration: 50ms;
    }
  }

  /* Inner border ring */
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 10;
    border-radius: inherit;
    box-shadow: inset 0 0 0 1px var(--media-border-color);
    pointer-events: none;
  }

  &:fullscreen {
    --media-border-radius: 0;
  }
}

/* ==========================================================================
   Error Dialog
   ========================================================================== */

.media-default-skin--video .media-error {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-default-skin--video .media-error__dialog {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 18rem;
  padding: 0.75rem;
  border-radius: 1.75rem;
  color: oklch(1 0 0);
  text-shadow: 0 1px 0 oklch(0 0 0 / 0.25);
  transition-property: opacity, scale;
  transition-duration: var(--media-error-dialog-transition-duration);
  transition-delay: var(--media-error-dialog-transition-delay);
  transition-timing-function: var(--media-error-dialog-transition-timing-function);
}

.media-default-skin--video .media-error[data-starting-style] .media-error__dialog,
.media-default-skin--video .media-error[data-ending-style] .media-error__dialog {
  opacity: 0;
  scale: 0.5;
}
.media-default-skin--video .media-error[data-ending-style] .media-error__dialog {
  transition-delay: 0ms;
}

.media-default-skin--video .media-error__content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 0.5rem 0.375rem;
  text-shadow: inherit;
}

.media-default-skin--video .media-error__title {
  font-size: 1rem;
}

/* ==========================================================================
   Controls (hide/show behavior)
   ========================================================================== */

.media-default-skin--video .media-controls {
  flex-wrap: wrap;
  position: absolute;
  bottom: 0.5rem;
  inset-inline: 0.5rem;
  z-index: 10;
  color: var(--media-color-primary, oklch(1 0 0));
  transition-duration: var(--media-controls-transition-duration);
  transition-timing-function: var(--media-controls-transition-timing-function);
  transform-origin: bottom;

  @media (pointer: fine) {
    will-change: scale, filter, opacity;
    transition-property: scale, filter, opacity;
  }

  @media (pointer: coarse) {
    will-change: scale, opacity;
    transition-property: scale, opacity;
  }

  &:not([data-visible]) {
    opacity: 0;
    pointer-events: none;
    scale: 0.9;

    @media (pointer: fine) and (prefers-reduced-motion: no-preference) {
      filter: blur(8px);
    }

    @media (prefers-reduced-motion: reduce) {
      scale: 1;
    }
  }

  & .media-time-controls {
    order: -1;
    flex: 0 0 100%;
    padding-inline: 0.625rem;
  }

  & .media-button-group:first-child {
    flex: 1;
    text-align: left;
  }

  & .media-button-group:last-child {
    flex: 1;
    justify-content: end;
  }

  @container media-root (width > 42rem) {
    bottom: 0.75rem;
    inset-inline: 0.75rem;
    flex-wrap: nowrap;
    column-gap: 0.125rem;
    padding: 0.25rem;

    & .media-time-controls {
      order: unset;
      flex: 1;
    }

    & .media-button-group:first-child,
    & .media-button-group:last-child {
      flex: 0 0 auto;
    }
  }
}

.media-default-skin--video .media-error[data-open] ~ .media-controls {
  display: none;
}

/* Hide cursor when controls are hidden */
.media-default-skin--video:has(.media-controls:not([data-visible])) {
  cursor: none;
}

/* ==========================================================================
   Sliders
   ========================================================================== */

.media-default-skin--video .media-slider__track {
  background-color: oklch(1 0 0 / 0.2);
  box-shadow: 0 0 0 1px oklch(0 0 0 / 0.05);
}

.media-default-skin--video .media-slider__preview {
  --media-preview-max-width: 11rem;
  --media-preview-padding: -1.125rem;
  /**
    Inset is the difference between the container width and the slider (100%) width.
    Divided by 2 as we render the time on both sides.
  */
  --media-preview-inset: calc((100cqi - 100%) / 2);

  position: absolute;
  left: clamp(
    calc(var(--media-preview-max-width) / 2 + var(--media-preview-padding) - var(--media-preview-inset)),
    var(--media-slider-pointer),
    calc(100% - var(--media-preview-max-width) / 2 - var(--media-preview-padding) + var(--media-preview-inset))
  );
  bottom: calc(100% + 1.2rem);
  translate: -50%;
  opacity: 0;
  scale: 0.8;
  filter: blur(8px);
  transition-property: scale, opacity, filter;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
  transform-origin: bottom;
  pointer-events: none;

  & .media-preview__thumbnail {
    max-width: var(--media-preview-max-width);
  }

  &:has(.media-preview__thumbnail[data-loading]) {
    max-height: 6rem;
  }
}
.media-default-skin--video .media-slider[data-pointing] .media-slider__preview:has([role="img"]:not([data-hidden])) {
  opacity: 1;
  scale: 1;
  filter: blur(0);
}

```

### Default Audio Skin

*   Skin.tsx*   skin.css

```
import { type type CSSProperties, type type ComponentProps, forwardRef, type type ReactNode } from 'react';
import { createPlayer, Container, usePlayer, ErrorDialog, MuteButton, PlayButton, PlaybackRateButton, Popover, SeekButton, Time, TimeSlider, Tooltip, VolumeSlider, type type Poster, type type RenderProp } from '@videojs/react';
import { Audio, audioFeatures } from '@videojs/react/audio';
import './player.css';

// ================================================================
// Player
// ================================================================

const SEEK_TIME = 10;

export const Player = createPlayer({ features: audioFeatures });

export interface AudioPlayerProps {
  src: string;
  style?: CSSProperties;
  className?: string;
}

/**
 * @example
 * ```tsx
 * <AudioPlayer
 *   src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
 * />
 * ```
 */
export function AudioPlayer({ src, className, ...rest }: AudioPlayerProps): ReactNode {
  return (
    <Player.Provider>
      <Container className={`media-default-skin media-default-skin--audio ${className ?? ''}`} {...rest}>
        <Audio src={src} />

        <ErrorDialog.Root>
          <ErrorDialog.Popup className="media-error">
            <div className="media-error__dialog">
              <div className="media-error__content">
                <ErrorDialog.Title className="media-error__title">Something went wrong.</ErrorDialog.Title>
                <ErrorDialog.Description className="media-error__description" />
              </div>
              <div className="media-error__actions">
                <ErrorDialog.Close className="media-button media-button--subtle">OK</ErrorDialog.Close>
              </div>
            </div>
          </ErrorDialog.Popup>
        </ErrorDialog.Root>

        <div className="media-surface media-controls">
          <Tooltip.Provider>
            <div className="media-button-group">
              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <PlayButton className="media-button--play" render={<Button />}>
                      <RestartIcon className="media-icon media-icon--restart" />
                      <PlayIcon className="media-icon media-icon--play" />
                      <PauseIcon className="media-icon media-icon--pause" />
                    </PlayButton>
                  }
                />
                <Tooltip.Popup className="media-surface media-tooltip">
                  <PlayLabel />
                </Tooltip.Popup>
              </Tooltip.Root>

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <SeekButton seconds={-SEEK_TIME} className="media-button--seek" render={<Button />}>
                      <span className="media-icon__container">
                        <SeekIcon className="media-icon media-icon--seek media-icon--flipped" />
                        <span className="media-icon__label">{SEEK_TIME}</span>
                      </span>
                    </SeekButton>
                  }
                />
                <Tooltip.Popup className="media-surface media-tooltip">Seek backward {SEEK_TIME} seconds</Tooltip.Popup>
              </Tooltip.Root>

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <SeekButton seconds={SEEK_TIME} className="media-button--seek" render={<Button />}>
                      <span className="media-icon__container">
                        <SeekIcon className="media-icon media-icon--seek" />
                        <span className="media-icon__label">{SEEK_TIME}</span>
                      </span>
                    </SeekButton>
                  }
                />
                <Tooltip.Popup className="media-surface media-tooltip">Seek forward {SEEK_TIME} seconds</Tooltip.Popup>
              </Tooltip.Root>
            </div>

            <div className="media-time-controls">
              <Time.Value type="current" className="media-time" />
              <TimeSlider.Root className="media-slider">
                <TimeSlider.Track className="media-slider__track">
                  <TimeSlider.Fill className="media-slider__fill" />
                  <TimeSlider.Buffer className="media-slider__buffer" />
                </TimeSlider.Track>
                <TimeSlider.Thumb className="media-slider__thumb" />
              </TimeSlider.Root>
              <Time.Value type="duration" className="media-time" />
            </div>

            <div className="media-button-group">
              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={<PlaybackRateButton className="media-button--playback-rate" render={<Button />} />}
                />
                <Tooltip.Popup className="media-surface media-tooltip">Toggle playback rate</Tooltip.Popup>
              </Tooltip.Root>

              <VolumePopover />
            </div>
          </Tooltip.Provider>
        </div>
      </Container>

    </Player.Provider>
  );
}

// ================================================================
// Labels
// ================================================================

function PlayLabel(): string {
  const paused = usePlayer((s) => Boolean(s.paused));
  const ended = usePlayer((s) => Boolean(s.ended));
  if (ended) return 'Replay';
  return paused ? 'Play' : 'Pause';
}

// ================================================================
// Components
// ================================================================

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(function Button({ className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={`media-button media-button--subtle media-button--icon ${className ?? ''}`}
      {...props}
    />
  );
});

function VolumePopover(): ReactNode {
  const volumeUnsupported = usePlayer((s) => s.volumeAvailability === 'unsupported');

  const muteButton = (
    <MuteButton className="media-button--mute" render={<Button />}>
      <VolumeOffIcon className="media-icon media-icon--volume-off" />
      <VolumeLowIcon className="media-icon media-icon--volume-low" />
      <VolumeHighIcon className="media-icon media-icon--volume-high" />
    </MuteButton>
  );

  if (volumeUnsupported) return muteButton;

  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
      <Popover.Trigger render={muteButton} />
      <Popover.Popup className="media-surface media-popover media-popover--volume">
        <VolumeSlider.Root className="media-slider" orientation="vertical" thumbAlignment="edge">
          <VolumeSlider.Track className="media-slider__track">
            <VolumeSlider.Fill className="media-slider__fill" />
          </VolumeSlider.Track>
          <VolumeSlider.Thumb className="media-slider__thumb media-slider__thumb--persistent" />
        </VolumeSlider.Root>
      </Popover.Popup>
    </Popover.Root>
  );
}

// ================================================================
// Icons
// ================================================================

function PauseIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><rect width="5" height="14" x="2" y="2" fill="currentColor" rx="1.75"/><rect width="5" height="14" x="11" y="2" fill="currentColor" rx="1.75"/></svg>;
}

function PlayIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="m14.051 10.723-7.985 4.964a1.98 1.98 0 0 1-2.758-.638A2.06 2.06 0 0 1 3 13.964V4.036C3 2.91 3.895 2 5 2c.377 0 .747.109 1.066.313l7.985 4.964a2.057 2.057 0 0 1 .627 2.808c-.16.257-.373.475-.627.637"/></svg>;
}

function RestartIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M9 17a8 8 0 0 1-8-8h2a6 6 0 1 0 1.287-3.713l1.286 1.286A.25.25 0 0 1 5.396 7H1.25A.25.25 0 0 1 1 6.75V2.604a.25.25 0 0 1 .427-.177l1.438 1.438A8 8 0 1 1 9 17"/><path fill="currentColor" d="m11.61 9.639-3.331 2.07a.826.826 0 0 1-1.15-.266.86.86 0 0 1-.129-.452V6.849C7 6.38 7.374 6 7.834 6c.158 0 .312.045.445.13l3.331 2.071a.858.858 0 0 1 0 1.438"/></svg>;
}

function SeekIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M1 9c0 2.21.895 4.21 2.343 5.657l1.414-1.414a6 6 0 1 1 8.956-7.956l-1.286 1.286a.25.25 0 0 0 .177.427h4.146a.25.25 0 0 0 .25-.25V2.604a.25.25 0 0 0-.427-.177l-1.438 1.438A8 8 0 0 0 1 9"/></svg>;
}

function VolumeHighIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M15.6 3.3c-.4-.4-1-.4-1.4 0s-.4 1 0 1.4C15.4 5.9 16 7.4 16 9s-.6 3.1-1.8 4.3c-.4.4-.4 1 0 1.4.2.2.5.3.7.3.3 0 .5-.1.7-.3C17.1 13.2 18 11.2 18 9s-.9-4.2-2.4-5.7"/><path fill="currentColor" d="M.714 6.008h3.072l4.071-3.857c.5-.376 1.143 0 1.143.601V15.28c0 .602-.643.903-1.143.602l-4.071-3.858H.714c-.428 0-.714-.3-.714-.752V6.76c0-.451.286-.752.714-.752m10.568.59a.91.91 0 0 1 0-1.316.91.91 0 0 1 1.316 0c1.203 1.203 1.47 2.216 1.522 3.208q.012.255.011.51c0 1.16-.358 2.733-1.533 3.803a.7.7 0 0 1-.298.156c-.382.106-.873-.011-1.018-.156a.91.91 0 0 1 0-1.316c.57-.57.995-1.551.995-2.487 0-.944-.26-1.667-.995-2.402"/></svg>;
}

function VolumeLowIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M.714 6.008h3.072l4.071-3.857c.5-.376 1.143 0 1.143.601V15.28c0 .602-.643.903-1.143.602l-4.071-3.858H.714c-.428 0-.714-.3-.714-.752V6.76c0-.451.286-.752.714-.752m10.568.59a.91.91 0 0 1 0-1.316.91.91 0 0 1 1.316 0c1.203 1.203 1.47 2.216 1.522 3.208q.012.255.011.51c0 1.16-.358 2.733-1.533 3.803a.7.7 0 0 1-.298.156c-.382.106-.873-.011-1.018-.156a.91.91 0 0 1 0-1.316c.57-.57.995-1.551.995-2.487 0-.944-.26-1.667-.995-2.402"/></svg>;
}

function VolumeOffIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M.714 6.008h3.072l4.071-3.857c.5-.376 1.143 0 1.143.601V15.28c0 .602-.643.903-1.143.602l-4.071-3.858H.714c-.428 0-.714-.3-.714-.752V6.76c0-.451.286-.752.714-.752M14.5 7.586l-1.768-1.768a1 1 0 1 0-1.414 1.414L13.085 9l-1.767 1.768a1 1 0 0 0 1.414 1.414l1.768-1.768 1.768 1.768a1 1 0 0 0 1.414-1.414L15.914 9l1.768-1.768a1 1 0 0 0-1.414-1.414z"/></svg>;
}
```
```
/* ==========================================================================
   Reset
   ========================================================================== */

.media-default-skin *,
.media-default-skin *::before,
.media-default-skin *::after {
  box-sizing: border-box;
}
.media-default-skin img,
.media-default-skin video,
.media-default-skin svg {
  display: block;
  max-width: 100%;
}
.media-default-skin button {
  font: inherit;
}
@media (prefers-reduced-motion: no-preference) {
  .media-default-skin {
    interpolate-size: allow-keywords;
  }
}

/* ==========================================================================
   Root Container
   ========================================================================== */

.media-default-skin {
  container: media-root / inline-size;
  position: relative;
  isolation: isolate;
  display: block;
  height: 100%;
  width: 100%;
  border-radius: var(--media-border-radius, 2rem);
  font-family:
    Inter Variable,
    Inter,
    ui-sans-serif,
    system-ui,
    sans-serif;
  line-height: 1.5;
  letter-spacing: normal;
  -webkit-font-smoothing: auto;
  -moz-osx-font-smoothing: auto;

  & > * {
    font-size: 0.75rem; /* 12px at 100% font size */
  }

  @container media-root (width > 48rem) {
    & > * {
      font-size: 0.875rem; /* 14px at 100% font size */
    }
  }
}

/* ==========================================================================
   Surface (shared glass effect for tooltips, popovers, controls)
   ========================================================================== */

.media-default-skin .media-surface {
  background-color: var(--media-surface-background-color);
  backdrop-filter: var(--media-surface-backdrop-filter);
  box-shadow:
    0 0 0 1px var(--media-surface-outer-border-color),
    0 1px 3px 0 var(--media-surface-shadow-color),
    0 1px 2px -1px var(--media-surface-shadow-color);

  /* Inner border ring */
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 10;
    border-radius: inherit;
    box-shadow: inset 0 0 0 1px var(--media-surface-inner-border-color);
    pointer-events: none;
  }
}

/* ==========================================================================
   Buffering Indicator
   ========================================================================== */

.media-default-skin .media-buffering-indicator {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  color: oklch(1 0 0);
  pointer-events: none;

  &[data-visible] {
    display: flex;
  }

  .media-surface {
    padding: 0.25rem;
    border-radius: 100%;
  }
}

/* ==========================================================================
   Error Dialog
   ========================================================================== */

.media-default-skin .media-error {
  outline: none;
}

.media-default-skin .media-error:not([data-open]) {
  display: none;
}

.media-default-skin .media-error__title {
  font-weight: 600;
  line-height: 1.25;
}

.media-default-skin .media-error__description {
  opacity: 0.7;
  overflow-wrap: anywhere;
}

.media-default-skin .media-error__actions {
  display: flex;
  gap: 0.5rem;

  & > * {
    flex: 1;
  }
}

.media-default-skin .media-error[data-open] ~ .media-controls * {
  visibility: hidden;
}

/* ==========================================================================
   Controls
   ========================================================================== */

.media-default-skin .media-controls {
  container: media-controls / inline-size;
  display: flex;
  align-items: center;
  column-gap: 0.075rem;
  padding: 0.375rem;
  border-radius: 1.5rem;
  --media-controls-current-shadow-color: oklch(from currentColor 0 0 0 / clamp(0, calc((l - 0.5) * 0.5), 0.15));
  --media-controls-current-shadow-color-subtle: oklch(
    from var(--media-controls-current-shadow-color) l c h /
    calc(alpha * 0.4)
  );
  text-shadow: 0 1px 0 var(--media-controls-current-shadow-color);
}

/* ==========================================================================
   Time Display
   ========================================================================== */

.media-default-skin .media-time-controls {
  container: media-time-controls / inline-size;
  display: flex;
  align-items: center;
  flex: 1;
  gap: 0.75rem;
  padding-inline: 0.5rem;
}

.media-default-skin .media-time {
  font-variant-numeric: tabular-nums;
}

/* ==========================================================================
   Buttons
   ========================================================================== */

/* Base button */
.media-default-skin .media-button {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: calc(infinity * 1px);
  outline: 2px solid transparent;
  outline-offset: -2px;
  transition-property: background-color, outline-offset, scale;
  /* Fix weird jumping when clicking on the buttons in Safari. */
  will-change: scale;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
  cursor: pointer;
  user-select: none;
  text-align: center;
  touch-action: manipulation;

  &:focus-visible {
    outline-color: currentColor;
    outline-offset: 2px;
  }

  &:active {
    scale: 0.98;
  }

  &[disabled] {
    opacity: 0.5;
    filter: grayscale(1);
    cursor: not-allowed;
  }

  &[data-availability="unavailable"] {
    display: none;
  }
}

/* Primary button variant */
.media-default-skin .media-button--primary {
  background: oklch(1 0 0);
  color: oklch(0 0 0);
  font-weight: 500;
  text-shadow: none;
}

/* Subtle button variant */
.media-default-skin .media-button--subtle {
  background: transparent;
  color: inherit;
  text-shadow: inherit;

  &:hover,
  &:focus-visible,
  &[aria-expanded="true"] {
    background-color: oklch(from currentColor l c h / 0.1);
    text-decoration: none;
  }
}

/* Icon button variant */
.media-default-skin .media-button--icon {
  display: grid;
  width: 2.25rem;
  padding: 0;
  aspect-ratio: 1;

  &:active {
    scale: 0.9;
  }

  & .media-icon {
    filter: drop-shadow(0 1px 0 var(--media-controls-current-shadow-color, oklch(0 0 0 / 0.25)));
  }
}

/* Seek button */
.media-default-skin .media-button--seek {
  & .media-icon__label {
    position: absolute;
    right: -1px;
    bottom: -3px;
    font-size: 10px;
    font-weight: 480;
    font-variant-numeric: tabular-nums;
  }

  &:has(.media-icon--flipped) .media-icon__label {
    right: unset;
    left: -1px;
  }
}

/* Playback rate button */
.media-default-skin .media-button--playback-rate {
  padding: 0;

  &::after {
    content: attr(data-rate) "\00D7";
    width: 4ch;
    font-variant-numeric: tabular-nums;
  }
}

/* ==========================================================================
   Button Groups
   ========================================================================== */

.media-default-skin .media-button-group {
  display: flex;
  align-items: center;
  gap: 0.075rem;

  @container media-root (width > 42rem) {
    gap: 0.125rem;
  }
}

/* ==========================================================================
   Icons
   ========================================================================== */

.media-default-skin .media-icon__container {
  position: relative;
}
.media-default-skin .media-icon {
  display: block;
  flex-shrink: 0;
  grid-area: 1 / 1;
  width: 18px;
  height: 18px;
  transition-behavior: allow-discrete;
  transition-property: display, opacity;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}
.media-default-skin .media-icon--flipped {
  scale: -1 1;
}

/* ==========================================================================
   Slider
   ========================================================================== */

.media-default-skin .media-slider {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  border-radius: calc(infinity * 1px);
  outline: none;
  cursor: pointer;

  &[data-orientation="horizontal"] {
    min-width: 5rem;
    width: 100%;
    height: 2rem;
  }

  &[data-orientation="vertical"] {
    width: 2rem;
    height: 5rem;
  }
}

/* Track */
.media-default-skin .media-slider__track {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: inherit;
  user-select: none;

  &[data-orientation="horizontal"] {
    width: 100%;
    height: 0.25rem;
  }

  &[data-orientation="vertical"] {
    width: 0.25rem;
    height: 100%;
  }
}

/* Thumb */
.media-default-skin .media-slider__thumb {
  z-index: 10;
  position: absolute;
  translate: -50% -50%;
  width: 0.625rem;
  height: 0.625rem;
  background-color: currentColor;
  border-radius: calc(infinity * 1px);
  box-shadow:
    0 0 0 1px var(--media-controls-current-shadow-color-subtle, oklch(0 0 0 / 0.1)),
    0 1px 3px 0 oklch(0 0 0 / 0.15),
    0 1px 2px -1px oklch(0 0 0 / 0.15);
  opacity: 0;
  transition-property: opacity, height, width, outline-offset;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
  user-select: none;
  outline: 4px solid transparent;
  outline-offset: -4px;

  &[data-orientation="horizontal"] {
    top: 50%;
    left: var(--media-slider-fill);
  }

  &[data-orientation="vertical"] {
    left: 50%;
    top: calc(100% - var(--media-slider-fill));
  }

  &:hover,
  &:focus {
    outline-color: oklch(from currentColor l c h / 0.25);
    outline-offset: 0;
  }

  &::after {
    content: "";
    position: absolute;
    inset: -4px;
    border-radius: inherit;
    box-shadow: 0 0 0 2px oklch(1 0 0);
    transition-property: opacity, scale;
    transition-duration: 150ms;
    transition-timing-function: ease-out;
  }

  &:not(:focus-visible)::after {
    scale: 0.5;
    opacity: 0;
  }
}

.media-default-skin .media-slider:active .media-slider__thumb,
.media-default-skin .media-slider__thumb--persistent {
  width: 0.75rem;
  height: 0.75rem;
}

.media-default-skin .media-slider:hover .media-slider__thumb,
.media-default-skin .media-slider__thumb:focus-visible,
.media-default-skin .media-slider__thumb--persistent {
  opacity: 1;
}

/* Shared track fills */
.media-default-skin .media-slider__buffer,
.media-default-skin .media-slider__fill {
  position: absolute;
  border-radius: inherit;
  pointer-events: none;
}

.media-default-skin .media-slider__buffer[data-orientation="horizontal"],
.media-default-skin .media-slider__fill[data-orientation="horizontal"] {
  inset-block: 0;
  left: 0;
}

.media-default-skin .media-slider__buffer[data-orientation="vertical"],
.media-default-skin .media-slider__fill[data-orientation="vertical"] {
  inset-inline: 0;
  bottom: 0;
}

/* Buffer */
.media-default-skin .media-slider__buffer {
  background-color: oklch(from currentColor l c h / 0.2);
  transition-duration: 0.25s;
  transition-timing-function: ease-out;

  &[data-orientation="horizontal"] {
    width: var(--media-slider-buffer);
    transition-property: width;
  }

  &[data-orientation="vertical"] {
    height: var(--media-slider-buffer);
    transition-property: height;
  }
}

/* Fill */
.media-default-skin .media-slider__fill {
  background-color: currentColor;

  &[data-orientation="horizontal"] {
    width: var(--media-slider-fill);
  }

  &[data-orientation="vertical"] {
    height: var(--media-slider-fill);
  }
}

/* ==========================================================================
   Popups & Tooltips
   ========================================================================== */

.media-default-skin .media-popover,
.media-default-skin .media-tooltip {
  margin: 0;
  border: 0;
  color: inherit;
  overflow: visible;
  transition-property: scale, opacity, filter;
  transition-duration: var(--media-popup-transition-duration);
  transition-timing-function: var(--media-popup-transition-timing-function);

  &[data-starting-style],
  &[data-ending-style] {
    opacity: 0;
    scale: 0.5;
    filter: blur(8px);
  }

  &[data-instant] {
    transition-duration: 0ms;
  }

  &[data-side="top"] {
    transform-origin: bottom;
  }
  &[data-side="bottom"] {
    transform-origin: top;
  }
  &[data-side="left"] {
    transform-origin: right;
  }
  &[data-side="right"] {
    transform-origin: left;
  }

  /* Safe area between trigger and popup */
  &::before {
    content: "";
    position: absolute;
    pointer-events: inherit;
  }

  &[data-side="top"]::before,
  &[data-side="bottom"]::before {
    width: 100%;
    inset-inline: 0;
  }
  &[data-side="top"]::before {
    top: 100%;
  }
  &[data-side="bottom"]::before {
    bottom: 100%;
  }

  &[data-side="left"]::before,
  &[data-side="right"]::before {
    height: 100%;
    inset-block: 0;
  }
  &[data-side="left"]::before {
    left: 100%;
  }
  &[data-side="right"]::before {
    right: 100%;
  }
}

.media-default-skin .media-popover {
  &[data-side="top"]::before,
  &[data-side="bottom"]::before {
    height: var(--media-popover-side-offset);
  }
  &[data-side="left"]::before,
  &[data-side="right"]::before {
    width: var(--media-popover-side-offset);
  }
}
.media-default-skin .media-popover--volume {
  padding: 0.75rem 0;
  border-radius: calc(infinity * 1px);

  &:has(media-volume-slider[data-availability="unsupported"]) {
    display: none;
  }
}

.media-default-skin .media-tooltip {
  padding: 0.25rem 0.625rem;
  border-radius: calc(infinity * 1px);
  font-size: 0.75rem;
  white-space: nowrap;

  &[data-side="top"]::before,
  &[data-side="bottom"]::before {
    height: var(--media-tooltip-side-offset);
  }
  &[data-side="left"]::before,
  &[data-side="right"]::before {
    width: var(--media-tooltip-side-offset);
  }
}

/* ==========================================================================
   Icon State Visibility for Audio Skins

   Data-attribute-driven visibility rules for multi-state icon buttons.
   Uses :is() with both element selectors (for HTML custom element wrappers)
   and class selectors (for React rendered SVG elements).
   ========================================================================== */

/* --- All icons hidden by default --- */

.media-button--play .media-icon--restart,
.media-button--play .media-icon--play,
.media-button--play .media-icon--pause,
.media-button--mute .media-icon--volume-off,
.media-button--mute .media-icon--volume-low,
.media-button--mute .media-icon--volume-high {
  display: none;
  opacity: 0;
}

/* --- Active icon per state --- */

/* Play: ended → restart */
.media-button--play[data-ended] .media-icon--restart,
/* Play: paused (not ended) → play */
.media-button--play:not([data-ended])[data-paused] .media-icon--play,
/* Play: playing (not paused, not ended) → pause */
.media-button--play:not([data-paused]):not([data-ended]) .media-icon--pause,
/* Mute: muted → volume off */
.media-button--mute[data-muted] .media-icon--volume-off,
/* Mute: volume low (not muted) → volume low */
.media-button--mute:not([data-muted])[data-volume-level="low"] .media-icon--volume-low,
/* Mute: volume high (not muted, not low) → volume high */
.media-button--mute:not([data-muted]):not([data-volume-level="low"]) .media-icon--volume-high {
  display: block;
  opacity: 1;
}

/* ==========================================================================
   Tooltip Label State Visibility for Audio Skins

   Data-attribute-driven visibility rules for multi-state tooltip labels.
   Uses adjacent sibling selectors to match button state → tooltip content.
   ========================================================================== */

/* --- All multi-state labels hidden by default --- */

.media-tooltip-label {
  display: none;
}

/* --- Active label per state --- */

/* Play: ended → replay */
.media-button--play[data-ended] + .media-tooltip .media-tooltip-label--replay,
/* Play: paused (not ended) → play */
  .media-button--play:not([data-ended])[data-paused] + .media-tooltip
  .media-tooltip-label--play,
/* Play: playing (not paused, not ended) → pause */
  .media-button--play:not([data-paused]):not([data-ended]) + .media-tooltip
  .media-tooltip-label--pause {
  display: block;
}


/* ==========================================================================
   Root
   ========================================================================== */

.media-default-skin--audio {
  --media-surface-background-color: oklch(1 0 0 / 0.5);
  --media-surface-inner-border-color: oklch(1 0 0 / 0.1);
  --media-surface-outer-border-color: oklch(0 0 0 / 0.05);
  --media-surface-shadow-color: oklch(0 0 0 / 0.15);
  --media-surface-backdrop-filter: blur(16px) saturate(1.5);
  --media-text-color: var(--media-color-primary, oklch(0 0 0));
  --media-error-dialog-transition-duration: 250ms;
  --media-error-dialog-transition-delay: 100ms;
  --media-popup-transition-duration: 100ms;
  --media-popup-transition-timing-function: ease-out;
  --media-tooltip-side-offset: 0.75rem;
  --media-popover-side-offset: 0.75rem;

  @media (prefers-reduced-motion: reduce) {
    --media-error-dialog-transition-duration: 50ms;
    --media-error-dialog-transition-delay: 0ms;
    --media-popup-transition-duration: 0ms;
  }

  @media (prefers-color-scheme: dark) {
    --media-surface-background-color: oklch(0 0 0 / 0.4);
    --media-text-color: var(--media-color-primary, oklch(1 0 0));
  }

  @media (prefers-reduced-transparency: reduce) or (prefers-contrast: more) {
    --media-surface-background-color: oklch(1 0 0);
    --media-surface-outer-border-color: oklch(0 0 0 / 0.05);
  }

  @media (prefers-color-scheme: dark) and ((prefers-reduced-transparency: reduce) or (prefers-contrast: more)) {
    --media-surface-background-color: oklch(0 0 0);
    --media-surface-inner-border-color: oklch(1 0 0 / 0.2);
    --media-surface-outer-border-color: transparent;
  }
}

/* ==========================================================================
   Error Dialog
   ========================================================================== */

.media-default-skin--audio .media-error__dialog {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-inline: 1.25rem 0.125rem;
  transition-property: opacity, filter;
  transition-duration: var(--media-error-dialog-transition-duration);
  transition-delay: var(--media-error-dialog-transition-delay);
  transition-timing-function: ease-out;
  border-radius: calc(infinity * 1px);
  background-color: var(--media-surface-background-color);
  backdrop-filter: var(--media-surface-backdrop-filter);
  color: var(--media-text-color);
}

.media-default-skin .media-error[data-starting-style] .media-error__dialog,
.media-default-skin .media-error[data-ending-style] .media-error__dialog {
  opacity: 0;
  filter: blur(4px);
}
.media-default-skin .media-error[data-ending-style] .media-error__dialog {
  transition-delay: 0ms;
}

.media-default-skin--audio .media-error__content {
  flex: 1;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* ==========================================================================
  Controls
  ========================================================================== */

.media-default-skin--audio .media-controls {
  color: var(--media-text-color);
}

/* ==========================================================================
   Sliders
   ========================================================================== */

.media-default-skin--audio .media-slider__track {
  background-color: oklch(0 0 0 / 0.1);

  @media (prefers-color-scheme: dark) {
    background-color: oklch(1 0 0 / 0.2);
    box-shadow: 0 0 0 1px oklch(0 0 0 / 0.05);
  }
}

```

### Minimal Video Skin

*   Skin.tsx*   skin.css

```
import { type type CSSProperties, type type ComponentProps, forwardRef, type type ReactNode, isValidElement } from 'react';
import { createPlayer, Poster, Container, usePlayer, BufferingIndicator, CaptionsButton, Controls, ErrorDialog, FullscreenButton, MuteButton, PiPButton, PlayButton, PlaybackRateButton, Popover, SeekButton, Slider, Time, TimeSlider, Tooltip, VolumeSlider, type type Poster, type type RenderProp } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';
import './player.css';

// ================================================================
// Player
// ================================================================

const SEEK_TIME = 10;

export const Player = createPlayer({ features: videoFeatures });

export interface VideoPlayerProps {
  src: string;
  style?: CSSProperties;
  className?: string;
  poster?: string | RenderProp<Poster.State> | undefined;
}

/**
 * @example
 * ```tsx
 * <VideoPlayer
 *   src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
 *   poster="https://image.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/thumbnail.webp"
 * />
 * ```
 */
export function VideoPlayer({ src, className, poster, ...rest }: VideoPlayerProps): ReactNode {
  return (
    <Player.Provider>
      <Container className={`media-minimal-skin media-minimal-skin--video ${className ?? ''}`} {...rest}>
        <Video src={src} playsInline />

        {poster && (
          <Poster src={isString(poster) ? poster : undefined} render={isRenderProp(poster) ? poster : undefined} />
        )}

        <BufferingIndicator
          render={(props) => (
            <div {...props} className="media-buffering-indicator">
              <SpinnerIcon className="media-icon" />
            </div>
          )}
        />

        <ErrorDialog.Root>
          <ErrorDialog.Popup className="media-error">
            <div className="media-error__dialog">
              <div className="media-error__content">
                <ErrorDialog.Title className="media-error__title">Something went wrong.</ErrorDialog.Title>
                <ErrorDialog.Description className="media-error__description" />
              </div>
              <div className="media-error__actions">
                <ErrorDialog.Close className="media-button media-button--primary">OK</ErrorDialog.Close>
              </div>
            </div>
          </ErrorDialog.Popup>
        </ErrorDialog.Root>

        <Controls.Root className="media-controls">
          <Tooltip.Provider>
            <div className="media-button-group">
              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <PlayButton className="media-button--play" render={<Button />}>
                      <RestartIcon className="media-icon media-icon--restart" />
                      <PlayIcon className="media-icon media-icon--play" />
                      <PauseIcon className="media-icon media-icon--pause" />
                    </PlayButton>
                  }
                />
                <Tooltip.Popup className="media-tooltip">
                  <PlayLabel />
                </Tooltip.Popup>
              </Tooltip.Root>

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <SeekButton seconds={-SEEK_TIME} className="media-button--seek" render={<Button />}>
                      <span className="media-icon__container">
                        <SeekIcon className="media-icon media-icon--seek media-icon--flipped" />
                        <span className="media-icon__label">{SEEK_TIME}</span>
                      </span>
                    </SeekButton>
                  }
                />
                <Tooltip.Popup className="media-tooltip">Seek backward {SEEK_TIME} seconds</Tooltip.Popup>
              </Tooltip.Root>

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <SeekButton seconds={SEEK_TIME} className="media-button--seek" render={<Button />}>
                      <span className="media-icon__container">
                        <SeekIcon className="media-icon media-icon--seek" />
                        <span className="media-icon__label">{SEEK_TIME}</span>
                      </span>
                    </SeekButton>
                  }
                />
                <Tooltip.Popup className="media-tooltip">Seek forward {SEEK_TIME} seconds</Tooltip.Popup>
              </Tooltip.Root>
            </div>

            <div className="media-time-controls">
              <Time.Group className="media-time-group">
                <Time.Value type="current" className="media-time media-time--current" />
                <Time.Separator className="media-time-separator" />
                <Time.Value type="duration" className="media-time media-time--duration" />
              </Time.Group>

              <TimeSlider.Root className="media-slider">
                <TimeSlider.Track className="media-slider__track">
                  <TimeSlider.Fill className="media-slider__fill" />
                  <TimeSlider.Buffer className="media-slider__buffer" />
                </TimeSlider.Track>
                <TimeSlider.Thumb className="media-slider__thumb" />

                <div className="media-preview media-slider__preview">
                  <div className="media-preview__thumbnail-wrapper">
                    <Slider.Thumbnail className="media-preview__thumbnail" />
                  </div>
                  <TimeSlider.Value type="pointer" className="media-time media-preview__time" />
                  <SpinnerIcon className="media-preview__spinner media-icon" />
                </div>
              </TimeSlider.Root>
            </div>

            <div className="media-button-group">
              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={<PlaybackRateButton className="media-button--playback-rate" render={<Button />} />}
                />
                <Tooltip.Popup className="media-tooltip">Toggle playback rate</Tooltip.Popup>
              </Tooltip.Root>

              <VolumePopover />

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <CaptionsButton className="media-button--captions" render={<Button />}>
                      <CaptionsOffIcon className="media-icon media-icon--captions-off" />
                      <CaptionsOnIcon className="media-icon media-icon--captions-on" />
                    </CaptionsButton>
                  }
                />
                <Tooltip.Popup className="media-tooltip">
                  <CaptionsLabel />
                </Tooltip.Popup>
              </Tooltip.Root>

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <PiPButton className="media-button--pip" render={<Button />}>
                      <PipEnterIcon className="media-icon media-icon--pip-enter" />
                      <PipExitIcon className="media-icon media-icon--pip-exit" />
                    </PiPButton>
                  }
                />
                <Tooltip.Popup className="media-tooltip">
                  <PiPLabel />
                </Tooltip.Popup>
              </Tooltip.Root>

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <FullscreenButton className="media-button--fullscreen" render={<Button />}>
                      <FullscreenEnterIcon className="media-icon media-icon--fullscreen-enter" />
                      <FullscreenExitIcon className="media-icon media-icon--fullscreen-exit" />
                    </FullscreenButton>
                  }
                />
                <Tooltip.Popup className="media-tooltip">
                  <FullscreenLabel />
                </Tooltip.Popup>
              </Tooltip.Root>
            </div>
          </Tooltip.Provider>
        </Controls.Root>

        <div className="media-overlay" />
      </Container>

    </Player.Provider>
  );
}

// ================================================================
// Labels
// ================================================================

function PlayLabel(): string {
  const paused = usePlayer((s) => Boolean(s.paused));
  const ended = usePlayer((s) => Boolean(s.ended));
  if (ended) return 'Replay';
  return paused ? 'Play' : 'Pause';
}

function CaptionsLabel(): string {
  const active = usePlayer((s) => Boolean(s.subtitlesShowing));
  return active ? 'Disable captions' : 'Enable captions';
}

function PiPLabel(): string {
  const pip = usePlayer((s) => Boolean(s.pip));
  return pip ? 'Exit picture-in-picture' : 'Enter picture-in-picture';
}

function FullscreenLabel(): string {
  const fullscreen = usePlayer((s) => Boolean(s.fullscreen));
  return fullscreen ? 'Exit fullscreen' : 'Enter fullscreen';
}

// ================================================================
// Components
// ================================================================

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(function Button({ className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={`media-button media-button--subtle media-button--icon ${className ?? ''}`}
      {...props}
    />
  );
});

function VolumePopover(): ReactNode {
  const volumeUnsupported = usePlayer((s) => s.volumeAvailability === 'unsupported');

  const muteButton = (
    <MuteButton className="media-button--mute" render={<Button />}>
      <VolumeOffIcon className="media-icon media-icon--volume-off" />
      <VolumeLowIcon className="media-icon media-icon--volume-low" />
      <VolumeHighIcon className="media-icon media-icon--volume-high" />
    </MuteButton>
  );

  if (volumeUnsupported) return muteButton;

  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
      <Popover.Trigger render={muteButton} />
      <Popover.Popup className="media-popover media-popover--volume">
        <VolumeSlider.Root className="media-slider" orientation="vertical" thumbAlignment="edge">
          <VolumeSlider.Track className="media-slider__track">
            <VolumeSlider.Fill className="media-slider__fill" />
          </VolumeSlider.Track>
          <VolumeSlider.Thumb className="media-slider__thumb media-slider__thumb--persistent" />
        </VolumeSlider.Root>
      </Popover.Popup>
    </Popover.Root>
  );
}

// ================================================================
// Utilities
// ================================================================

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isRenderProp(value: unknown): value is RenderProp<any> {
  return typeof value === 'function' || isValidElement(value);
}

// ================================================================
// Icons
// ================================================================

function CaptionsOffIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><rect width="16.5" height="12.5" x=".75" y="2.75" stroke="currentColor" strokeWidth="1.5" rx="3"/><rect width="3" height="1.5" x="3" y="8.5" fill="currentColor" rx=".75"/><rect width="2" height="1.5" x="13" y="8.5" fill="currentColor" rx=".75"/><rect width="4" height="1.5" x="11" y="11.5" fill="currentColor" rx=".75"/><rect width="5" height="1.5" x="7" y="8.5" fill="currentColor" rx=".75"/><rect width="7" height="1.5" x="3" y="11.5" fill="currentColor" rx=".75"/></svg>;
}

function CaptionsOnIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M15 2a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zM3.75 11.5a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5zm8 0a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5zm-8-3a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5zm4 0a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5zm6 0a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5z"/></svg>;
}

function FullscreenEnterIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M15.25 2a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V3.5h-3.75a.75.75 0 0 1-.743-.648L10 2.75a.75.75 0 0 1 .75-.75z"/><path fill="currentColor" d="M14.72 2.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06zM2.75 10a.75.75 0 0 1 .75.75v3.75h3.75a.75.75 0 0 1 .743.648L8 15.25a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 1 .75-.75"/><path fill="currentColor" d="M6.72 10.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06z"/></svg>;
}

function FullscreenExitIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M10.75 2a.75.75 0 0 1 .75.75V6.5h3.75a.75.75 0 0 1 .743.648L16 7.25a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 1 .75-.75"/><path fill="currentColor" d="M14.72 2.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06zM7.25 10a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V11.5H2.75a.75.75 0 0 1-.743-.648L2 10.75a.75.75 0 0 1 .75-.75z"/><path fill="currentColor" d="M6.72 10.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06z"/></svg>;
}

function PauseIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><rect width="4" height="12" x="3" y="3" fill="currentColor" rx="1.75"/><rect width="4" height="12" x="11" y="3" fill="currentColor" rx="1.75"/></svg>;
}

function PipEnterIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M13 2a4 4 0 0 1 4 4v2.645a3.5 3.5 0 0 0-1-.145h-.5V6A2.5 2.5 0 0 0 13 3.5H4A2.5 2.5 0 0 0 1.5 6v6A2.5 2.5 0 0 0 4 14.5h2.5v.5c0 .347.05.683.145 1H4a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z"/><rect width="10" height="7" x="8" y="10" fill="currentColor" rx="2"/><path fill="currentColor" d="M7.25 10A.75.75 0 0 0 8 9.25v-3.5a.75.75 0 0 0-1.5 0V8.5H3.75a.75.75 0 0 0-.743.648L3 9.25c0 .414.336.75.75.75z"/><path fill="currentColor" d="M6.72 9.78a.75.75 0 0 0 1.06-1.06l-3.5-3.5a.75.75 0 0 0-1.06 1.06z"/></svg>;
}

function PipExitIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M13 2a4 4 0 0 1 4 4v2.646a3.5 3.5 0 0 0-1-.146h-.5V6A2.5 2.5 0 0 0 13 3.5H4A2.5 2.5 0 0 0 1.5 6v6A2.5 2.5 0 0 0 4 14.5h2.5v.5q.002.523.146 1H4a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z"/><rect width="10" height="7" x="8" y="10" fill="currentColor" rx="2"/><path fill="currentColor" d="M3.75 5a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0V6.5h2.75a.75.75 0 0 0 .743-.648L8 5.75A.75.75 0 0 0 7.25 5z"/><path fill="currentColor" d="M4.28 5.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06-1.06z"/></svg>;
}

function PlayIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="m13.473 10.476-6.845 4.256a1.697 1.697 0 0 1-2.364-.547 1.77 1.77 0 0 1-.264-.93v-8.51C4 3.78 4.768 3 5.714 3c.324 0 .64.093.914.268l6.845 4.255a1.763 1.763 0 0 1 0 2.953"/></svg>;
}

function RestartIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M9 17a8 8 0 0 1-8-8h1.5a6.5 6.5 0 1 0 1.43-4.07l1.643 1.643A.25.25 0 0 1 5.396 7H1.25A.25.25 0 0 1 1 6.75V2.604a.25.25 0 0 1 .427-.177l1.438 1.438A8 8 0 1 1 9 17"/><path fill="currentColor" d="m11.61 9.639-3.331 2.07a.826.826 0 0 1-1.15-.266.86.86 0 0 1-.129-.452V6.849C7 6.38 7.374 6 7.834 6c.158 0 .312.045.445.13l3.331 2.071a.858.858 0 0 1 0 1.438"/></svg>;
}

function SeekIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M1 9c0 2.21.895 4.21 2.343 5.657l1.06-1.06a6.5 6.5 0 1 1 9.665-8.665l-1.641 1.641a.25.25 0 0 0 .177.427h4.146a.25.25 0 0 0 .25-.25V2.604a.25.25 0 0 0-.427-.177l-1.438 1.438A8 8 0 0 0 1 9"/></svg>;
}

function SpinnerIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" aria-hidden="true" viewBox="0 0 18 18" {...props}><rect width="2" height="5" x="8" y=".5" opacity=".5" rx="1"><animate attributeName="opacity" begin="0s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="2" height="5" x="12.243" y="2.257" opacity=".45" rx="1" transform="rotate(45 13.243 4.757)"><animate attributeName="opacity" begin="0.125s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="5" height="2" x="12.5" y="8" opacity=".4" rx="1"><animate attributeName="opacity" begin="0.25s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="5" height="2" x="10.743" y="12.243" opacity=".35" rx="1" transform="rotate(45 13.243 13.243)"><animate attributeName="opacity" begin="0.375s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="2" height="5" x="8" y="12.5" opacity=".3" rx="1"><animate attributeName="opacity" begin="0.5s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="2" height="5" x="3.757" y="10.743" opacity=".25" rx="1" transform="rotate(45 4.757 13.243)"><animate attributeName="opacity" begin="0.625s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="5" height="2" x=".5" y="8" opacity=".15" rx="1"><animate attributeName="opacity" begin="0.75s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="5" height="2" x="2.257" y="3.757" opacity=".1" rx="1" transform="rotate(45 4.757 4.757)"><animate attributeName="opacity" begin="0.875s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect></svg>;
}

function VolumeHighIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M15.6 3.3c-.4-.4-1-.4-1.4 0s-.4 1 0 1.4C15.4 5.9 16 7.4 16 9s-.6 3.1-1.8 4.3c-.4.4-.4 1 0 1.4.2.2.5.3.7.3.3 0 .5-.1.7-.3C17.1 13.2 18 11.2 18 9s-.9-4.2-2.4-5.7"/><path fill="currentColor" d="M.714 6.008h3.072l4.071-3.857c.5-.376 1.143 0 1.143.601V15.28c0 .602-.643.903-1.143.602l-4.071-3.858H.714c-.428 0-.714-.3-.714-.752V6.76c0-.451.286-.752.714-.752m10.568.59a.91.91 0 0 1 0-1.316.91.91 0 0 1 1.316 0c1.203 1.203 1.47 2.216 1.522 3.208q.012.255.011.51c0 1.16-.358 2.733-1.533 3.803a.7.7 0 0 1-.298.156c-.382.106-.873-.011-1.018-.156a.91.91 0 0 1 0-1.316c.57-.57.995-1.551.995-2.487 0-.944-.26-1.667-.995-2.402"/></svg>;
}

function VolumeLowIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M.714 6.008h3.072l4.071-3.857c.5-.376 1.143 0 1.143.601V15.28c0 .602-.643.903-1.143.602l-4.071-3.858H.714c-.428 0-.714-.3-.714-.752V6.76c0-.451.286-.752.714-.752m10.568.59a.91.91 0 0 1 0-1.316.91.91 0 0 1 1.316 0c1.203 1.203 1.47 2.216 1.522 3.208q.012.255.011.51c0 1.16-.358 2.733-1.533 3.803a.7.7 0 0 1-.298.156c-.382.106-.873-.011-1.018-.156a.91.91 0 0 1 0-1.316c.57-.57.995-1.551.995-2.487 0-.944-.26-1.667-.995-2.402"/></svg>;
}

function VolumeOffIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M.714 6.008h3.072l4.071-3.857c.5-.376 1.143 0 1.143.601V15.28c0 .602-.643.903-1.143.602l-4.071-3.858H.714c-.428 0-.714-.3-.714-.752V6.76c0-.451.286-.752.714-.752M14.5 7.586l-1.768-1.768a1 1 0 1 0-1.414 1.414L13.085 9l-1.767 1.768a1 1 0 0 0 1.414 1.414l1.768-1.768 1.768 1.768a1 1 0 0 0 1.414-1.414L15.914 9l1.768-1.768a1 1 0 0 0-1.414-1.414z"/></svg>;
}
```
```
/* ==========================================================================
   Reset
   ========================================================================== */

.media-minimal-skin *,
.media-minimal-skin *::before,
.media-minimal-skin *::after {
  box-sizing: border-box;
}
.media-minimal-skin img,
.media-minimal-skin video,
.media-minimal-skin svg {
  display: block;
  max-width: 100%;
}
.media-minimal-skin button {
  font: inherit;
}
@media (prefers-reduced-motion: no-preference) {
  .media-minimal-skin {
    interpolate-size: allow-keywords;
  }
}

/* ==========================================================================
   Root Container
   ========================================================================== */

.media-minimal-skin {
  container: media-root / inline-size;
  position: relative;
  isolation: isolate;
  display: block;
  height: 100%;
  width: 100%;
  border-radius: var(--media-border-radius, 0.75rem);
  font-family:
    Inter Variable,
    Inter,
    ui-sans-serif,
    system-ui,
    sans-serif;
  line-height: 1.5;
  letter-spacing: normal;
  -webkit-font-smoothing: auto;
  -moz-osx-font-smoothing: auto;

  & > * {
    font-size: 0.75rem; /* 12px at 100% font size */
  }

  @container media-root (width > 48rem) {
    & > * {
      font-size: 0.875rem; /* 14px at 100% font size */
    }
  }
}

/* ==========================================================================
   Media Element
   ========================================================================== */

.media-minimal-skin ::slotted(video),
.media-minimal-skin video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: var(--media-object-fit, contain);
  object-position: var(--media-object-position, center);
}
.media-minimal-skin ::slotted(video) {
  border-radius: var(--media-video-border-radius);
}
.media-minimal-skin video {
  border-radius: inherit;
}

.media-minimal-skin:fullscreen ::slotted(video),
.media-minimal-skin:fullscreen video {
  object-fit: contain;
}

/* ==========================================================================
   Overlay / Scrim
   ========================================================================== */

.media-minimal-skin .media-overlay {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image: linear-gradient(to top, oklch(0 0 0 / 0.7), oklch(0 0 0 / 0.5) 7.5rem, oklch(0 0 0 / 0));
  backdrop-filter: blur(0) saturate(1);
  opacity: 0;
  pointer-events: none;
  transition-property: opacity, backdrop-filter;
  transition-duration: var(--media-controls-transition-duration);
  transition-timing-function: ease-out;
}

.media-minimal-skin .media-error ~ .media-overlay {
  transition-duration: var(--media-error-dialog-transition-duration);
  transition-delay: var(--media-error-dialog-transition-delay);
}

.media-minimal-skin .media-controls[data-visible] ~ .media-overlay,
.media-minimal-skin .media-error[data-open] ~ .media-overlay {
  opacity: 1;
}

.media-minimal-skin .media-error[data-open] ~ .media-overlay {
  backdrop-filter: blur(16px) saturate(1.2);
}

/* ==========================================================================
   Buffering Indicator
   ========================================================================== */

.media-minimal-skin .media-buffering-indicator {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  color: oklch(1 0 0);
  pointer-events: none;

  &[data-visible] {
    display: flex;
  }
}

/* ==========================================================================
   Error Dialog
   ========================================================================== */

.media-minimal-skin .media-error:not([data-open]) {
  display: none;
}

.media-minimal-skin .media-error__title {
  font-weight: 600;
  line-height: 1.25;
}

.media-minimal-skin .media-error__description {
  opacity: 0.7;
  overflow-wrap: anywhere;
}

.media-minimal-skin .media-error__actions {
  display: flex;
  gap: 0.5rem;

  & > * {
    flex: 1;
  }
}

.media-minimal-skin .media-error[data-open] ~ .media-controls * {
  visibility: hidden;
}

/* ==========================================================================
   Controls
   ========================================================================== */

.media-minimal-skin .media-controls {
  container: media-controls / inline-size;
  display: flex;
  align-items: center;
  --media-controls-current-shadow-color: oklch(from currentColor 0 0 0 / clamp(0, calc((l - 0.5) * 0.5), 0.15));
  --media-controls-current-shadow-color-subtle: oklch(
    from var(--media-controls-current-shadow-color) l c h /
    calc(alpha * 0.4)
  );
  background-color: var(--media-controls-background-color);
  backdrop-filter: var(--media-controls-backdrop-filter);
  text-shadow: 0 1px 0 var(--media-controls-current-shadow-color);
}

/* ==========================================================================
   Time Controls & Display
   ========================================================================== */

.media-minimal-skin .media-time-controls {
  container: media-time-controls / inline-size;
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  flex: 1;
  gap: 0.75rem;
}

.media-minimal-skin .media-time-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.media-minimal-skin .media-time {
  font-variant-numeric: tabular-nums;
}

.media-minimal-skin .media-time--current,
.media-minimal-skin .media-time-separator {
  display: none;
}

@container media-root (width > 42rem) {
  .media-minimal-skin .media-time-controls {
    flex-direction: row;
  }

  .media-minimal-skin .media-time--duration,
  .media-minimal-skin .media-time-separator {
    color: oklch(from currentColor l c h / 0.6);
  }

  .media-minimal-skin .media-time--current,
  .media-minimal-skin .media-time-separator {
    display: inline;
  }
}

/* ==========================================================================
   Buttons
   ========================================================================== */

/* Base button */
.media-minimal-skin .media-button {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  outline: 2px solid transparent;
  outline-offset: -2px;
  transition-property: background-color, outline-offset, scale;
  /* Fix weird jumping when clicking on the buttons in Safari. */
  will-change: scale;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
  cursor: pointer;
  user-select: none;
  text-align: center;
  touch-action: manipulation;

  &:focus-visible {
    outline-color: currentColor;
    outline-offset: 2px;
  }

  &:active {
    scale: 0.98;
  }

  &[disabled] {
    opacity: 0.5;
    filter: grayscale(1);
    cursor: not-allowed;
  }

  &[data-availability="unavailable"] {
    display: none;
  }
}

/* biome-ignore lint/correctness/noUnknownProperty: corner-shape is an emerging CSS spec */
@supports (corner-shape: squircle) {
  .media-minimal-skin .media-button {
    border-radius: 1rem;
    /* biome-ignore lint/correctness/noUnknownProperty: corner-shape is an emerging CSS spec */
    corner-shape: squircle;
  }
}

/* Primary button variant */
.media-minimal-skin .media-button--primary {
  background: oklch(1 0 0);
  color: oklch(0 0 0);
  font-weight: 500;
  text-shadow: none;
}

/* Subtle button variant */
.media-minimal-skin .media-button--subtle {
  background: transparent;
  color: inherit;
  text-shadow: inherit;

  &:hover,
  &:focus-visible,
  &[aria-expanded="true"] {
    background: oklch(from currentColor l c h / 0.1);
  }
}

/* Icon button variant */
.media-minimal-skin .media-button--icon {
  display: grid;
  width: 2.375rem;
  padding: 0;
  aspect-ratio: 1;

  &:active {
    scale: 0.9;
  }

  & .media-icon {
    filter: drop-shadow(0 1px 0 var(--media-controls-current-shadow-color, oklch(0 0 0 / 0.25)));
  }
}

/* Seek button */
.media-minimal-skin .media-button--seek {
  & .media-icon__label {
    position: absolute;
    right: -1px;
    bottom: -3px;
    font-size: 10px; /* Hard coded due to size limitations. */
    font-weight: 480;
    font-variant-numeric: tabular-nums;
  }

  &:has(.media-icon--flipped) .media-icon__label {
    right: unset;
    left: -1px;
  }
}

/* Playback rate button */
.media-minimal-skin .media-button--playback-rate {
  padding: 0;

  &::after {
    content: attr(data-rate) "\00D7";
    width: 4ch;
    font-variant-numeric: tabular-nums;
  }
}

/* ==========================================================================
   Button Groups
   ========================================================================== */

.media-minimal-skin .media-button-group {
  display: flex;
  align-items: center;
  gap: 0.075rem;

  @container media-root (width > 42rem) {
    gap: 0.125rem;
  }
}

/* ==========================================================================
   Icons
   ========================================================================== */

.media-minimal-skin .media-icon__container {
  position: relative;
}
.media-minimal-skin .media-icon {
  display: block;
  flex-shrink: 0;
  grid-area: 1 / 1;
  width: 18px;
  height: 18px;
  transition-behavior: allow-discrete;
  transition-property: display, opacity;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}
.media-minimal-skin .media-icon--flipped {
  scale: -1 1;
}

/* ==========================================================================
   Poster Image
   ========================================================================== */

.media-minimal-skin media-poster,
.media-minimal-skin > img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.25s;
  pointer-events: none;
}
.media-minimal-skin media-poster:not([data-visible]),
.media-minimal-skin > img:not([data-visible]) {
  opacity: 0;
}
.media-minimal-skin media-poster ::slotted(img) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: var(--media-object-fit, contain);
  object-position: var(--media-object-position, center);
  border-radius: var(--media-video-border-radius);
}
.media-minimal-skin > img {
  object-fit: var(--media-object-fit, contain);
  object-position: var(--media-object-position, center);
  border-radius: inherit;
}

.media-minimal-skin:fullscreen media-poster ::slotted(img),
.media-minimal-skin:fullscreen > img {
  object-fit: contain;
}

/* ==========================================================================
   Media preview
   ========================================================================== */
.media-minimal-skin .media-preview {
  pointer-events: none;

  & .media-preview__thumbnail-wrapper {
    position: relative;
    border-radius: 0.5rem;
    background-color: oklch(0 0 0 / 0.9);
  }
  & .media-preview__thumbnail {
    display: block;
    border-radius: inherit;
  }

  & .media-preview__time {
    display: block;
    text-align: center;
    margin-top: 0.5rem;
  }

  & .media-overlay {
    opacity: 1;
  }

  & .media-preview__spinner {
    position: absolute;
    top: 50%;
    left: 50%;
    translate: -50% -50%;
    opacity: 0;
  }

  & .media-preview__thumbnail,
  & .media-preview__spinner {
    transition: opacity 150ms ease-out;
  }

  &:has(.media-preview__thumbnail[data-loading]) {
    & .media-preview__thumbnail {
      opacity: 0;
    }
    & .media-preview__spinner {
      opacity: 1;
    }
  }
}

/* ==========================================================================
   Slider
   ========================================================================== */

.media-minimal-skin .media-slider {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  border-radius: calc(infinity * 1px);
  outline: none;
  cursor: pointer;

  &[data-orientation="horizontal"] {
    min-width: 5rem;
    width: 100%;
    height: 2rem;
  }

  &[data-orientation="vertical"] {
    width: 2rem;
    height: 4.5rem;
  }
}

/* Track */
.media-minimal-skin .media-slider__track {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: inherit;
  user-select: none;
  background-color: oklch(from currentColor l c h / 0.2);

  &[data-orientation="horizontal"] {
    width: 100%;
    height: 0.1875rem;
  }

  &[data-orientation="vertical"] {
    width: 0.1875rem;
    height: 100%;
  }
}

/* Thumb */
.media-minimal-skin .media-slider__thumb {
  position: absolute;
  translate: -50% -50%;
  z-index: 10;
  width: 0.75rem;
  height: 0.75rem;
  background-color: currentColor;
  border-radius: calc(infinity * 1px);
  box-shadow:
    0 0 0 1px var(--media-controls-current-shadow-color-subtle, oklch(0 0 0 / 0.1)),
    0 1px 3px 0 oklch(0 0 0 / 0.15),
    0 1px 2px -1px oklch(0 0 0 / 0.15);
  opacity: 0;
  scale: 0.7;
  transform-origin: center;
  transition-property: opacity, scale, outline-offset;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
  user-select: none;
  outline: 2px solid transparent;
  outline-offset: -2px;

  &[data-orientation="horizontal"] {
    top: 50%;
    left: var(--media-slider-fill);
  }

  &[data-orientation="vertical"] {
    left: 50%;
    top: calc(100% - var(--media-slider-fill));
  }

  &:focus-visible {
    outline-color: currentColor;
    outline-offset: 2px;
  }
}

.media-minimal-skin .media-slider:hover .media-slider__thumb,
.media-minimal-skin .media-slider:focus-within .media-slider__thumb,
.media-minimal-skin .media-slider__thumb--persistent {
  opacity: 1;
  scale: 1;
}

/* Shared track fills */
.media-minimal-skin .media-slider__buffer,
.media-minimal-skin .media-slider__fill {
  position: absolute;
  border-radius: inherit;
  pointer-events: none;
}

.media-minimal-skin .media-slider__buffer[data-orientation="horizontal"],
.media-minimal-skin .media-slider__fill[data-orientation="horizontal"] {
  inset-block: 0;
  left: 0;
}

.media-minimal-skin .media-slider__buffer[data-orientation="vertical"],
.media-minimal-skin .media-slider__fill[data-orientation="vertical"] {
  inset-inline: 0;
  bottom: 0;
}

/* Buffer */
.media-minimal-skin .media-slider__buffer {
  background-color: oklch(from currentColor l c h / 0.2);
  transition-duration: 0.25s;
  transition-timing-function: ease-out;

  &[data-orientation="horizontal"] {
    width: var(--media-slider-buffer);
    transition-property: width;
  }

  &[data-orientation="vertical"] {
    height: var(--media-slider-buffer);
    transition-property: height;
  }
}

/* Fill */
.media-minimal-skin .media-slider__fill {
  background-color: currentColor;

  &[data-orientation="horizontal"] {
    width: var(--media-slider-fill);
  }

  &[data-orientation="vertical"] {
    height: var(--media-slider-fill);
  }
}

/* ==========================================================================
   Popups & Animations
   ========================================================================== */

.media-minimal-skin .media-popover,
.media-minimal-skin .media-tooltip {
  margin: 0;
  border: 0;
  color: inherit;
  overflow: visible;
  transition-property: scale, opacity, filter;
  transition-duration: var(--media-popup-transition-duration);
  transition-timing-function: var(--media-popup-transition-timing-function);

  &[data-starting-style],
  &[data-ending-style] {
    opacity: 0;
    scale: 0.5;
    filter: blur(8px);
  }

  &[data-instant] {
    transition-duration: 0ms;
  }

  &[data-side="top"] {
    transform-origin: bottom;
  }
  &[data-side="bottom"] {
    transform-origin: top;
  }
  &[data-side="left"] {
    transform-origin: right;
  }
  &[data-side="right"] {
    transform-origin: left;
  }

  /* Safe area between trigger and popup */
  &::before {
    content: "";
    position: absolute;
    pointer-events: inherit;
  }

  &[data-side="top"]::before,
  &[data-side="bottom"]::before {
    width: 100%;
    inset-inline: 0;
  }
  &[data-side="top"]::before {
    top: 100%;
  }
  &[data-side="bottom"]::before {
    bottom: 100%;
  }

  &[data-side="left"]::before,
  &[data-side="right"]::before {
    height: 100%;
    inset-block: 0;
  }
  &[data-side="left"]::before {
    left: 100%;
  }
  &[data-side="right"]::before {
    right: 100%;
  }
}

.media-minimal-skin .media-popover {
  &[data-side="top"]::before,
  &[data-side="bottom"]::before {
    height: var(--media-popover-side-offset);
  }
  &[data-side="left"]::before,
  &[data-side="right"]::before {
    width: var(--media-popover-side-offset);
  }
}

.media-minimal-skin .media-tooltip {
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  background-color: var(--media-tooltip-background-color);
  backdrop-filter: var(--media-tooltip-backdrop-filter);
  box-shadow:
    0 0 0 1px var(--media-tooltip-border-color),
    0 4px 6px -1px oklch(0 0 0 / 0.1),
    0 2px 4px -2px oklch(0 0 0 / 0.1);
  color: var(--media-tooltip-text-color);
  font-size: 0.75rem; /* 12px at 100% font size */
  white-space: nowrap;

  &[data-side="top"]::before,
  &[data-side="bottom"]::before {
    height: var(--media-tooltip-side-offset);
  }
  &[data-side="left"]::before,
  &[data-side="right"]::before {
    width: var(--media-tooltip-side-offset);
  }
}

.media-minimal-skin .media-popover--volume:has(media-volume-slider[data-availability="unsupported"]) {
  display: none;
}

/* ==========================================================================
   Native Caption Track
   ========================================================================== */

.media-minimal-skin {
  --media-caption-track-duration: var(--media-controls-transition-duration);
  --media-caption-track-delay: 25ms;
  --media-caption-track-y: -0.5rem;

  &:has(.media-controls[data-visible]) {
    --media-caption-track-y: -5rem;
  }

  @container media-root (width > 42rem) {
    &:has(.media-controls[data-visible]) > * {
      --media-caption-track-y: -3rem;
    }
  }
}

.media-minimal-skin video::-webkit-media-text-track-container {
  transition: translate var(--media-caption-track-duration) ease-out;
  transition-delay: var(--media-caption-track-delay);
  translate: 0 var(--media-caption-track-y);
  scale: 0.98;
  z-index: 1;
  font-family: inherit;
}

/* ==========================================================================
   Icon State Visibility for Video Skins

   Data-attribute-driven visibility rules for multi-state icon buttons.
   Uses :is() with both element selectors (for HTML custom element wrappers)
   and class selectors (for React rendered SVG elements).
   ========================================================================== */

/* --- All icons hidden by default --- */

.media-button--play .media-icon--restart,
.media-button--play .media-icon--play,
.media-button--play .media-icon--pause,
.media-button--mute .media-icon--volume-off,
.media-button--mute .media-icon--volume-low,
.media-button--mute .media-icon--volume-high,
.media-button--fullscreen .media-icon--fullscreen-enter,
.media-button--fullscreen .media-icon--fullscreen-exit,
.media-button--pip .media-icon--pip-enter,
.media-button--pip .media-icon--pip-exit,
.media-button--captions .media-icon--captions-off,
.media-button--captions .media-icon--captions-on {
  display: none;
  opacity: 0;
}

/* --- Active icon per state --- */

/* Play: ended → restart */
.media-button--play[data-ended] .media-icon--restart,
/* Play: paused (not ended) → play */
.media-button--play:not([data-ended])[data-paused] .media-icon--play,
/* Play: playing (not paused, not ended) → pause */
.media-button--play:not([data-paused]):not([data-ended]) .media-icon--pause,
/* Mute: muted → volume off */
.media-button--mute[data-muted] .media-icon--volume-off,
/* Mute: volume low (not muted) → volume low */
.media-button--mute:not([data-muted])[data-volume-level="low"] .media-icon--volume-low,
/* Mute: volume high (not muted, not low) → volume high */
.media-button--mute:not([data-muted]):not([data-volume-level="low"]) .media-icon--volume-high,
/* Fullscreen: not fullscreen → enter */
.media-button--fullscreen:not([data-fullscreen]) .media-icon--fullscreen-enter,
/* Fullscreen: fullscreen → exit */
.media-button--fullscreen[data-fullscreen] .media-icon--fullscreen-exit,
/* Picture-in-Picture: not active → enter */
.media-button--pip:not([data-pip]) .media-icon--pip-enter,
/* Picture-in-Picture: active → exit */
.media-button--pip[data-pip] .media-icon--pip-exit,
/* Captions: not active → captions off */
.media-button--captions:not([data-active]) .media-icon--captions-off,
/* Captions: active → captions on */
.media-button--captions[data-active] .media-icon--captions-on {
  display: block;
  opacity: 1;
}

/* ==========================================================================
   Tooltip Label State Visibility for Video Skins

   Data-attribute-driven visibility rules for multi-state tooltip labels.
   Uses adjacent sibling selectors to match button state → tooltip content.
   ========================================================================== */

/* --- All multi-state labels hidden by default --- */

.media-tooltip-label {
  display: none;
}

/* --- Active label per state --- */

/* Play: ended → replay */
.media-button--play[data-ended] + .media-tooltip .media-tooltip-label--replay,
/* Play: paused (not ended) → play */
  .media-button--play:not([data-ended])[data-paused] + .media-tooltip
  .media-tooltip-label--play,
/* Play: playing (not paused, not ended) → pause */
  .media-button--play:not([data-paused]):not([data-ended]) + .media-tooltip
  .media-tooltip-label--pause,
/* Fullscreen: not fullscreen → enter */
  .media-button--fullscreen:not([data-fullscreen]) + .media-tooltip
  .media-tooltip-label--enter-fullscreen,
/* Fullscreen: fullscreen → exit */
  .media-button--fullscreen[data-fullscreen] + .media-tooltip
  .media-tooltip-label--exit-fullscreen,
/* Captions: not active → enable */
  .media-button--captions:not([data-active]) + .media-tooltip
  .media-tooltip-label--enable-captions,
/* Captions: active → disable */
  .media-button--captions[data-active] + .media-tooltip
  .media-tooltip-label--disable-captions,
/* PiP: not in pip → enter */
  .media-button--pip:not([data-pip]) + .media-tooltip
  .media-tooltip-label--enter-pip,
/* PiP: in pip → exit */
  .media-button--pip[data-pip] + .media-tooltip
  .media-tooltip-label--exit-pip {
  display: block;
}


/* ==========================================================================
   Root
   ========================================================================== */

.media-minimal-skin--video {
  overflow: clip;
  background: oklch(0 0 0);
  --media-border-color: oklch(0 0 0 / 0.15);
  --media-video-border-radius: var(--media-border-radius, 0.75rem);
  --media-controls-background-color: transparent;
  --media-controls-transition-duration: 100ms;
  --media-controls-transition-timing-function: ease-out;
  --media-error-dialog-transition-duration: 150ms;
  --media-error-dialog-transition-delay: 100ms;
  --media-error-dialog-transition-timing-function: ease-out;
  --media-popup-transition-duration: 100ms;
  --media-popup-transition-timing-function: ease-out;
  --media-tooltip-background-color: oklch(1 0 0 / 0.1);
  --media-tooltip-border-color: transparent;
  --media-tooltip-backdrop-filter: blur(16px) saturate(1.5);
  --media-tooltip-text-color: currentColor;
  --media-tooltip-side-offset: 0.5rem;
  --media-popover-side-offset: 1.5rem;

  @media (prefers-reduced-motion: reduce) {
    --media-error-dialog-transition-duration: 50ms;
    --media-error-dialog-transition-delay: 0ms;
    --media-popup-transition-duration: 0ms;
  }

  @media (prefers-color-scheme: dark) {
    --media-border-color: oklch(1 0 0 / 0.15);
  }

  @media (prefers-reduced-transparency: reduce) or (prefers-contrast: more) {
    --media-controls-background-color: oklch(0 0 0);
    --media-tooltip-background-color: oklch(0 0 0);
  }

  @container media-root (width > 42rem) {
    & > * {
      --media-popover-side-offset: 0rem;
    }
  }

  &:has(.media-controls:not([data-visible])) {
    /* Slight delay to hide controls on non-touch devices after interaction */
    @media (pointer: fine) {
      --media-controls-transition-duration: 300ms;
    }
    @media (pointer: coarse) {
      --media-controls-transition-duration: 150ms;
    }
    @media (prefers-reduced-motion: reduce) {
      --media-controls-transition-duration: 50ms;
    }
  }

  /* Inner border ring */
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 10;
    border-radius: inherit;
    box-shadow: inset 0 0 0 1px var(--media-border-color);
    pointer-events: none;
  }

  /* Fullscreen */
  &:fullscreen {
    --media-border-radius: 0;
  }
}

/* ==========================================================================
   Error Dialog
   ========================================================================== */

.media-minimal-skin--video .media-error {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  outline: none;
}

.media-minimal-skin--video .media-error__dialog {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 16rem;
  padding: 1rem;
  color: oklch(1 0 0);
  text-shadow: 0 1px 0 oklch(0 0 0 / 0.5);
  transition-property: opacity, scale;
  transition-duration: var(--media-error-dialog-transition-duration);
  transition-delay: var(--media-error-dialog-transition-delay);
  transition-timing-function: var(--media-error-dialog-transition-timing-function);
  pointer-events: auto;
}

.media-minimal-skin--video .media-error[data-starting-style] .media-error__dialog,
.media-minimal-skin--video .media-error[data-ending-style] .media-error__dialog {
  opacity: 0;
  scale: 0.5;
}
.media-minimal-skin--video .media-error[data-ending-style] .media-error__dialog {
  transition-delay: 0ms;
}

.media-minimal-skin--video .media-error__content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.375rem 0;
}

.media-minimal-skin--video .media-error__title {
  font-size: 1.125rem;
}

.media-minimal-skin--video .media-error[data-open] ~ .media-controls {
  display: none;
}

/* ==========================================================================
  Controls (hide/show behavior)
  ========================================================================== */

.media-minimal-skin--video .media-controls {
  padding: 0.25rem;
  column-gap: 0.5rem;
  flex-wrap: wrap;
  position: absolute;
  bottom: 0.25rem;
  inset-inline: 0.25rem;
  z-index: 10;
  color: oklch(1 0 0);
  border-radius: 0.75rem;
  transition-duration: var(--media-controls-transition-duration);
  transition-timing-function: var(--media-controls-transition-timing-function);

  @media (pointer: fine) {
    will-change: translate, filter, opacity;
    transition-property: translate, filter, opacity;
  }

  @media (pointer: coarse) {
    will-change: translate, opacity;
    transition-property: translate, opacity;
  }

  &:not([data-visible]) {
    opacity: 0;
    pointer-events: none;
    translate: 0 100%;

    @media (pointer: fine) {
      filter: blur(8px);
    }

    @media (prefers-reduced-motion: reduce) {
      translate: 0 0;
      filter: blur(0);
    }
  }

  & .media-time-controls {
    order: -1;
    flex: 0 0 100%;
    padding-inline: 0.625rem;
  }

  & .media-button-group:first-child {
    flex: 1;
    text-align: left;
  }

  & .media-button-group:last-child {
    flex: 1;
    justify-content: end;
  }

  @container media-root (width > 42rem) {
    flex-wrap: nowrap;
    bottom: 0.5rem;
    inset-inline: 0.5rem;

    & .media-time-controls {
      order: unset;
      flex: 1;
    }

    & .media-button-group:first-child,
    & .media-button-group:last-child {
      flex: 0 0 auto;
    }
  }
}

/* Hide cursor when controls are hidden */
.media-minimal-skin--video:has(.media-controls:not([data-visible])) {
  cursor: none;
}

/* ==========================================================================
   Sliders
   ========================================================================== */

.media-minimal-skin--video .media-slider__track {
  box-shadow: 0 0 0 1px oklch(0 0 0 / 0.05);
}

/* ==========================================================================
   Popups & Animations
   ========================================================================== */

.media-minimal-skin--video .media-popover--volume {
  background: transparent;
  padding-block: 0.75rem;
  border-radius: 0.75rem;

  @media (prefers-reduced-transparency: reduce) or (prefers-contrast: more) {
    background: var(--media-controls-background-color);
  }
}

/* ==========================================================================
   Slider preview
   ========================================================================== */

.media-minimal-skin--video .media-slider__preview {
  --media-preview-max-width: 11rem;
  --media-preview-padding: -0.5rem;
  /**
    Inset is the difference between the container width and the slider (100%) width.
    We only add to the end as we render the time there.
  */
  --media-preview-inset: calc(100cqi - 100%);

  position: absolute;
  left: clamp(
    calc(var(--media-preview-max-width) / 2 + var(--media-preview-padding)),
    var(--media-slider-pointer),
    calc(100% - var(--media-preview-max-width) / 2 - var(--media-preview-padding) + var(--media-preview-inset))
  );
  bottom: 100%;
  translate: -50%;
  opacity: 0;
  scale: 0.8;
  filter: blur(8px);
  transition-property: scale, opacity, filter;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
  transform-origin: bottom;

  @container media-root (width > 42rem) {
    bottom: calc(100% + 0.25rem);
    left: var(--media-slider-pointer);
  }

  & .media-preview__thumbnail-wrapper {
    position: relative;

    &::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      box-shadow:
        0 0 0 1px oklch(0 0 0 / 0.05),
        0 1px 3px 0 oklch(0 0 0 / 0.2),
        0 1px 2px -1px oklch(0 0 0 / 0.2);
    }
  }

  & .media-preview__thumbnail {
    max-width: var(--media-preview-max-width);
  }

  &:has(.media-preview__thumbnail[data-loading]) {
    max-height: 6rem;
  }
}
.media-minimal-skin--video .media-slider[data-pointing] .media-slider__preview:has([role="img"]:not([data-hidden])) {
  opacity: 1;
  scale: 1;
  filter: blur(0);
}

```

### Minimal Audio Skin

*   Skin.tsx*   skin.css

```
import { type type CSSProperties, type type ComponentProps, forwardRef, type type ReactNode } from 'react';
import { createPlayer, Container, usePlayer, ErrorDialog, MuteButton, PlayButton, PlaybackRateButton, Popover, SeekButton, Time, TimeSlider, Tooltip, VolumeSlider, type type Poster, type type RenderProp } from '@videojs/react';
import { Audio, audioFeatures } from '@videojs/react/audio';
import './player.css';

// ================================================================
// Player
// ================================================================

export const Player = createPlayer({ features: audioFeatures });

export interface AudioPlayerProps {
  src: string;
  style?: CSSProperties;
  className?: string;
}

const SEEK_TIME = 10;

/**
 * @example
 * ```tsx
 * <AudioPlayer
 *   src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
 * />
 * ```
 */
export function AudioPlayer({ src, className, ...rest }: AudioPlayerProps): ReactNode {
  return (
    <Player.Provider>
      <Container className={`media-minimal-skin media-minimal-skin--audio ${className ?? ''}`} {...rest}>
        <Audio src={src} />

        <ErrorDialog.Root>
          <ErrorDialog.Popup className="media-error">
            <div className="media-error__dialog">
              <div className="media-error__content">
                <ErrorDialog.Title className="media-error__title">Something went wrong.</ErrorDialog.Title>
                <ErrorDialog.Description className="media-error__description" />
              </div>
              <div className="media-error__actions">
                <ErrorDialog.Close className="media-button media-button--subtle">OK</ErrorDialog.Close>
              </div>
            </div>
          </ErrorDialog.Popup>
        </ErrorDialog.Root>

        <div className="media-controls">
          <Tooltip.Provider>
            <div className="media-button-group">
              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <PlayButton className="media-button--play" render={<Button />}>
                      <RestartIcon className="media-icon media-icon--restart" />
                      <PlayIcon className="media-icon media-icon--play" />
                      <PauseIcon className="media-icon media-icon--pause" />
                    </PlayButton>
                  }
                />
                <Tooltip.Popup className="media-tooltip">
                  <PlayLabel />
                </Tooltip.Popup>
              </Tooltip.Root>

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <SeekButton seconds={-SEEK_TIME} className="media-button--seek" render={<Button />}>
                      <span className="media-icon__container">
                        <SeekIcon className="media-icon media-icon--seek media-icon--flipped" />
                        <span className="media-icon__label">{SEEK_TIME}</span>
                      </span>
                    </SeekButton>
                  }
                />
                <Tooltip.Popup className="media-tooltip">Seek backward {SEEK_TIME} seconds</Tooltip.Popup>
              </Tooltip.Root>

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <SeekButton seconds={SEEK_TIME} className="media-button--seek" render={<Button />}>
                      <span className="media-icon__container">
                        <SeekIcon className="media-icon media-icon--seek" />
                        <span className="media-icon__label">{SEEK_TIME}</span>
                      </span>
                    </SeekButton>
                  }
                />
                <Tooltip.Popup className="media-tooltip">Seek forward {SEEK_TIME} seconds</Tooltip.Popup>
              </Tooltip.Root>
            </div>

            <div className="media-time-controls">
              <Time.Group className="media-time-group">
                <Time.Value type="current" className="media-time media-time--current" />
                <Time.Separator className="media-time-separator" />
                <Time.Value type="duration" className="media-time media-time--duration" />
              </Time.Group>

              <TimeSlider.Root className="media-slider">
                <TimeSlider.Track className="media-slider__track">
                  <TimeSlider.Fill className="media-slider__fill" />
                  <TimeSlider.Buffer className="media-slider__buffer" />
                </TimeSlider.Track>
                <TimeSlider.Thumb className="media-slider__thumb" />
              </TimeSlider.Root>
            </div>

            <div className="media-button-group">
              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={<PlaybackRateButton className="media-button--playback-rate" render={<Button />} />}
                />
                <Tooltip.Popup className="media-tooltip">Toggle playback rate</Tooltip.Popup>
              </Tooltip.Root>

              <VolumePopover />
            </div>
          </Tooltip.Provider>
        </div>
      </Container>

    </Player.Provider>
  );
}

// ================================================================
// Labels
// ================================================================

function PlayLabel(): string {
  const paused = usePlayer((s) => Boolean(s.paused));
  const ended = usePlayer((s) => Boolean(s.ended));
  if (ended) return 'Replay';
  return paused ? 'Play' : 'Pause';
}

// ================================================================
// Components
// ================================================================

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(function Button({ className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={`media-button media-button--subtle media-button--icon ${className ?? ''}`}
      {...props}
    />
  );
});

function VolumePopover(): ReactNode {
  const volumeUnsupported = usePlayer((s) => s.volumeAvailability === 'unsupported');

  const muteButton = (
    <MuteButton className="media-button--mute" render={<Button />}>
      <VolumeOffIcon className="media-icon media-icon--volume-off" />
      <VolumeLowIcon className="media-icon media-icon--volume-low" />
      <VolumeHighIcon className="media-icon media-icon--volume-high" />
    </MuteButton>
  );

  if (volumeUnsupported) return muteButton;

  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="left">
      <Popover.Trigger render={muteButton} />
      <Popover.Popup className="media-popover media-popover--volume">
        <VolumeSlider.Root className="media-slider" orientation="horizontal" thumbAlignment="edge">
          <VolumeSlider.Track className="media-slider__track">
            <VolumeSlider.Fill className="media-slider__fill" />
          </VolumeSlider.Track>
          <VolumeSlider.Thumb className="media-slider__thumb media-slider__thumb--persistent" />
        </VolumeSlider.Root>
      </Popover.Popup>
    </Popover.Root>
  );
}

// ================================================================
// Icons
// ================================================================

function PauseIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><rect width="4" height="12" x="3" y="3" fill="currentColor" rx="1.75"/><rect width="4" height="12" x="11" y="3" fill="currentColor" rx="1.75"/></svg>;
}

function PlayIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="m13.473 10.476-6.845 4.256a1.697 1.697 0 0 1-2.364-.547 1.77 1.77 0 0 1-.264-.93v-8.51C4 3.78 4.768 3 5.714 3c.324 0 .64.093.914.268l6.845 4.255a1.763 1.763 0 0 1 0 2.953"/></svg>;
}

function RestartIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M9 17a8 8 0 0 1-8-8h1.5a6.5 6.5 0 1 0 1.43-4.07l1.643 1.643A.25.25 0 0 1 5.396 7H1.25A.25.25 0 0 1 1 6.75V2.604a.25.25 0 0 1 .427-.177l1.438 1.438A8 8 0 1 1 9 17"/><path fill="currentColor" d="m11.61 9.639-3.331 2.07a.826.826 0 0 1-1.15-.266.86.86 0 0 1-.129-.452V6.849C7 6.38 7.374 6 7.834 6c.158 0 .312.045.445.13l3.331 2.071a.858.858 0 0 1 0 1.438"/></svg>;
}

function SeekIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M1 9c0 2.21.895 4.21 2.343 5.657l1.06-1.06a6.5 6.5 0 1 1 9.665-8.665l-1.641 1.641a.25.25 0 0 0 .177.427h4.146a.25.25 0 0 0 .25-.25V2.604a.25.25 0 0 0-.427-.177l-1.438 1.438A8 8 0 0 0 1 9"/></svg>;
}

function VolumeHighIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M15.6 3.3c-.4-.4-1-.4-1.4 0s-.4 1 0 1.4C15.4 5.9 16 7.4 16 9s-.6 3.1-1.8 4.3c-.4.4-.4 1 0 1.4.2.2.5.3.7.3.3 0 .5-.1.7-.3C17.1 13.2 18 11.2 18 9s-.9-4.2-2.4-5.7"/><path fill="currentColor" d="M.714 6.008h3.072l4.071-3.857c.5-.376 1.143 0 1.143.601V15.28c0 .602-.643.903-1.143.602l-4.071-3.858H.714c-.428 0-.714-.3-.714-.752V6.76c0-.451.286-.752.714-.752m10.568.59a.91.91 0 0 1 0-1.316.91.91 0 0 1 1.316 0c1.203 1.203 1.47 2.216 1.522 3.208q.012.255.011.51c0 1.16-.358 2.733-1.533 3.803a.7.7 0 0 1-.298.156c-.382.106-.873-.011-1.018-.156a.91.91 0 0 1 0-1.316c.57-.57.995-1.551.995-2.487 0-.944-.26-1.667-.995-2.402"/></svg>;
}

function VolumeLowIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M.714 6.008h3.072l4.071-3.857c.5-.376 1.143 0 1.143.601V15.28c0 .602-.643.903-1.143.602l-4.071-3.858H.714c-.428 0-.714-.3-.714-.752V6.76c0-.451.286-.752.714-.752m10.568.59a.91.91 0 0 1 0-1.316.91.91 0 0 1 1.316 0c1.203 1.203 1.47 2.216 1.522 3.208q.012.255.011.51c0 1.16-.358 2.733-1.533 3.803a.7.7 0 0 1-.298.156c-.382.106-.873-.011-1.018-.156a.91.91 0 0 1 0-1.316c.57-.57.995-1.551.995-2.487 0-.944-.26-1.667-.995-2.402"/></svg>;
}

function VolumeOffIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M.714 6.008h3.072l4.071-3.857c.5-.376 1.143 0 1.143.601V15.28c0 .602-.643.903-1.143.602l-4.071-3.858H.714c-.428 0-.714-.3-.714-.752V6.76c0-.451.286-.752.714-.752M14.5 7.586l-1.768-1.768a1 1 0 1 0-1.414 1.414L13.085 9l-1.767 1.768a1 1 0 0 0 1.414 1.414l1.768-1.768 1.768 1.768a1 1 0 0 0 1.414-1.414L15.914 9l1.768-1.768a1 1 0 0 0-1.414-1.414z"/></svg>;
}
```
```
/* ==========================================================================
   Reset
   ========================================================================== */

.media-minimal-skin *,
.media-minimal-skin *::before,
.media-minimal-skin *::after {
  box-sizing: border-box;
}
.media-minimal-skin img,
.media-minimal-skin video,
.media-minimal-skin svg {
  display: block;
  max-width: 100%;
}
.media-minimal-skin button {
  font: inherit;
}
@media (prefers-reduced-motion: no-preference) {
  .media-minimal-skin {
    interpolate-size: allow-keywords;
  }
}

/* ==========================================================================
   Root Container
   ========================================================================== */

.media-minimal-skin {
  container: media-root / inline-size;
  position: relative;
  isolation: isolate;
  display: block;
  height: 100%;
  width: 100%;
  border-radius: var(--media-border-radius, 0.75rem);
  font-family:
    Inter Variable,
    Inter,
    ui-sans-serif,
    system-ui,
    sans-serif;
  line-height: 1.5;
  letter-spacing: normal;
  -webkit-font-smoothing: auto;
  -moz-osx-font-smoothing: auto;

  & > * {
    font-size: 0.75rem; /* 12px at 100% font size */
  }

  @container media-root (width > 48rem) {
    & > * {
      font-size: 0.875rem; /* 14px at 100% font size */
    }
  }
}

/* ==========================================================================
   Buffering Indicator
   ========================================================================== */

.media-minimal-skin .media-buffering-indicator {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  color: oklch(1 0 0);
  pointer-events: none;

  &[data-visible] {
    display: flex;
  }
}

/* ==========================================================================
   Error Dialog
   ========================================================================== */

.media-minimal-skin .media-error:not([data-open]) {
  display: none;
}

.media-minimal-skin .media-error__title {
  font-weight: 600;
  line-height: 1.25;
}

.media-minimal-skin .media-error__description {
  opacity: 0.7;
  overflow-wrap: anywhere;
}

.media-minimal-skin .media-error__actions {
  display: flex;
  gap: 0.5rem;

  & > * {
    flex: 1;
  }
}

.media-minimal-skin .media-error[data-open] ~ .media-controls * {
  visibility: hidden;
}

/* ==========================================================================
   Controls
   ========================================================================== */

.media-minimal-skin .media-controls {
  container: media-controls / inline-size;
  display: flex;
  align-items: center;
  --media-controls-current-shadow-color: oklch(from currentColor 0 0 0 / clamp(0, calc((l - 0.5) * 0.5), 0.15));
  --media-controls-current-shadow-color-subtle: oklch(
    from var(--media-controls-current-shadow-color) l c h /
    calc(alpha * 0.4)
  );
  background-color: var(--media-controls-background-color);
  backdrop-filter: var(--media-controls-backdrop-filter);
  text-shadow: 0 1px 0 var(--media-controls-current-shadow-color);
}

/* ==========================================================================
   Time Controls & Display
   ========================================================================== */

.media-minimal-skin .media-time-controls {
  container: media-time-controls / inline-size;
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  flex: 1;
  gap: 0.75rem;
}

.media-minimal-skin .media-time-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.media-minimal-skin .media-time {
  font-variant-numeric: tabular-nums;
}

.media-minimal-skin .media-time--current,
.media-minimal-skin .media-time-separator {
  display: none;
}

@container media-root (width > 42rem) {
  .media-minimal-skin .media-time-controls {
    flex-direction: row;
  }

  .media-minimal-skin .media-time--duration,
  .media-minimal-skin .media-time-separator {
    color: oklch(from currentColor l c h / 0.6);
  }

  .media-minimal-skin .media-time--current,
  .media-minimal-skin .media-time-separator {
    display: inline;
  }
}

/* ==========================================================================
   Buttons
   ========================================================================== */

/* Base button */
.media-minimal-skin .media-button {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  outline: 2px solid transparent;
  outline-offset: -2px;
  transition-property: background-color, outline-offset, scale;
  /* Fix weird jumping when clicking on the buttons in Safari. */
  will-change: scale;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
  cursor: pointer;
  user-select: none;
  text-align: center;
  touch-action: manipulation;

  &:focus-visible {
    outline-color: currentColor;
    outline-offset: 2px;
  }

  &:active {
    scale: 0.98;
  }

  &[disabled] {
    opacity: 0.5;
    filter: grayscale(1);
    cursor: not-allowed;
  }

  &[data-availability="unavailable"] {
    display: none;
  }
}

/* biome-ignore lint/correctness/noUnknownProperty: corner-shape is an emerging CSS spec */
@supports (corner-shape: squircle) {
  .media-minimal-skin .media-button {
    border-radius: 1rem;
    /* biome-ignore lint/correctness/noUnknownProperty: corner-shape is an emerging CSS spec */
    corner-shape: squircle;
  }
}

/* Primary button variant */
.media-minimal-skin .media-button--primary {
  background: oklch(1 0 0);
  color: oklch(0 0 0);
  font-weight: 500;
  text-shadow: none;
}

/* Subtle button variant */
.media-minimal-skin .media-button--subtle {
  background: transparent;
  color: inherit;
  text-shadow: inherit;

  &:hover,
  &:focus-visible,
  &[aria-expanded="true"] {
    background: oklch(from currentColor l c h / 0.1);
  }
}

/* Icon button variant */
.media-minimal-skin .media-button--icon {
  display: grid;
  width: 2.375rem;
  padding: 0;
  aspect-ratio: 1;

  &:active {
    scale: 0.9;
  }

  & .media-icon {
    filter: drop-shadow(0 1px 0 var(--media-controls-current-shadow-color, oklch(0 0 0 / 0.25)));
  }
}

/* Seek button */
.media-minimal-skin .media-button--seek {
  & .media-icon__label {
    position: absolute;
    right: -1px;
    bottom: -3px;
    font-size: 10px; /* Hard coded due to size limitations. */
    font-weight: 480;
    font-variant-numeric: tabular-nums;
  }

  &:has(.media-icon--flipped) .media-icon__label {
    right: unset;
    left: -1px;
  }
}

/* Playback rate button */
.media-minimal-skin .media-button--playback-rate {
  padding: 0;

  &::after {
    content: attr(data-rate) "\00D7";
    width: 4ch;
    font-variant-numeric: tabular-nums;
  }
}

/* ==========================================================================
   Button Groups
   ========================================================================== */

.media-minimal-skin .media-button-group {
  display: flex;
  align-items: center;
  gap: 0.075rem;

  @container media-root (width > 42rem) {
    gap: 0.125rem;
  }
}

/* ==========================================================================
   Icons
   ========================================================================== */

.media-minimal-skin .media-icon__container {
  position: relative;
}
.media-minimal-skin .media-icon {
  display: block;
  flex-shrink: 0;
  grid-area: 1 / 1;
  width: 18px;
  height: 18px;
  transition-behavior: allow-discrete;
  transition-property: display, opacity;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}
.media-minimal-skin .media-icon--flipped {
  scale: -1 1;
}

/* ==========================================================================
   Slider
   ========================================================================== */

.media-minimal-skin .media-slider {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  border-radius: calc(infinity * 1px);
  outline: none;
  cursor: pointer;

  &[data-orientation="horizontal"] {
    min-width: 5rem;
    width: 100%;
    height: 2rem;
  }

  &[data-orientation="vertical"] {
    width: 2rem;
    height: 4.5rem;
  }
}

/* Track */
.media-minimal-skin .media-slider__track {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: inherit;
  user-select: none;
  background-color: oklch(from currentColor l c h / 0.2);

  &[data-orientation="horizontal"] {
    width: 100%;
    height: 0.1875rem;
  }

  &[data-orientation="vertical"] {
    width: 0.1875rem;
    height: 100%;
  }
}

/* Thumb */
.media-minimal-skin .media-slider__thumb {
  position: absolute;
  translate: -50% -50%;
  z-index: 10;
  width: 0.75rem;
  height: 0.75rem;
  background-color: currentColor;
  border-radius: calc(infinity * 1px);
  box-shadow:
    0 0 0 1px var(--media-controls-current-shadow-color-subtle, oklch(0 0 0 / 0.1)),
    0 1px 3px 0 oklch(0 0 0 / 0.15),
    0 1px 2px -1px oklch(0 0 0 / 0.15);
  opacity: 0;
  scale: 0.7;
  transform-origin: center;
  transition-property: opacity, scale, outline-offset;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
  user-select: none;
  outline: 2px solid transparent;
  outline-offset: -2px;

  &[data-orientation="horizontal"] {
    top: 50%;
    left: var(--media-slider-fill);
  }

  &[data-orientation="vertical"] {
    left: 50%;
    top: calc(100% - var(--media-slider-fill));
  }

  &:focus-visible {
    outline-color: currentColor;
    outline-offset: 2px;
  }
}

.media-minimal-skin .media-slider:hover .media-slider__thumb,
.media-minimal-skin .media-slider:focus-within .media-slider__thumb,
.media-minimal-skin .media-slider__thumb--persistent {
  opacity: 1;
  scale: 1;
}

/* Shared track fills */
.media-minimal-skin .media-slider__buffer,
.media-minimal-skin .media-slider__fill {
  position: absolute;
  border-radius: inherit;
  pointer-events: none;
}

.media-minimal-skin .media-slider__buffer[data-orientation="horizontal"],
.media-minimal-skin .media-slider__fill[data-orientation="horizontal"] {
  inset-block: 0;
  left: 0;
}

.media-minimal-skin .media-slider__buffer[data-orientation="vertical"],
.media-minimal-skin .media-slider__fill[data-orientation="vertical"] {
  inset-inline: 0;
  bottom: 0;
}

/* Buffer */
.media-minimal-skin .media-slider__buffer {
  background-color: oklch(from currentColor l c h / 0.2);
  transition-duration: 0.25s;
  transition-timing-function: ease-out;

  &[data-orientation="horizontal"] {
    width: var(--media-slider-buffer);
    transition-property: width;
  }

  &[data-orientation="vertical"] {
    height: var(--media-slider-buffer);
    transition-property: height;
  }
}

/* Fill */
.media-minimal-skin .media-slider__fill {
  background-color: currentColor;

  &[data-orientation="horizontal"] {
    width: var(--media-slider-fill);
  }

  &[data-orientation="vertical"] {
    height: var(--media-slider-fill);
  }
}

/* ==========================================================================
   Popups & Animations
   ========================================================================== */

.media-minimal-skin .media-popover,
.media-minimal-skin .media-tooltip {
  margin: 0;
  border: 0;
  color: inherit;
  overflow: visible;
  transition-property: scale, opacity, filter;
  transition-duration: var(--media-popup-transition-duration);
  transition-timing-function: var(--media-popup-transition-timing-function);

  &[data-starting-style],
  &[data-ending-style] {
    opacity: 0;
    scale: 0.5;
    filter: blur(8px);
  }

  &[data-instant] {
    transition-duration: 0ms;
  }

  &[data-side="top"] {
    transform-origin: bottom;
  }
  &[data-side="bottom"] {
    transform-origin: top;
  }
  &[data-side="left"] {
    transform-origin: right;
  }
  &[data-side="right"] {
    transform-origin: left;
  }

  /* Safe area between trigger and popup */
  &::before {
    content: "";
    position: absolute;
    pointer-events: inherit;
  }

  &[data-side="top"]::before,
  &[data-side="bottom"]::before {
    width: 100%;
    inset-inline: 0;
  }
  &[data-side="top"]::before {
    top: 100%;
  }
  &[data-side="bottom"]::before {
    bottom: 100%;
  }

  &[data-side="left"]::before,
  &[data-side="right"]::before {
    height: 100%;
    inset-block: 0;
  }
  &[data-side="left"]::before {
    left: 100%;
  }
  &[data-side="right"]::before {
    right: 100%;
  }
}

.media-minimal-skin .media-popover {
  &[data-side="top"]::before,
  &[data-side="bottom"]::before {
    height: var(--media-popover-side-offset);
  }
  &[data-side="left"]::before,
  &[data-side="right"]::before {
    width: var(--media-popover-side-offset);
  }
}

.media-minimal-skin .media-tooltip {
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  background-color: var(--media-tooltip-background-color);
  backdrop-filter: var(--media-tooltip-backdrop-filter);
  box-shadow:
    0 0 0 1px var(--media-tooltip-border-color),
    0 4px 6px -1px oklch(0 0 0 / 0.1),
    0 2px 4px -2px oklch(0 0 0 / 0.1);
  color: var(--media-tooltip-text-color);
  font-size: 0.75rem; /* 12px at 100% font size */
  white-space: nowrap;

  &[data-side="top"]::before,
  &[data-side="bottom"]::before {
    height: var(--media-tooltip-side-offset);
  }
  &[data-side="left"]::before,
  &[data-side="right"]::before {
    width: var(--media-tooltip-side-offset);
  }
}

.media-minimal-skin .media-popover--volume:has(media-volume-slider[data-availability="unsupported"]) {
  display: none;
}

/* ==========================================================================
   Icon State Visibility for Audio Skins

   Data-attribute-driven visibility rules for multi-state icon buttons.
   Uses :is() with both element selectors (for HTML custom element wrappers)
   and class selectors (for React rendered SVG elements).
   ========================================================================== */

/* --- All icons hidden by default --- */

.media-button--play .media-icon--restart,
.media-button--play .media-icon--play,
.media-button--play .media-icon--pause,
.media-button--mute .media-icon--volume-off,
.media-button--mute .media-icon--volume-low,
.media-button--mute .media-icon--volume-high {
  display: none;
  opacity: 0;
}

/* --- Active icon per state --- */

/* Play: ended → restart */
.media-button--play[data-ended] .media-icon--restart,
/* Play: paused (not ended) → play */
.media-button--play:not([data-ended])[data-paused] .media-icon--play,
/* Play: playing (not paused, not ended) → pause */
.media-button--play:not([data-paused]):not([data-ended]) .media-icon--pause,
/* Mute: muted → volume off */
.media-button--mute[data-muted] .media-icon--volume-off,
/* Mute: volume low (not muted) → volume low */
.media-button--mute:not([data-muted])[data-volume-level="low"] .media-icon--volume-low,
/* Mute: volume high (not muted, not low) → volume high */
.media-button--mute:not([data-muted]):not([data-volume-level="low"]) .media-icon--volume-high {
  display: block;
  opacity: 1;
}

/* ==========================================================================
   Tooltip Label State Visibility for Audio Skins

   Data-attribute-driven visibility rules for multi-state tooltip labels.
   Uses adjacent sibling selectors to match button state → tooltip content.
   ========================================================================== */

/* --- All multi-state labels hidden by default --- */

.media-tooltip-label {
  display: none;
}

/* --- Active label per state --- */

/* Play: ended → replay */
.media-button--play[data-ended] + .media-tooltip .media-tooltip-label--replay,
/* Play: paused (not ended) → play */
  .media-button--play:not([data-ended])[data-paused] + .media-tooltip
  .media-tooltip-label--play,
/* Play: playing (not paused, not ended) → pause */
  .media-button--play:not([data-paused]):not([data-ended]) + .media-tooltip
  .media-tooltip-label--pause {
  display: block;
}


/* ==========================================================================
  Root
  ========================================================================== */

.media-minimal-skin--audio {
  --media-controls-background-color: oklch(1 0 0);
  --media-controls-backdrop-filter: blur(16px) saturate(1.5);
  --media-controls-border-color: oklch(0 0 0 / 0.05);
  --media-controls-text-color: var(--media-color-primary, oklch(0 0 0));
  --media-error-dialog-transition-duration: 250ms;
  --media-error-dialog-transition-delay: 100ms;
  --media-popup-transition-duration: 100ms;
  --media-popup-transition-timing-function: ease-out;
  --media-tooltip-background-color: oklch(1 0 0 / 0.1);
  --media-tooltip-border-color: oklch(0 0 0 / 0.05);
  --media-tooltip-backdrop-filter: blur(16px) saturate(1.5);
  --media-tooltip-text-color: currentColor;
  --media-tooltip-side-offset: 0.75rem;
  --media-popover-side-offset: 0.75rem;

  @media (prefers-reduced-motion: reduce) {
    --media-error-dialog-transition-duration: 50ms;
    --media-error-dialog-transition-delay: 0ms;
    --media-popup-transition-duration: 0ms;
  }

  @media (prefers-color-scheme: dark) {
    --media-controls-background-color: oklch(0 0 0);
    --media-controls-border-color: oklch(1 0 0 / 0.1);
    --media-controls-text-color: var(--media-color-primary, oklch(1 0 0));
  }

  @media (prefers-reduced-transparency: reduce) or (prefers-contrast: more) {
    --media-tooltip-background-color: oklch(1 0 0);
  }

  @media (prefers-color-scheme: dark) and ((prefers-reduced-transparency: reduce) or (prefers-contrast: more)) {
    --media-tooltip-background-color: oklch(0 0 0);
  }
}

/* ==========================================================================
   Error Dialog
   ========================================================================== */

.media-minimal-skin--audio .media-error__dialog {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-inline: 1.25rem 0.5rem;
  transition-property: opacity, filter, scale;
  transition-duration: var(--media-error-dialog-transition-duration);
  transition-delay: var(--media-error-dialog-transition-delay);
  transition-timing-function: ease-out;
  border-radius: calc(infinity * 1px);
  background-color: oklch(from var(--media-controls-background-color) l c h / 1);
}

.media-minimal-skin--audio .media-error[data-starting-style] .media-error__dialog,
.media-minimal-skin--audio .media-error[data-ending-style] .media-error__dialog {
  opacity: 0;
  filter: blur(4px);
  scale: 0.95;
}
.media-minimal-skin--audio .media-error[data-ending-style] .media-error__dialog {
  transition-delay: 0ms;
}

.media-minimal-skin--audio .media-error__content {
  flex: 1;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* ==========================================================================
  Controls
  ========================================================================== */

.media-minimal-skin--audio .media-controls {
  padding: 0.375rem;
  gap: 0.5rem;
  color: var(--media-controls-text-color);
  box-shadow: 0 0 0 1px var(--media-controls-border-color);
  border-radius: var(--media-border-radius, 1rem);
}

/* ==========================================================================
   Popups & Animations
   ========================================================================== */

.media-minimal-skin--audio .media-popover--volume {
  background: linear-gradient(to left, var(--media-controls-background-color) 80%, transparent 100%);
  padding: 0 0 0 4rem;
}

```

---

React documentation: https://videojs.org/docs/framework/react/llms.txt
All documentation: https://videojs.org/llms.txt