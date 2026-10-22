import React, { useState, useEffect } from 'react';
import HomeScreen from './screens/HomeScreen';
import NewShowScreen from './screens/NewShowScreen';
import ShowDashboard from './screens/ShowDashboard';
import CueListScreen from './screens/CueListScreen';
import PrintScreen from './screens/PrintScreen';
import ScenesScreen from './screens/ScenesScreen';
import CharactersScreen from './screens/CharactersScreen';
import SpotNotesScreen from './screens/SpotNotesScreen';
import LicenseScreen from './screens/LicenseScreen';
import ExpiredScreen from './screens/ExpiredScreen';
import { getCachedLicense, isCacheValid, validateLicense, setCachedLicense } from './license';
import { resetTips } from './components/Tips';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [currentShow, setCurrentShow] = useState(null);
  const [licenseStatus, setLicenseStatus] = useState('checking');

  useEffect(() => {
    checkLicense();
  }, []);

  const checkLicense = async () => {
    const cached = getCachedLicense();
    
    if (isCacheValid(cached)) {
      setLicenseStatus('valid');
      validateInBackground(cached.license_key);
      return;
    }

    if (cached && cached.license_key) {
      const result = await validateLicense(cached.license_key);
      if (result && result.valid) {
        setCachedLicense({ ...cached, ...result, valid: true, cached_at: new Date().toISOString() });
        setLicenseStatus('valid');
        return;
      } else if (result && !result.valid) {
        markInvalid(cached, result);
        return;
      } else {
        if (cached.valid) {
          setLicenseStatus('valid');
          return;
        }
      }
    }

    setLicenseStatus('unlicensed');
  };

  // The server said no: expired, revoked, or this Mac would be a 3rd device on the license
  const markInvalid = (cached, result) => {
    setCachedLicense({ ...cached, valid: false });
    setLicenseStatus(result.code === 'device_limit' ? 'device_limit' : 'expired');
  };

  const validateInBackground = async (licenseKey) => {
    const result = await validateLicense(licenseKey);
    if (result && !result.valid) {
      markInvalid(getCachedLicense(), result);
    } else if (result && result.valid) {
      // Keep the account details (plan, renewal date…) current for Settings
      const cached = getCachedLicense();
      setCachedLicense({ ...cached, ...result, valid: true, cached_at: new Date().toISOString() });
    }
  };

  // While SpotPlot is open, check in every 15 minutes so the license admin can see this Mac is in use
  useEffect(() => {
    if (licenseStatus !== 'valid') return;
    const timer = setInterval(() => {
      const cached = getCachedLicense();
      if (cached && cached.license_key) validateInBackground(cached.license_key);
    }, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, [licenseStatus]);

  // Help > Show Tips Again: forget which tips were seen so each screen shows its tips again
  useEffect(() => {
    const { ipcRenderer } = window.require('electron');
    ipcRenderer.on('menu-show-tips', resetTips);
    return () => ipcRenderer.removeListener('menu-show-tips', resetTips);
  }, []);

  const navigate = (dest, data) => {
    setCurrentShow(data || null);
    setScreen(dest);
  };
  const dragStrip = <div className="window-drag-strip" />;
  if (licenseStatus === 'checking') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1E1E1E', color: 'rgba(255,255,255,0.45)', fontSize: '14px' }}>
        {dragStrip}Loading SpotPlot...
      </div>
    );
  }

  if (licenseStatus === 'unlicensed') {
    return <>{dragStrip}<LicenseScreen onActivated={() => setLicenseStatus('valid')} /></>;
  }

  if (licenseStatus === 'device_limit') {
    return <>{dragStrip}<ExpiredScreen
      title="License in use on 2 Macs"
      message="This SpotPlot license is already active on 2 other Macs, which is the limit. A Mac that hasn't opened SpotPlot for 30 days frees its spot automatically. Otherwise, contact support to free a slot, or use a different license."
      onRetry={checkLicense}
      onNewLicense={() => {
        localStorage.removeItem('spotplot_license');
        setLicenseStatus('unlicensed');
      }}
    /></>;
  }

  if (licenseStatus === 'expired') {
    return <>{dragStrip}<ExpiredScreen
      onRetry={checkLicense} 
      onNewLicense={() => {
        localStorage.removeItem('spotplot_license');
        setLicenseStatus('unlicensed');
      }}
    /></>;
  }

  return (
    <div style={{ height: '100vh', background: '#1E1E1E', color: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      {screen === 'home' && <HomeScreen navigate={navigate} />}
      {screen === 'new-show' && <NewShowScreen navigate={navigate} />}
      {screen === 'show' && <ShowDashboard show={currentShow} navigate={navigate} />}
      {screen === 'cue-list' && <CueListScreen show={currentShow} navigate={navigate} />}
      {screen === 'print' && <PrintScreen show={currentShow} navigate={navigate} />}
      {screen === 'scenes' && <ScenesScreen show={currentShow} navigate={navigate} />}
      {screen === 'characters' && <CharactersScreen show={currentShow} navigate={navigate} />}
      {screen === 'spot-notes' && <SpotNotesScreen show={currentShow} navigate={navigate} />}
    </div>
  );
}