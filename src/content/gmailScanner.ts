import type { EmailData, Platform } from '../types';
import { extractDomain } from '../utils/domainUtils';
import { extractLinksFromHtml, extractLinksFromText, mergeLinks } from '../utils/extractLinks';

const GMAIL_SELECTORS = {
  senderName: [
    '[data-message-id] [email]',
    '.gD',
    'span.gD',
    '[data-hovercard-id]',
  ],
  senderEmail: [
    '[email]',
    '.gD[email]',
    'span[email]',
  ],
  subject: [
    'h2.hP',
    '[data-thread-perm-id] h2',
    '.ha h2',
  ],
  body: [
    '.a3s.aiL',
    '.a3s',
    '[role="listitem"] .ii.gt',
    '.gs .a3s',
  ],
  attachments: [
    '.aZo span',
    '.aQH span',
    '[data-tooltip*="attachment"]',
  ],
  timestamp: [
    '.g3',
    '[data-tooltip*="Date"]',
    '.gH .g3',
  ],
  buttons: [
    '.aBn .aKx',
    '[role="button"]',
  ],
};

function safeQuery(selectors: string[], root: ParentNode = document): string {
  for (const selector of selectors) {
    try {
      const el = root.querySelector(selector);
      if (el?.textContent?.trim()) return el.textContent.trim();
    } catch {
      // invalid selector — skip
    }
  }
  return '';
}

function safeQueryAttr(selectors: string[], attr: string): string {
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      const val = el?.getAttribute(attr);
      if (val) return val;
    } catch {
      // skip
    }
  }
  return '';
}

function safeQueryAll(selectors: string[]): string[] {
  for (const selector of selectors) {
    try {
      const els = document.querySelectorAll(selector);
      if (els.length > 0) {
        return Array.from(els)
          .map((el) => el.textContent?.trim() || '')
          .filter(Boolean);
      }
    } catch {
      // skip
    }
  }
  return [];
}

export function isGmail(): boolean {
  return window.location.hostname.includes('mail.google.com');
}

export function extractGmailEmail(): EmailData | null {
  if (!isGmail()) return null;

  const senderEmail =
    safeQueryAttr(GMAIL_SELECTORS.senderEmail, 'email') ||
    safeQueryAttr(['[email]'], 'email') ||
    '';

  const senderName = safeQuery(GMAIL_SELECTORS.senderName) || senderEmail.split('@')[0] || '';

  const subject = safeQuery(GMAIL_SELECTORS.subject) || '(No subject)';
  const bodyEl = document.querySelector(GMAIL_SELECTORS.body.join(', '));
  const bodyHtml = bodyEl?.innerHTML || '';
  const bodyText = bodyEl?.textContent?.trim() || document.body.innerText.slice(0, 5000);

  const htmlLinks = bodyHtml ? extractLinksFromHtml(bodyHtml) : [];
  const textLinks = extractLinksFromText(bodyText);
  const links = mergeLinks(htmlLinks, textLinks);

  const attachments = safeQueryAll(GMAIL_SELECTORS.attachments);
  const buttons = safeQueryAll(GMAIL_SELECTORS.buttons).slice(0, 10);
  const timestamp = safeQuery(GMAIL_SELECTORS.timestamp) || new Date().toLocaleString();

  if (!senderEmail && !subject && bodyText.length < 20) {
    return null;
  }

  return {
    platform: 'gmail' as Platform,
    senderName,
    senderEmail,
    senderDomain: extractDomain(senderEmail || senderName),
    subject,
    bodyText,
    links,
    buttons,
    attachments,
    timestamp,
    pageUrl: window.location.href,
  };
}

export function injectGmailScanButton(onScan: () => void): void {
  if (document.getElementById('cybertwin-scan-btn')) return;

  const tryInject = () => {
    const toolbar =
      document.querySelector('.G-atb') ||
      document.querySelector('[role="toolbar"]') ||
      document.querySelector('.ha');

    if (!toolbar || document.getElementById('cybertwin-scan-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'cybertwin-scan-btn';
    btn.innerHTML = '🛡️ Scan with CyberTwin AI';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onScan();
    });
    toolbar.appendChild(btn);
  };

  tryInject();

  const observer = new MutationObserver(() => tryInject());
  observer.observe(document.body, { childList: true, subtree: true });
}

export default extractGmailEmail;
