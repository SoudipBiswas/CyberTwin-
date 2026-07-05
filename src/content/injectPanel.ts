import type { ScanResult } from '../types';
import { levelColor, levelLabel } from '../utils/scoreUtils';

export interface PanelState {
  visible: boolean;
  expanded: boolean;
  scanning: boolean;
  scan: ScanResult | null;
}

export function createFloatingPanelHTML(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'cybertwin-floating-panel';
  container.innerHTML = getPanelHTML(null, false, false);
  return container;
}

function getPanelHTML(
  scan: ScanResult | null,
  expanded: boolean,
  scanning: boolean
): string {
  const score = scan?.riskScore ?? 0;
  const level = scan?.riskLevel ?? 'safe';
  const color = levelColor(level);
  const logoUrl = chrome.runtime.getURL('logo.png');

  return `
    <div class="ct-panel-inner">
      <div class="ct-header">
        <div class="ct-logo-wrap">
          <img src="${logoUrl}" alt="CyberTwin AI" class="ct-logo" onerror="this.style.display='none'" />
          <div class="ct-brand">
            <span class="ct-brand-name">CyberTwin AI</span>
            <span class="ct-brand-tag">Digital Trust Guardian</span>
          </div>
        </div>
        <button class="ct-btn-icon" id="ct-toggle-expand" title="Expand">${expanded ? '▼' : '▲'}</button>
        <button class="ct-btn-icon" id="ct-view-dashboard" title="Dashboard">📊</button>
        <button class="ct-btn-icon" id="ct-close-panel" title="Close">✕</button>
      </div>

      <div class="ct-body">
        ${
          scanning
            ? `<div class="ct-scanning"><div class="ct-spinner"></div><span>Analyzing with CyberTwin AI...</span></div>`
            : scan
              ? `
          <div class="ct-score-row">
            <div class="ct-score-ring" style="--score-color: ${color}; --score-pct: ${score}">
              <span class="ct-score-num">${score}</span>
            </div>
            <div class="ct-score-meta">
              <span class="ct-status ct-status-${level}">${levelLabel(level)}</span>
              <span class="ct-trust">Sender Trust: ${scan.senderTrustScore}/100</span>
            </div>
          </div>

          <div class="ct-sender-info" style="margin-bottom: 12px; font-size: 12px; color: #d4d4d8;">
            <div style="margin-bottom: 4px;"><strong>Sender:</strong> ${escapeHtml(scan.email.senderName || scan.email.senderEmail)}</div>
            <div><strong>Domain:</strong> ${escapeHtml(scan.email.senderDomain)}</div>
          </div>

          ${
            scan.topReasons.length > 0
              ? `<div class="ct-reasons">
              <h4>Top Risk Reasons</h4>
              <ul>${scan.topReasons.slice(0, 3).map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
            </div>`
              : ''
          }

          <div class="ct-action">
            <strong>Recommended:</strong> ${escapeHtml(scan.recommendedAction)}
          </div>

          ${
            expanded
              ? `
            <div class="ct-details">
              <p class="ct-explanation">${escapeHtml(scan.explanation)}</p>
            </div>`
              : ''
          }
        `
              : `<div class="ct-idle"><p>Click "Scan with CyberTwin AI" to analyze this message.</p></div>`
        }
      </div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function updatePanel(
  container: HTMLElement,
  scan: ScanResult | null,
  expanded: boolean,
  scanning: boolean
): void {
  container.innerHTML = getPanelHTML(scan, expanded, scanning);
}

export function injectPanelStyles(): void {
  if (document.getElementById('cybertwin-panel-styles')) return;

  const style = document.createElement('style');
  style.id = 'cybertwin-panel-styles';
  style.textContent = `
    #cybertwin-floating-panel {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483646;
      width: 340px;
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
      animation: ctSlideIn 0.4s ease-out;
    }
    @keyframes ctSlideIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    #cybertwin-floating-panel .ct-panel-inner {
      background: rgba(14, 14, 22, 0.92);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(220, 38, 38, 0.3);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(220,38,38,0.15);
      overflow: hidden;
    }
    #cybertwin-floating-panel .ct-header {
      display: flex;
      align-items: center;
      padding: 12px 14px;
      background: linear-gradient(135deg, rgba(153,27,27,0.3), rgba(20,20,31,0.8));
      border-bottom: 1px solid rgba(220,38,38,0.2);
      gap: 8px;
    }
    #cybertwin-floating-panel .ct-logo-wrap { display: flex; align-items: center; gap: 10px; flex: 1; }
    #cybertwin-floating-panel .ct-logo { width: 28px; height: 28px; border-radius: 8px; }
    #cybertwin-floating-panel .ct-brand-name { display: block; font-weight: 700; font-size: 13px; color: #fff; }
    #cybertwin-floating-panel .ct-brand-tag { display: block; font-size: 9px; color: rgba(220,38,38,0.8); text-transform: uppercase; letter-spacing: 0.08em; }
    #cybertwin-floating-panel .ct-btn-icon {
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
      color: #a1a1aa; width: 28px; height: 28px; border-radius: 8px; cursor: pointer;
      font-size: 12px; transition: all 0.2s;
    }
    #cybertwin-floating-panel .ct-btn-icon:hover { background: rgba(220,38,38,0.2); color: #fff; }
    #cybertwin-floating-panel .ct-body { padding: 14px; }
    #cybertwin-floating-panel .ct-scanning { display: flex; align-items: center; gap: 12px; color: #a1a1aa; font-size: 13px; padding: 16px 0; }
    #cybertwin-floating-panel .ct-spinner {
      width: 20px; height: 20px; border: 2px solid rgba(220,38,38,0.2);
      border-top-color: #dc2626; border-radius: 50%; animation: ctSpin 0.8s linear infinite;
    }
    @keyframes ctSpin { to { transform: rotate(360deg); } }
    #cybertwin-floating-panel .ct-score-row { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
    #cybertwin-floating-panel .ct-score-ring {
      width: 64px; height: 64px; border-radius: 50%;
      border: 3px solid rgba(255,255,255,0.08);
      box-shadow: 0 0 12px var(--score-color);
      display: flex; align-items: center; justify-content: center;
      background: conic-gradient(var(--score-color) calc(var(--score-pct) * 1%), rgba(255,255,255,0.06) 0);
    }
    #cybertwin-floating-panel .ct-score-num { font-weight: 800; font-size: 18px; color: #fff; }
    #cybertwin-floating-panel .ct-status { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    #cybertwin-floating-panel .ct-status-safe { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
    #cybertwin-floating-panel .ct-status-suspicious { background: rgba(249,115,22,0.15); color: #f97316; border: 1px solid rgba(249,115,22,0.3); }
    #cybertwin-floating-panel .ct-status-dangerous { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); animation: ctPulse 2s infinite; }
    @keyframes ctPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.3); } 50% { box-shadow: 0 0 12px 4px rgba(239,68,68,0.2); } }
    #cybertwin-floating-panel .ct-trust { display: block; font-size: 11px; color: #71717a; margin-top: 4px; }
    #cybertwin-floating-panel .ct-reasons h4 { font-size: 11px; color: #71717a; text-transform: uppercase; margin: 0 0 6px; letter-spacing: 0.05em; }
    #cybertwin-floating-panel .ct-reasons ul { margin: 0; padding-left: 16px; font-size: 12px; color: #d4d4d8; }
    #cybertwin-floating-panel .ct-reasons li { margin-bottom: 4px; }
    #cybertwin-floating-panel .ct-action { font-size: 12px; color: #fca5a5; margin-top: 10px; padding: 8px; background: rgba(220,38,38,0.08); border-radius: 8px; border: 1px solid rgba(220,38,38,0.15); }
    #cybertwin-floating-panel .ct-details { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06); }
    #cybertwin-floating-panel .ct-explanation { font-size: 12px; color: #a1a1aa; margin: 0 0 10px; }
    #cybertwin-floating-panel .ct-finding { font-size: 11px; color: #d4d4d8; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
    #cybertwin-floating-panel .ct-agent { color: #dc2626; font-family: monospace; font-size: 10px; margin-right: 6px; }
    #cybertwin-floating-panel .ct-intel h4 { font-size: 10px; color: #71717a; text-transform: uppercase; margin: 10px 0 6px; }
    #cybertwin-floating-panel .ct-intel-row { display: flex; justify-content: space-between; font-size: 11px; color: #a1a1aa; padding: 3px 0; }
    #cybertwin-floating-panel .ct-intel-malicious { color: #ef4444; }
    #cybertwin-floating-panel .ct-intel-suspicious { color: #f97316; }
    #cybertwin-floating-panel .ct-idle { text-align: center; padding: 20px 0; color: #71717a; font-size: 13px; }

    #cybertwin-scan-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 8px 16px; margin: 8px 0;
      background: linear-gradient(135deg, #991b1b, #dc2626);
      color: #fff; border: none; border-radius: 10px;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 13px; font-weight: 600; cursor: pointer;
      box-shadow: 0 4px 16px rgba(220,38,38,0.3);
      transition: all 0.25s; z-index: 999;
    }
    #cybertwin-scan-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(220,38,38,0.45); }
    #cybertwin-scan-btn.ct-scanning { opacity: 0.7; pointer-events: none; }
  `;
  document.head.appendChild(style);
}

export default createFloatingPanelHTML;
