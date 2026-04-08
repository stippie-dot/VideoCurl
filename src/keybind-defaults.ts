import { kb } from './keybinds';
import type { Keybind, KeybindSettingKey } from './keybinds';
import type { AppSettings } from './types';

export const DEFAULT_KEYBINDS: Record<KeybindSettingKey, Keybind> = {
  keyKeep:               kb('k'),
  keyDelete:             kb('d'),
  keySkip:               kb('s'),
  keyUndo:               kb('z'),
  keyPlay:               kb(' '),
  keyPrevVideo:          kb('arrowleft'),
  keyNextVideo:          kb('arrowright'),
  keyEnterPlay:          kb('enter'),
  keyExternalPlayer:     kb('enter', { ctrl: true }),
  keySeekBack:           kb('arrowleft'),
  keySeekForward:        kb('arrowright'),
  keySpeedDown:          kb('['),
  keySpeedUp:            kb(']'),
  keyBookmark:           kb('b'),
  keyShowHelp:           kb('?'),
  keyPreviewSeekBack:    kb('arrowleft'),
  keyPreviewSeekForward: kb('arrowright'),
};

// Keys that existed in the old single-char string format
const LEGACY_STRING_KEYS = ['keyKeep', 'keyDelete', 'keySkip', 'keyUndo', 'keyPlay'] as const;

/**
 * Migrate a raw config object from disk into valid AppSettings.
 * Handles:
 *  - Old string-based keybinds ("k" → { key: "k", ctrl: false, ... })
 *  - Missing new keybind fields (filled with defaults)
 *  - Already-migrated Keybind objects (passed through unchanged)
 */
export function migrateSettings(raw: Record<string, unknown>): Partial<AppSettings> {
  const result: Record<string, unknown> = { ...raw };

  // Convert legacy single-char strings to Keybind objects
  for (const field of LEGACY_STRING_KEYS) {
    const val = result[field];
    if (typeof val === 'string') {
      result[field] = kb(val || field[0]); // fallback to first char if empty
    }
  }

  // Fill in any missing keybind fields with defaults
  for (const [key, defaultBind] of Object.entries(DEFAULT_KEYBINDS)) {
    if (result[key] === undefined || result[key] === null) {
      result[key] = defaultBind;
    }
  }

  return result as Partial<AppSettings>;
}
