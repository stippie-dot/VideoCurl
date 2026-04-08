import type { AppSettings } from './types';

export type ShortcutGroup = 'Review mode' | 'Preview' | 'Global';

export interface FixedShortcut {
  keys: string[];
  description: string;
  group: ShortcutGroup;
}

export interface ConfigurableShortcut {
  settingKey: keyof Pick<AppSettings, 'keyKeep' | 'keyDelete' | 'keySkip' | 'keyUndo' | 'keyPlay'>;
  description: string;
  group: ShortcutGroup;
}

export const FIXED_SHORTCUTS: FixedShortcut[] = [
  { keys: ['←', '→'],    description: 'Previous / Next video',         group: 'Review mode' },
  { keys: ['Enter'],      description: 'Play / Pause',                  group: 'Review mode' },
  { keys: ['Ctrl+Enter'], description: 'Open in external player',       group: 'Review mode' },
  { keys: ['← / →'],     description: 'Rewind / Forward 5s (playing)', group: 'Review mode' },
  { keys: ['[', ']'],     description: 'Decrease / Increase speed',     group: 'Review mode' },
  { keys: ['B'],          description: 'Bookmark current position',     group: 'Review mode' },
  { keys: ['Esc'],        description: 'Stop playing / Exit review',    group: 'Review mode' },
  { keys: ['Esc'],        description: 'Close preview',                 group: 'Preview' },
  { keys: ['←', '→'],    description: 'Rewind / Forward 5s',           group: 'Preview' },
  { keys: ['?'],          description: 'Show this help',                group: 'Global' },
  { keys: ['Ctrl+Z'],     description: 'Undo last action',              group: 'Global' },
  { keys: ['Ctrl+O'],     description: 'Open folder',                   group: 'Global' },
  { keys: ['F5'],         description: 'Rescan directory',              group: 'Global' },
];

export const CONFIGURABLE_SHORTCUTS: ConfigurableShortcut[] = [
  { settingKey: 'keyKeep',   description: 'Mark as Keep',       group: 'Review mode' },
  { settingKey: 'keyDelete', description: 'Mark as Delete',     group: 'Review mode' },
  { settingKey: 'keySkip',   description: 'Skip (no decision)', group: 'Review mode' },
  { settingKey: 'keyUndo',   description: 'Undo last action',   group: 'Review mode' },
  { settingKey: 'keyPlay',   description: 'Play / Pause',       group: 'Review mode' },
];

export function formatKey(key: string): string {
  if (key === ' ') return 'Space';
  if (key === 'delete') return 'Del';
  return key.toUpperCase();
}
