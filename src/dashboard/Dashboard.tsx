import { useEffect, useState } from 'react';
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
          <p>Next-Gen Cybersecurity Trust Engine Dashboard</p>
        </div>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-num">{history.length}</span>
            <span className="stat-label">Scans</span>
          </div>
          <div className="stat text-cyan-400">
            <span className="stat-num text-cyan-400">
              {history.filter((s) => s.riskLevel === 'dangerous').length}
            </span>
            <span className="stat-label">Critical Risks</span>
          </div>
        </div>
      </header>

      <div className="dashboard-grid">
        <aside className="history-panel glass-card">
          <h2>Scan Repository</h2>
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
                    <span className="history-score font-mono text-cyan-400">{scan.trustScore ?? (100 - scan.riskScore)} trust</span>
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
                  {/* Trust Score Ring */}
                  <div className="relative w-28 h-28 flex items-center justify-center rounded-full border-4 border-cyan-500/20 bg-cyber-black shadow-glow-lg">
                    <span className="text-3xl font-black text-cyan-400 font-mono">{selected.trustScore}</span>
                    <div className="absolute -bottom-2.5 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-[9px] text-cyan-300 font-bold uppercase tracking-widest">
                      TRUST INDEX
                    </div>
                  </div>
                  <div className="overview-details">
                    <h2>{selected.email.subject}</h2>
                    <p className="font-mono text-xs text-zinc-400">
                      Sender: {selected.email.senderName} &lt;<span className="text-cyan-400">{selected.email.senderEmail}</span>&gt;
                    </p>
                    <p className="trust-line font-mono text-xs">
                      Identity Confidence Score: <strong className="text-cyan-300">{selected.subScores?.confidenceScore ?? 75}%</strong>
                    </p>
                  </div>
                </div>
                {graph && <TrustGraph graph={graph} />}
              </div>

              {/* Explainable AI Panel */}
              {selected.reasoningBullets && selected.reasoningBullets.length > 0 && (
                <div className="glass-card section-card border-l-4 border-cyan-500 bg-cyan-950/10">
                  <h3>🧠 Explainable AI reasoning</h3>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 font-medium">
                    {selected.reasoningBullets.map((bullet, idx) => (
                      <li key={idx}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Subscores Grid */}
              <div className="glass-card section-card">
                <h3>AI Trust Indicators & Sub-scores</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 font-mono">
                  <div className="p-3 bg-cyber-dark/40 border border-cyber-border rounded-xl">
                    <div className="flex justify-between text-xs mb-1.5 text-zinc-400">
                      <span>Identity Trust</span>
                      <span className="text-cyan-400 font-bold">{selected.subScores?.identityTrust ?? 50}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${selected.subScores?.identityTrust ?? 50}%` }} />
                    </div>
                  </div>
                  <div className="p-3 bg-cyber-dark/40 border border-cyber-border rounded-xl">
                    <div className="flex justify-between text-xs mb-1.5 text-zinc-400">
                      <span>Intent Risk</span>
                      <span className="text-red-400 font-bold">{selected.subScores?.intentRisk ?? 30}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${selected.subScores?.intentRisk ?? 30}%` }} />
                    </div>
                  </div>
                  <div className="p-3 bg-cyber-dark/40 border border-cyber-border rounded-xl">
                    <div className="flex justify-between text-xs mb-1.5 text-zinc-400">
                      <span>Manipulation Risk</span>
                      <span className="text-red-400 font-bold">{selected.subScores?.manipulationRisk ?? 20}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full" style={{ width: `${selected.subScores?.manipulationRisk ?? 20}%` }} />
                    </div>
                  </div>
                  <div className="p-3 bg-cyber-dark/40 border border-cyber-border rounded-xl">
                    <div className="flex justify-between text-xs mb-1.5 text-zinc-400">
                      <span>Website/Link Risk</span>
                      <span className="text-red-400 font-bold">{selected.subScores?.websiteRisk ?? 30}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${selected.subScores?.websiteRisk ?? 30}%` }} />
                    </div>
                  </div>
                  <div className="p-3 bg-cyber-dark/40 border border-cyber-border rounded-xl">
                    <div className="flex justify-between text-xs mb-1.5 text-zinc-400">
                      <span>Privacy Risk</span>
                      <span className="text-orange-400 font-bold">{selected.subScores?.privacyRisk ?? 20}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${selected.subScores?.privacyRisk ?? 20}%` }} />
                    </div>
                  </div>
                  <div className="p-3 bg-cyber-dark/40 border border-cyber-border rounded-xl">
                    <div className="flex justify-between text-xs mb-1.5 text-zinc-400">
                      <span>Financial Risk</span>
                      <span className="text-orange-400 font-bold">{selected.subScores?.financialRisk ?? 10}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 rounded-full" style={{ width: `${selected.subScores?.financialRisk ?? 10}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Engineering Analyzer Grid */}
              {selected.socialEngineering && (
                <div className="glass-card section-card">
                  <h3>Social Engineering Tactic Severity</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(selected.socialEngineering).map(([tactic, severity]) => {
                      const colors = {
                        low: 'bg-green-500/10 text-green-400 border-green-500/20',
                        medium: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                        high: 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse',
                      };
                      return (
                        <div key={tactic} className={`p-3 border rounded-xl text-center font-mono ${colors[severity as 'low' | 'medium' | 'high']}`}>
                          <span className="text-[10px] uppercase tracking-wider block text-zinc-400 font-semibold mb-1">
                            {tactic.replace(/([A-Z])/g, ' $1')}
                          </span>
                          <span className="text-xs font-bold uppercase">{severity}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* QR Scan Details Section */}
              {selected.qrIntel && selected.qrIntel.detected && (
                <div className="glass-card section-card border-l-4 border-orange-500 bg-orange-950/10">
                  <h3>📷 Decoded QR Destination Target</h3>
                  <div className="text-sm font-mono space-y-2 text-zinc-300">
                    <div>QR code redirects to: <a href={selected.qrIntel.decodedUrl} target="_blank" rel="noopener noreferrer" className="text-orange-400 break-all select-all font-semibold underline">{selected.qrIntel.decodedUrl}</a></div>
                    <div>Destination Risk: <span className="text-orange-400 uppercase font-bold">{selected.qrIntel.riskLevel} (score: {selected.qrIntel.riskScore}/100)</span></div>
                    <p className="text-xs text-zinc-400 italic mt-1">{selected.qrIntel.details}</p>
                  </div>
                </div>
              )}

              {/* Contextual Anomalies */}
              {selected.contextualAnomalies && selected.contextualAnomalies.length > 0 && (
                <div className="glass-card section-card border-l-4 border-red-500 bg-red-950/10">
                  <h3>🚨 Sender Profile Deviations (Contextual AI)</h3>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm text-zinc-300 font-mono">
                    {selected.contextualAnomalies.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              <ScanSummary scan={selected} />

              <div className="glass-card section-card">
                <h3>Agent Detection Core</h3>
                <AgentGrid scan={selected} />
              </div>

              {/* Link Intelligence and Typosquat details */}
              <div className="glass-card section-card">
                <h3>Link Intelligence Table</h3>
                {selected.linkIntel && selected.linkIntel.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full font-mono text-xs text-zinc-300 border border-cyber-border">
                      <thead>
                        <tr className="bg-cyber-dark/80 text-cyan-400 border-b border-cyber-border">
                          <th className="px-4 py-2 text-left">Scanned Link</th>
                          <th className="px-4 py-2 text-left">Redirected Target</th>
                          <th className="px-4 py-2 text-center">Shortener</th>
                          <th className="px-4 py-2 text-center">Typosquat</th>
                          <th className="px-4 py-2 text-center">New Domain</th>
                          <th className="px-4 py-2 text-center">Link Trust</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.linkIntel.map((l, i) => (
                          <tr key={i} className="border-b border-cyber-border/40 hover:bg-cyber-dark/20">
                            <td className="px-4 py-2 max-w-[200px] truncate" title={l.url}>{l.url}</td>
                            <td className="px-4 py-2 max-w-[200px] truncate text-zinc-400" title={l.expandedUrl || '-'}>
                              {l.isRedirected ? <span className="text-cyan-300 font-semibold">{l.expandedUrl}</span> : '-'}
                            </td>
                            <td className="px-4 py-2 text-center">{l.isShortener ? '⚠️' : '✓'}</td>
                            <td className="px-4 py-2 text-center">{l.isTyposquat ? '⚠️' : '✓'}</td>
                            <td className="px-4 py-2 text-center">{l.isSuspiciousTld ? '⚠️' : '✓'}</td>
                            <td className={`px-4 py-2 text-center font-bold ${l.trustScore < 70 ? 'text-red-400' : 'text-green-400'}`}>
                              {l.trustScore}/100
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="empty">No links analyzed in this scan.</p>
                )}
              </div>

              <div className="glass-card section-card">
                <h3>All Threats Detected</h3>
                <div className="findings-grid">
                  {selected.findings.map((f, i) => (
                    <ThreatCard key={i} finding={f} />
                  ))}
                </div>
              </div>

              <div className="glass-card section-card">
                <h3>Risk History timeline</h3>
                <div className="timeline">
                  {history.slice(0, 10).map((s) => (
                    <div key={s.id} className="timeline-bar font-mono">
                      <span className="timeline-label text-zinc-400">
                        {new Date(s.timestamp).toLocaleDateString()}
                      </span>
                      <div className="timeline-track">
                        <div
                          className={`timeline-fill fill-${s.riskLevel}`}
                          style={{ width: `${s.riskScore}%` }}
                        />
                      </div>
                      <span className="timeline-score text-cyan-400 font-bold">{s.trustScore ?? (100 - s.riskScore)} trust</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card empty-dashboard">
              <h2>Select an analysis scan or run your first investigation</h2>
              <p>Open Gmail and click "Scan with CyberTwin AI"</p>
            </div>
          )}
        </main>
      </div>

      <style>{`
        .dashboard-root { padding: 24px 32px; }
        .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .dashboard-header h1 { font-size: 28px; font-weight: 700; margin: 0; background: linear-gradient(to right, #ffffff, #22d3ee); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .dashboard-header p { color: #71717a; margin: 4px 0 0; }
        .header-stats { display: flex; gap: 24px; }
        .stat { text-align: center; }
        .stat-num { display: block; font-size: 24px; font-weight: 700; color: #06b6d4; }
        .stat-label { font-size: 11px; color: #71717a; text-transform: uppercase; }
        .dashboard-grid { display: grid; grid-template-columns: 320px 1fr; gap: 20px; }
        .history-panel { padding: 16px; max-height: calc(100vh - 120px); overflow-y: auto; }
        .history-panel h2 { font-size: 12px; text-transform: uppercase; color: #71717a; margin: 0 0 12px; letter-spacing: 0.06em; }
        .history-item { width: 100%; text-align: left; padding: 12px; margin-bottom: 8px; background: rgba(255,255,255,0.03); border: 1px solid transparent; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
        .history-item:hover, .history-item.active { border-color: rgba(6,182,212,0.4); background: rgba(6,182,212,0.08); }
        .history-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .history-score { font-weight: 700; }
        .history-subject { font-size: 13px; color: #d4d4d8; margin: 0 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .history-sender { font-size: 11px; color: #71717a; margin: 0 0 4px; }
        .history-time { font-size: 10px; color: #52525b; margin: 0; }
        .top-row { display: grid; grid-template-columns: 1fr 1.2fr; gap: 16px; }
        .overview-card { padding: 24px; display: flex; align-items: center; gap: 24px; }
        .overview-details h2 { font-size: 18px; margin: 0 0 8px; color: #fff; }
        .overview-details p { font-size: 13px; color: #a1a1aa; margin: 0 0 4px; }
        .trust-line { color: #71717a !important; }
        .trust-line strong { color: #22c55e; }
        .section-card { padding: 16px; }
        .section-card h3 { font-size: 12px; text-transform: uppercase; color: #8b5cf6; margin: 0 0 12px; letter-spacing: 0.06em; font-weight: bold; }
        .findings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .timeline-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .timeline-label { font-size: 10px; color: #71717a; width: 70px; }
        .timeline-track { flex: 1; height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; }
        .timeline-fill { height: 100%; border-radius: 4px; transition: width 0.5s; }
        .fill-safe { background: #22c55e; }
        .fill-suspicious { background: #f97316; }
        .fill-dangerous { background: #ef4444; }
        .timeline-score { font-size: 11px; color: #a1a1aa; width: 60px; text-align: right; }
        .empty, .empty-state { color: #52525b; font-size: 13px; }
        .empty-dashboard { padding: 60px; text-align: center; }
        .empty-dashboard h2 { color: #d4d4d8; margin-bottom: 8px; }
        .space-y-4 > * + * { margin-top: 16px; }
      `}</style>
    </div>
  );
}

export default Dashboard;
