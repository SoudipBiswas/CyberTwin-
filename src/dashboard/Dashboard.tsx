import { useEffect, useState } from 'react';
import { RiskMeter } from '../components/RiskMeter';
import { ThreatCard } from '../components/ThreatCard';
import { TrustGraph } from '../components/TrustGraph';
import { AgentGrid, ScanSummary } from '../components/AgentCard';
import { buildTrustGraph } from '../agents/analysisEngine';
import type { ScanResult } from '../types';
import { levelLabel } from '../utils/scoreUtils';

export function Dashboard() {
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [selected, setSelected] = useState<ScanResult | null>(null);

  useEffect(() => {
    chrome.storage.local.get(['scanHistory', 'latestScan'], (result) => {
      const scans = (result.scanHistory as ScanResult[]) || [];
      setHistory(scans);
      setSelected(scans[0] || (result.latestScan as ScanResult) || null);
    });
  }, []);

  const graph = selected ? buildTrustGraph(selected) : null;

  return (
    <div className="dashboard-root cyber-grid-bg min-h-screen">
      <header className="dashboard-header">
        <div>
          <h1>🛡️ CyberTwin AI</h1>
          <p>Full Analysis Dashboard</p>
        </div>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-num">{history.length}</span>
            <span className="stat-label">Scans</span>
          </div>
          <div className="stat">
            <span className="stat-num">
              {history.filter((s) => s.riskLevel === 'dangerous').length}
            </span>
            <span className="stat-label">Threats</span>
          </div>
        </div>
      </header>

      <div className="dashboard-grid">
        <aside className="history-panel glass-card">
          <h2>Scan History</h2>
          <div className="history-list">
            {history.length === 0 ? (
              <p className="empty-state">No scans yet. Run a scan from Gmail or the popup.</p>
            ) : (
              history.map((scan) => (
                <button
                  key={scan.id}
                  className={`history-item ${selected?.id === scan.id ? 'active' : ''}`}
                  onClick={() => setSelected(scan)}
                >
                  <div className="history-top">
                    <span className={`badge-${scan.riskLevel}`}>
                      {levelLabel(scan.riskLevel)}
                    </span>
                    <span className="history-score">{scan.riskScore}</span>
                  </div>
                  <p className="history-subject">{scan.email.subject}</p>
                  <p className="history-sender">{scan.email.senderEmail}</p>
                  <p className="history-time">
                    {new Date(scan.timestamp).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="analysis-panel">
          {selected ? (
            <div className="space-y-4 animate-fade-in">
              <div className="top-row">
                <div className="glass-card overview-card">
                  <RiskMeter score={selected.riskScore} level={selected.riskLevel} size="lg" />
                  <div className="overview-details">
                    <h2>{selected.email.subject}</h2>
                    <p>
                      {selected.email.senderName} &lt;{selected.email.senderEmail}&gt;
                    </p>
                    <p className="trust-line">
                      Sender Trust: <strong>{selected.senderTrustScore}/100</strong>
                    </p>
                  </div>
                </div>
                {graph && <TrustGraph graph={graph} />}
              </div>

              <ScanSummary scan={selected} />

              <div className="glass-card section-card">
                <h3>Agent Analysis</h3>
                <AgentGrid scan={selected} />
              </div>

              <div className="detail-grid">
                <div className="glass-card section-card">
                  <h3>Detected Links</h3>
                  {selected.email.links.length === 0 ? (
                    <p className="empty">No links found</p>
                  ) : (
                    <ul className="link-list">
                      {selected.email.links.map((l, i) => (
                        <li key={i}>
                          <span className="link-text">{l.displayText}</span>
                          <a href={l.href} target="_blank" rel="noopener noreferrer">
                            {l.href}
                          </a>
                          {l.mismatched && <span className="mismatch">⚠ Mismatch</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="glass-card section-card">
                  <h3>Attachments</h3>
                  {selected.email.attachments.length === 0 ? (
                    <p className="empty">No attachments</p>
                  ) : (
                    <ul className="attachment-list">
                      {selected.email.attachments.map((a, i) => (
                        <li key={i}>📎 {a}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="glass-card section-card">
                <h3>All Findings</h3>
                <div className="findings-grid">
                  {selected.findings.map((f, i) => (
                    <ThreatCard key={i} finding={f} />
                  ))}
                </div>
              </div>

              <div className="glass-card section-card">
                <h3>Risk Timeline</h3>
                <div className="timeline">
                  {history.slice(0, 10).map((s) => (
                    <div key={s.id} className="timeline-bar">
                      <span className="timeline-label">
                        {new Date(s.timestamp).toLocaleDateString()}
                      </span>
                      <div className="timeline-track">
                        <div
                          className={`timeline-fill fill-${s.riskLevel}`}
                          style={{ width: `${s.riskScore}%` }}
                        />
                      </div>
                      <span className="timeline-score">{s.riskScore}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card empty-dashboard">
              <h2>Select a scan or run your first analysis</h2>
              <p>Open Gmail and click "Scan with CyberTwin AI"</p>
            </div>
          )}
        </main>
      </div>

      <style>{`
        .dashboard-root { padding: 24px 32px; }
        .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .dashboard-header h1 { font-size: 28px; font-weight: 700; margin: 0; background: linear-gradient(to right, #fff, #fca5a5); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .dashboard-header p { color: #71717a; margin: 4px 0 0; }
        .header-stats { display: flex; gap: 24px; }
        .stat { text-align: center; }
        .stat-num { display: block; font-size: 24px; font-weight: 700; color: #dc2626; }
        .stat-label { font-size: 11px; color: #71717a; text-transform: uppercase; }
        .dashboard-grid { display: grid; grid-template-columns: 300px 1fr; gap: 20px; }
        .history-panel { padding: 16px; max-height: calc(100vh - 120px); overflow-y: auto; }
        .history-panel h2 { font-size: 12px; text-transform: uppercase; color: #71717a; margin: 0 0 12px; letter-spacing: 0.06em; }
        .history-item { width: 100%; text-align: left; padding: 12px; margin-bottom: 8px; background: rgba(255,255,255,0.03); border: 1px solid transparent; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
        .history-item:hover, .history-item.active { border-color: rgba(220,38,38,0.4); background: rgba(220,38,38,0.08); }
        .history-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .history-score { font-weight: 700; color: #fff; }
        .history-subject { font-size: 13px; color: #d4d4d8; margin: 0 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .history-sender { font-size: 11px; color: #71717a; margin: 0 0 4px; }
        .history-time { font-size: 10px; color: #52525b; margin: 0; }
        .top-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .overview-card { padding: 24px; display: flex; align-items: center; gap: 24px; }
        .overview-details h2 { font-size: 18px; margin: 0 0 8px; color: #fff; }
        .overview-details p { font-size: 13px; color: #a1a1aa; margin: 0 0 4px; }
        .trust-line { color: #71717a !important; }
        .trust-line strong { color: #22c55e; }
        .section-card { padding: 16px; }
        .section-card h3 { font-size: 12px; text-transform: uppercase; color: #71717a; margin: 0 0 12px; letter-spacing: 0.06em; }
        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .link-list, .attachment-list { list-style: none; margin: 0; padding: 0; }
        .link-list li { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 12px; }
        .link-text { display: block; color: #d4d4d8; margin-bottom: 2px; }
        .link-list a { color: #dc2626; word-break: break-all; }
        .mismatch { color: #f97316; font-size: 10px; margin-left: 8px; }
        .attachment-list li { padding: 6px 0; font-size: 13px; color: #d4d4d8; }
        .findings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .timeline-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .timeline-label { font-size: 10px; color: #71717a; width: 70px; }
        .timeline-track { flex: 1; height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; }
        .timeline-fill { height: 100%; border-radius: 4px; transition: width 0.5s; }
        .fill-safe { background: #22c55e; }
        .fill-suspicious { background: #f97316; }
        .fill-dangerous { background: #ef4444; }
        .timeline-score { font-size: 11px; color: #a1a1aa; width: 30px; text-align: right; }
        .empty, .empty-state { color: #52525b; font-size: 13px; }
        .empty-dashboard { padding: 60px; text-align: center; }
        .empty-dashboard h2 { color: #d4d4d8; margin-bottom: 8px; }
        .space-y-4 > * + * { margin-top: 16px; }
      `}</style>
    </div>
  );
}

export default Dashboard;
