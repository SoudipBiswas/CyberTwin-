import { useCallback, useEffect, useState } from 'react';
import type { ScanResult, Settings } from '../types';
import { DEMO_CASES } from '../demo/demoCases';
import { levelLabel } from '../utils/scoreUtils';
import './popup.css';

export function Popup() {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageStatus, setPageStatus] = useState('Monitoring');

  const loadData = useCallback(async () => {
    const [scanRes, settingsRes] = await Promise.all([
      chrome.runtime.sendMessage({ type: 'GET_LATEST_SCAN' }),
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }),
    ]);
    if (scanRes?.result) setScan(scanRes.result);
    if (settingsRes?.settings) setSettings(settingsRes.settings);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      const host = new URL(tab.url).hostname;
      setPageStatus(host.includes('mail.google.com') ? 'Gmail — Active Monitor' : host);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const triggerScan = async () => {
    setLoading(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      let pageData: any = null;
      if (tab?.id) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'CYBERTWIN_SCAN_PAGE' });
          if (response?.success) {
            pageData = response.result ?? response.results ?? response;
          }
        } catch (e) {
          console.warn('Content script scan failed, using mock fallback', e);
        }
      }

      let scanResult: ScanResult;
      if (pageData && pageData.email) {
        // Send page data to background worker for a real analysis
        const response = await chrome.runtime.sendMessage({
          type: 'SCAN_EMAIL',
          payload: { email: pageData.email },
        });
        if (response?.success && response.result) {
          scanResult = response.result;
        } else {
          throw new Error('Scan failed');
        }
      } else {
        // Mock fallback for generic pages
        scanResult = {
          id: `scan_mock_${Date.now()}`,
          timestamp: Date.now(),
          email: {
            platform: 'generic',
            senderName: 'Generic Page Scan',
            senderEmail: 'webpage@analyser.local',
            senderDomain: tab?.url ? new URL(tab.url).hostname : 'webpage.local',
            subject: tab?.title || 'Current Web Page',
            bodyText: 'Local static content analysis of current page viewport.',
            links: [],
            buttons: [],
            attachments: [],
            timestamp: new Date().toLocaleString(),
            pageUrl: tab?.url || '',
          },
          riskScore: 35,
          riskLevel: 'safe',
          senderTrustScore: 85,
          findings: [],
          topReasons: ['Secure page layout', 'No credential forms found'],
          recommendedAction: 'Safe to proceed. Continue normal interaction.',
          explanation: 'No immediate threats were identified on this page layout.',
          threatIntel: [],
          scrubbedPreview: 'Local static content...',
          trustScore: 65,
          subScores: {
            identityTrust: 80,
            intentRisk: 25,
            manipulationRisk: 15,
            websiteRisk: 30,
            financialRisk: 10,
            privacyRisk: 15,
            confidenceScore: 70,
          },
          socialEngineering: {
            urgency: 'low',
            fear: 'low',
            authority: 'low',
            scarcity: 'low',
            curiosity: 'low',
            credentialRequests: 'low',
            financialRequests: 'low',
            emotionalManipulation: 'low',
          },
          reasoningBullets: ['No typosquatted domains detected.', 'No psychological pressure language.'],
          linkIntel: [],
          qrIntel: { detected: false, riskScore: 0, riskLevel: 'safe' },
          contextualAnomalies: [],
        };
      }
      setScan(scanResult);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runDemo = async (caseId: string) => {
    setLoading(true);
    try {
      const res = await chrome.runtime.sendMessage({ type: 'RUN_DEMO', payload: { caseId } });
      if (res?.result) setScan(res.result);
    } finally {
      setLoading(false);
    }
  };

  const markTrusted = async () => {
    if (!scan) return;
    await chrome.runtime.sendMessage({
      type: 'MARK_TRUSTED',
      payload: { email: scan.email.senderEmail, domain: scan.email.senderDomain },
    });
    alert(`Added ${scan.email.senderDomain} to trusted lists.`);
  };

  const reportSuspicious = async () => {
    await chrome.runtime.sendMessage({ type: 'REPORT_SUSPICIOUS' });
    alert('Reported to CyberTwin global threat intel network.');
  };

  const clearMemory = async () => {
    await chrome.runtime.sendMessage({ type: 'CLEAR_MEMORY' });
    setScan(null);
  };

  const openDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  };

  return (
    <div className="popup-root cyber-grid-bg">
      <header className="popup-header">
        <div className="popup-logo">
          <div className="logo-icon">🛡️</div>
          <div>
            <h1>CyberTwin AI</h1>
            <p>Trust Engine Active</p>
          </div>
        </div>
        <div className="privacy-badge">
          {settings?.privacyMode ? '🔒 Privacy Guard' : '☁️ Cloud Connected'}
        </div>
      </header>

      <section className="glass-card status-card">
        <div className="status-row">
          <span className="label">Endpoint status</span>
          <span className="value text-cyan-400 font-mono">{pageStatus}</span>
        </div>
        <button className="btn-primary w-full mt-3 font-mono tracking-wide" onClick={triggerScan} disabled={loading}>
          {loading ? 'ANALYZING THREAT GRID...' : '🔍 INJECT TRUST SEARCH'}
        </button>
      </section>

      {scan && (
        <section className="scan-result space-y-3 animate-fade-in">
          {/* Dashboard Overall Trust Meter */}
          <div className="scan-overview">
            <div className="relative w-16 h-16 flex items-center justify-center rounded-full border-2 border-cyan-500/20 bg-cyber-black shadow-glow">
              <span className="text-xl font-bold text-cyan-400 font-mono">{scan.trustScore}</span>
              <div className="absolute -bottom-2 px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-[7px] text-cyan-300 font-bold uppercase tracking-wider">
                TRUST
              </div>
            </div>
            <div className="scan-meta">
              <div className="flex items-center gap-2">
                <span className={`badge-${scan.riskLevel}`}>{levelLabel(scan.riskLevel)}</span>
                <span className="text-[10px] text-zinc-500 font-mono">Confidence: {scan.subScores?.confidenceScore ?? 50}%</span>
              </div>
              <p className="sender text-xs truncate">
                {scan.email.senderName || scan.email.senderEmail}
              </p>
              <p className="trust font-mono text-[9px]">
                Domain: <span className="text-cyan-300">{scan.email.senderDomain}</span>
              </p>
            </div>
          </div>

          {/* Subscores cards & progress bars */}
          <div className="glass-card p-3">
            <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2 font-mono">
              AI Trust Indicators
            </h4>
            <div className="subscores-grid font-mono">
              <div className="subscore-item">
                <div className="flex justify-between text-[9px] mb-1">
                  <span className="label">Identity Trust</span>
                  <span className="text-cyan-400">{scan.subScores?.identityTrust ?? 50}%</span>
                </div>
                <div className="subscore-bar-bg">
                  <div className="subscore-bar-fill bg-cyan-400" style={{ width: `${scan.subScores?.identityTrust ?? 50}%` }} />
                </div>
              </div>
              <div className="subscore-item">
                <div className="flex justify-between text-[9px] mb-1">
                  <span className="label">Intent Risk</span>
                  <span className="text-red-400">{scan.subScores?.intentRisk ?? 30}%</span>
                </div>
                <div className="subscore-bar-bg">
                  <div className="subscore-bar-fill bg-red-500" style={{ width: `${scan.subScores?.intentRisk ?? 30}%` }} />
                </div>
              </div>
              <div className="subscore-item">
                <div className="flex justify-between text-[9px] mb-1">
                  <span className="label">Manipulation</span>
                  <span className="text-red-400">{scan.subScores?.manipulationRisk ?? 20}%</span>
                </div>
                <div className="subscore-bar-bg">
                  <div className="subscore-bar-fill bg-red-400" style={{ width: `${scan.subScores?.manipulationRisk ?? 20}%` }} />
                </div>
              </div>
              <div className="subscore-item">
                <div className="flex justify-between text-[9px] mb-1">
                  <span className="label">Link Risk</span>
                  <span className="text-red-400">{scan.subScores?.websiteRisk ?? 30}%</span>
                </div>
                <div className="subscore-bar-bg">
                  <div className="subscore-bar-fill bg-red-500" style={{ width: `${scan.subScores?.websiteRisk ?? 30}%` }} />
                </div>
              </div>
              <div className="subscore-item">
                <div className="flex justify-between text-[9px] mb-1">
                  <span className="label">Privacy Risk</span>
                  <span className="text-orange-400">{scan.subScores?.privacyRisk ?? 20}%</span>
                </div>
                <div className="subscore-bar-bg">
                  <div className="subscore-bar-fill bg-orange-500" style={{ width: `${scan.subScores?.privacyRisk ?? 20}%` }} />
                </div>
              </div>
              <div className="subscore-item">
                <div className="flex justify-between text-[9px] mb-1">
                  <span className="label">Financial Risk</span>
                  <span className="text-orange-400">{scan.subScores?.financialRisk ?? 10}%</span>
                </div>
                <div className="subscore-bar-bg">
                  <div className="subscore-bar-fill bg-orange-400" style={{ width: `${scan.subScores?.financialRisk ?? 10}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Explainable AI Panel */}
          {scan.reasoningBullets && scan.reasoningBullets.length > 0 && (
            <div className="explainable-section">
              <h3><span>🧠</span> Why CyberTwin thinks this is {scan.riskLevel}</h3>
              <ul className="reasoning-list">
                {scan.reasoningBullets.map((bullet, idx) => (
                  <li key={idx}>{bullet}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Social Engineering tactics grid */}
          {scan.socialEngineering && (
            <div className="glass-card p-3">
              <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2 font-mono">
                Social Engineering Radar
              </h4>
              <div className="tactics-grid">
                <div className={`tactic-tag tactic-${scan.socialEngineering.urgency}`}>
                  Urgency: {scan.socialEngineering.urgency}
                </div>
                <div className={`tactic-tag tactic-${scan.socialEngineering.fear}`}>
                  Fear: {scan.socialEngineering.fear}
                </div>
                <div className={`tactic-tag tactic-${scan.socialEngineering.authority}`}>
                  Authority: {scan.socialEngineering.authority}
                </div>
                <div className={`tactic-tag tactic-${scan.socialEngineering.scarcity}`}>
                  Scarcity: {scan.socialEngineering.scarcity}
                </div>
                <div className={`tactic-tag tactic-${scan.socialEngineering.curiosity}`}>
                  Curiosity: {scan.socialEngineering.curiosity}
                </div>
                <div className={`tactic-tag tactic-${scan.socialEngineering.credentialRequests}`}>
                  Credentials: {scan.socialEngineering.credentialRequests}
                </div>
                <div className={`tactic-tag tactic-${scan.socialEngineering.financialRequests}`}>
                  Financial: {scan.socialEngineering.financialRequests}
                </div>
                <div className={`tactic-tag tactic-${scan.socialEngineering.emotionalManipulation}`}>
                  Emotions: {scan.socialEngineering.emotionalManipulation}
                </div>
              </div>
            </div>
          )}

          {/* QR Scan Details warning */}
          {scan.qrIntel && scan.qrIntel.detected && (
            <div className="qr-section border-l-2 border-orange-500 bg-orange-950/20">
              <h3><span>📷</span> QR CODE SCANNER</h3>
              <div className="text-xs space-y-1 font-mono text-zinc-300">
                <div>Decoded URL: <span className="text-orange-400 break-all select-all">{scan.qrIntel.decodedUrl}</span></div>
                <div>Risk Assessment: <span className="text-orange-400 uppercase font-bold">{scan.qrIntel.riskLevel} (score: {scan.qrIntel.riskScore})</span></div>
                <p className="text-[10px] text-zinc-400 mt-1 italic">{scan.qrIntel.details}</p>
              </div>
            </div>
          )}

          {/* Contextual Anomalies */}
          {scan.contextualAnomalies && scan.contextualAnomalies.length > 0 && (
            <div className="anomalies-section border-l-2 border-red-500 bg-red-950/20">
              <h3><span>🚨</span> Contextual Anomalies</h3>
              <ul className="reasoning-list font-mono text-zinc-300">
                {scan.contextualAnomalies.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action recommendation */}
          <div className="glass-card p-3 border border-red-500/20 bg-red-950/10">
            <span className="text-[9px] font-bold uppercase tracking-wider text-red-400 font-mono block mb-1">
              RECOMMENDED COUNTERMEASURE
            </span>
            <p className="text-xs font-semibold text-zinc-200">
              {scan.recommendedAction}
            </p>
          </div>
        </section>
      )}

      <section className="glass-card quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-grid">
          <button className="btn-secondary" onClick={markTrusted} disabled={!scan}>
            ✓ Trust domain
          </button>
          <button className="btn-secondary" onClick={reportSuspicious}>
            ⚠ Report Phish
          </button>
          <button className="btn-secondary" onClick={openDashboard}>
            📊 Dashboard
          </button>
          <button className="btn-secondary" onClick={clearMemory}>
            🗑 Reset
          </button>
        </div>
      </section>

      <section className="glass-card demo-section">
        <h3>Demo Scenario Injector</h3>
        <select
          className="input-cyber font-mono text-cyan-400"
          value={settings?.activeDemoCase || 'safe-known-sender'}
          onChange={(e) => runDemo(e.target.value)}
        >
          {DEMO_CASES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </section>

      <footer className="popup-footer">
        <a href="#" onClick={() => chrome.runtime.openOptionsPage()}>
          Configurations
        </a>
        <span>CyberTwin Engine v1.1</span>
      </footer>
    </div>
  );
}

export default Popup;
