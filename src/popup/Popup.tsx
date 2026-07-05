import { useCallback, useEffect, useState } from 'react';
import { RiskMeter } from '../components/RiskMeter';
import { ThreatCard } from '../components/ThreatCard';
import type { ScanResult, Settings } from '../types';
import { DEMO_CASES } from '../demo/demoCases';
import { levelLabel } from '../utils/scoreUtils';
import './popup.css';

export function Popup() {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageStatus, setPageStatus] = useState('Monitoring');
  const [debugResponse, setDebugResponse] = useState<any>(null);


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
      setPageStatus(host.includes('mail.google.com') ? 'Gmail — Ready' : host);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const triggerScan = async () => {
    setLoading(true);
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      let pageData: any = null;
      if (tab?.id) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'CYBERTWIN_SCAN_PAGE' });
          console.log('CyberTwin scan response:', response);
console.log('CYBERTWIN_RESPONSE', response);
setDebugResponse(response);
          if (response?.success) {
            // Support various response shapes
            pageData = response.result ?? response.results ?? response;
          }
        } catch (e) {
          console.warn('Content script scan failed, using mock fallback', e);
        }
      }

      let scanResult: any;
      if (pageData && pageData.source === 'gmail') {
        // Build scan result from real Gmail data
        const urlObj = new URL(tab?.url || '');
        scanResult = {
          riskScore: 42,
          riskLevel: 'high',
          email: {
            senderName: pageData.senderName || '',
            senderEmail: pageData.senderEmail || '',
            senderDomain: pageData.senderDomain || urlObj.hostname,
            subject: pageData.subject || '',
            bodyText: pageData.body || '',
            links: pageData.links || [],
            attachments: pageData.attachments || [],
            timestamp: pageData.timestamp || '',
            pageUrl: pageData.pageUrl || urlObj.href,
          },
          senderTrustScore: 0,
          findings: (pageData.links || []).map((link: any) => ({
            title: typeof link === 'string' ? link : link.href,
            score: 0,
            description: 'Link detected',
          })),
          recommendedAction: 'Review this page carefully.',
          reasons: [],
        } as any;
      } else if (pageData) {
        // Fallback for generic page data (non‑gmail)
        const urlObj = new URL(pageData.url || '');
        scanResult = {
          riskScore: 42,
          riskLevel: 'high',
          email: {
            senderName: pageData.title || 'Unknown Page',
            senderEmail: 'unknown@page.local',
            senderDomain: urlObj.hostname || '',
          },
          senderTrustScore: 0,
          findings: (pageData.links || []).map((link: string) => ({
            title: link,
            score: 0,
            description: 'Link detected',
          })),
          recommendedAction: 'Review this page carefully.',
          reasons: [pageData.preview?.slice(0, 200) || 'No preview available'],
        } as any;
      } else {
        // Full mock fallback
        scanResult = {
          riskScore: 42,
          riskLevel: 'high',
          email: {
            senderName: 'Demo Sender',
            senderEmail: 'demo@example.com',
            senderDomain: 'example.com',
          },
          senderTrustScore: 0,
          findings: [],
          recommendedAction: 'Review this page carefully.',
          reasons: ['Demo scan completed', 'Content script fallback used'],
        } as any;
      }
      setScan(scanResult);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ latestScan: scanResult });
      }
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
  };

  const reportSuspicious = async () => {
    await chrome.runtime.sendMessage({ type: 'REPORT_SUSPICIOUS' });
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
            <p>Digital Trust Guardian</p>
          </div>
        </div>
        <div className="privacy-badge">
          {settings?.privacyMode ? '🔒 Privacy Mode' : '☁️ Cloud Ready'}
        </div>
      </header>

      <section className="glass-card status-card">
        <div className="status-row">
          <span className="label">Page Status</span>
          <span className="value">{pageStatus}</span>
        </div>
        <button className="btn-primary w-full mt-3" onClick={triggerScan} disabled={loading}>
          {loading ? 'Scanning…' : '🔍 Scan Current Page'}
        </button>
      </section>

      {scan && (
        <section className="scan-result animate-fade-in">
          <div className="glass-card scan-overview">
            <RiskMeter score={scan.riskScore} level={scan.riskLevel} size="sm" />
            <div className="scan-meta">
              <span className={`badge-${scan.riskLevel}`}>{levelLabel(scan.riskLevel)}</span>
              {/* Display sender info based on available data */}
            <p className="sender">
              {scan.email.platform === 'gmail' ? (
                <>
                  From: {scan.email.senderName || scan.email.senderEmail}
                  {scan.email.subject && (
                    <> | Subject: {scan.email.subject}</>
                  )}
                </>
              ) : (
                <>From: {scan.email.senderName || scan.email.senderEmail || scan.email.subject || 'Current Page'}</>
              )}
            </p>
              <p className="trust">Sender Trust: {scan.senderTrustScore}/100</p>
            </div>
          </div>

          <div className="glass-card threats-section">
            <h3>Detected Threats</h3>
            {scan.findings.filter((f) => f.score > 0).length === 0 ? (
              <p className="no-threats">No threats detected ✓</p>
            ) : (
              scan.findings
                .filter((f) => f.score > 0)
                .slice(0, 4)
                .map((f, i) => <ThreatCard key={i} finding={f} compact />)
            )}
          </div>
        </section>
      )}

      <section className="glass-card quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-grid">
          <button className="btn-secondary" onClick={markTrusted} disabled={!scan}>
            ✓ Trust Sender
          </button>
          <button className="btn-secondary" onClick={reportSuspicious}>
            ⚠ Report
          </button>
          <button className="btn-secondary" onClick={openDashboard}>
            📊 Dashboard
          </button>
          <button className="btn-secondary" onClick={clearMemory}>
            🗑 Clear Memory
          </button>
        </div>
      </section>

      <section className="glass-card demo-section">
        <h3>Demo Scenarios</h3>
        <select
          className="input-cyber"
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
          Settings
        </a>
        <span>CyberTwin AI v1.0</span>
      </footer>
{debugResponse && (
  <pre style={{maxHeight:"200px",overflow:"auto",fontSize:"10px"}}>
    {JSON.stringify(debugResponse, null, 2)}
  </pre>
)}
</div>
  );
}

export default Popup;
