import { X } from 'lucide-react';
import useStore from '../store';
import { FIXED_SHORTCUTS, CONFIGURABLE_SHORTCUTS, formatKey, type ShortcutGroup } from '../shortcuts';
import './ShortcutsHelp.css';

interface Props {
  onClose: () => void;
}

const GROUPS: ShortcutGroup[] = ['Review mode', 'Preview', 'Global'];

export default function ShortcutsHelp({ onClose }: Props) {
  const settings = useStore((s) => s.settings);

  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="shortcuts-close-btn" onClick={onClose} title="Close (Esc)">
            <X size={20} />
          </button>
        </div>

        <div className="shortcuts-body">
          {GROUPS.map((group) => {
            const fixed = FIXED_SHORTCUTS.filter((s) => s.group === group);
            const configurable = CONFIGURABLE_SHORTCUTS.filter((s) => s.group === group);
            if (fixed.length === 0 && configurable.length === 0) return null;

            return (
              <section key={group} className="shortcuts-group">
                <h3 className="shortcuts-group-title">{group}</h3>
                <table className="shortcuts-table">
                  <tbody>
                    {configurable.map((s) => (
                      <tr key={s.settingKey}>
                        <td className="shortcuts-keys">
                          <kbd>{formatKey(settings[s.settingKey])}</kbd>
                        </td>
                        <td className="shortcuts-desc">{s.description}</td>
                      </tr>
                    ))}
                    {fixed.map((s, i) => (
                      <tr key={i}>
                        <td className="shortcuts-keys">
                          {s.keys.map((k) => <kbd key={k}>{k}</kbd>)}
                        </td>
                        <td className="shortcuts-desc">{s.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>

        <p className="shortcuts-hint">
          Configurable keys can be changed in <strong>Settings</strong> (Ctrl+,)
        </p>
      </div>
    </div>
  );
}
