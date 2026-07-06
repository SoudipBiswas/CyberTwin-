import { extractGmailEmail, injectGmailScanButton, isGmail } from './gmailScanner';
import {
  createFloatingPanelHTML,
  injectPanelStyles,
  updatePanel,
} from './injectPanel';
import type { EmailData, ScanResult } from '../types';

let panelContainer: HTMLElement | null = null;
let panelExpanded = false;
let currentScan: ScanResult | null = null;

function getEmailData(): EmailData | null {
  if (isGmail()) {
    return extractGmailEmail();
  }
  return null;
}

function showPanel(scanning = false): void {
  if (!panelContainer) {
    panelContainer = createFloatingPanelHTML();
    document.body.appendChild(panelContainer);
    bindPanelEvents();
  }
  updatePanel(panelContainer, currentScan, panelExpanded, scanning);
  bindPanelEvents();
}

function bindPanelEvents(): void {
  if (!panelContainer) return;

  panelContainer.querySelector('#ct-toggle-expand')?.addEventListener('click', () => {
    panelExpanded = !panelExpanded;
    updatePanel(panelContainer!, currentScan, panelExpanded, false);
    bindPanelEvents();
  });

  panelContainer.querySelector('#ct-close-panel')?.addEventListener('click', () => {
    panelContainer?.remove();
    panelContainer = null;
  });

  // Open dashboard when dashboard button clicked
  panelContainer.querySelector('#ct-view-dashboard')?.addEventListener('click', () => {
    // Open the dashboard page in a new tab
    if (chrome && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    }
  });
}

async function runScan(): Promise<void> {
  const btn = document.getElementById('cybertwin-scan-btn');
  btn?.classList.add('ct-scanning');

  showPanel(true);

  const email = getEmailData();
  if (!email) {
    showPanel(false);
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SCAN_EMAIL',
      payload: { email },
    });

    if (response?.success && response.result) {
      currentScan = response.result as ScanResult;
      showPanel(false);
    } else {
      showPanel(false);
    }
  } catch (error) {
    console.warn('[CyberTwin AI] Scan failed:', error);
    showPanel(false);
  } finally {
    btn?.classList.remove('ct-scanning');
  }
}

if (!(window as any).__cybertwinMessageListenerInstalled) {
  (window as any).__cybertwinMessageListenerInstalled = true;
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'TRIGGER_SCAN') {
      runScan().then(() => sendResponse({ success: true }));
      return true;
    }
    if (message.type === 'SHOW_PANEL') {
      showPanel(false);
      sendResponse({ success: true });
      return true;
    }
    if (message.type === 'CYBERTWIN_SCAN_PAGE') {
      if (isGmail()) {
        const gmailData = extractGmailEmail();
        if (gmailData) {
          sendResponse({ success: true, email: gmailData });
        } else {
          sendResponse({ success: false, reason: 'Open an email first to scan' });
        }
      } else {
        sendResponse({ success: false, reason: 'Only Gmail is supported' });
      }
      return true;
    }
    if (message.type === 'CYBERTWIN_GET_PAGE_DATA') {
      // Return raw page data without triggering a scan
      if (isGmail()) {
        const gmailData = extractGmailEmail();
        if (gmailData) {
          sendResponse({
            success: true,
            source: 'gmail',
            data: gmailData,
          });
        } else {
          sendResponse({ success: false, reason: 'Open an email first to scan' });
        }
      } else {
        sendResponse({ success: false, reason: 'Only Gmail is supported' });
      }
      return true;
    }
    return false;
  });
}

function init(): void {
  if ((window as any).__cybertwinInitRun) return;
  (window as any).__cybertwinInitRun = true;

  injectPanelStyles();

  if (isGmail()) {
    injectGmailScanButton(runScan);
  }

  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings as { autoScan?: boolean } | undefined;
    if (settings?.autoScan && isGmail()) {
      setTimeout(runScan, 2000);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { runScan, getEmailData };
