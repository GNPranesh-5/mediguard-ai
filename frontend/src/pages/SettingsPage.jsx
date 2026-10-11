import { useState } from 'react';
import { Trash2, LogOut } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import Button from '../components/Button';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { useSettings } from '../hooks/useSettings';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../components/ToastNotification';
import { DEMO_MODE, API_BASE_URL } from '../config';
import { useAuth, useLogoutAction } from '../hooks/useAuth';
import { clearDemoUserData } from '../services/demoApi';

const THEMES = [['light', 'Light'], ['dark', 'Dark'], ['system', 'Match my device']];
const TEXT_SIZES = [['normal', 'Standard'], ['large', 'Larger']];

// A group of radio buttons built from [value, label] pairs.
function RadioGroup({ legend, name, options, value, onChange }) {
  return (
    <fieldset className="radio-group">
      <legend>{legend}</legend>
      {options.map(([val, label]) => (
        <label key={val} className={`radio${value === val ? ' radio--on' : ''}`}>
          <input type="radio" name={name} value={val} checked={value === val} onChange={() => onChange(val)} />
          {label}
        </label>
      ))}
    </fieldset>
  );
}

export default function SettingsPage() {
  useDocumentTitle('Settings');
  const { settings, update } = useSettings();
  const toast = useToast();
  const { user } = useAuth();
  const logout = useLogoutAction();
  const [confirmClear, setConfirmClear] = useState(false);

  const clearDemoData = () => {
    clearDemoUserData(); // clears the signed-in user's demo history and saved list
    setConfirmClear(false);
    toast('Demo history and saved medicines cleared.');
  };

  return (
    <PageContainer title="Settings" intro="Display preferences are stored on this device only.">
      <div className="settings">
        <section className="card">
          <h2 className="section-title">Account</h2>
          <dl className="spec">
            <div className="spec__row"><dt>Name</dt><dd>{user.name}</dd></div>
            <div className="spec__row"><dt>Email</dt><dd>{user.email}</dd></div>
          </dl>
          <Button variant="secondary" icon={LogOut} onClick={logout} style={{ marginTop: 12 }}>Logout</Button>
        </section>

        <section className="card">
          <h2 className="section-title">Display</h2>
          <RadioGroup legend="Theme" name="theme" options={THEMES} value={settings.theme} onChange={(theme) => update({ theme })} />
          <RadioGroup legend="Text size" name="text" options={TEXT_SIZES} value={settings.textSize} onChange={(textSize) => update({ textSize })} />
        </section>

        <section className="card">
          <h2 className="section-title">Data source</h2>
          <dl className="spec">
            <div className="spec__row"><dt>Mode</dt><dd>{DEMO_MODE ? 'Demo (sample data)' : 'Backend'}</dd></div>
            <div className="spec__row"><dt>API address</dt><dd><code>{API_BASE_URL}</code></dd></div>
          </dl>
          <p className="hint" style={{ marginTop: 12 }}>These come from the <code>.env</code> file and need a restart of the dev server to change.</p>
          {DEMO_MODE && <Button variant="secondary" icon={Trash2} onClick={() => setConfirmClear(true)} style={{ marginTop: 12 }}>Clear demo history and saved items</Button>}
        </section>
      </div>
      <ConfirmationDialog open={confirmClear} title="Clear demo data?" confirmLabel="Clear" message="This removes demo scan history and saved medicines stored in this browser." onConfirm={clearDemoData} onCancel={() => setConfirmClear(false)} />
    </PageContainer>
  );
}
