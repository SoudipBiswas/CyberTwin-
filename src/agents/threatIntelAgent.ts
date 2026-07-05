import type { EmailData, ThreatIntelResult } from '../types';
import { extractDomainFromUrl } from '../utils/domainUtils';

function mockVirusTotal(url: string): ThreatIntelResult {
  const suspicious =
    url.includes('bit.ly') ||
    url.includes('.xyz') ||
    url.includes('.top') ||
    url.includes('paypa1');
  return {
    source: 'VirusTotal',
    status: suspicious ? 'suspicious' : 'clean',
    details: suspicious
      ? 'Mock: 3/70 engines flagged this URL (demo mode)'
      : 'Mock: 0/70 engines flagged this URL (demo mode)',
  };
}

function mockUrlscan(url: string): ThreatIntelResult {
  const malicious = url.startsWith('http://') && url.includes('login');
  return {
    source: 'urlscan.io',
    status: malicious ? 'malicious' : 'unknown',
    details: malicious
      ? 'Mock: Phishing landing page pattern detected (demo mode)'
      : 'Mock: No malicious behavior observed (demo mode)',
  };
}

function mockSafeBrowsing(url: string): ThreatIntelResult {
  const domain = extractDomainFromUrl(url);
  const flagged = ['paypa1-verify.com', 'dhl-delivery.top', 'invoice-paymnt.xyz'].some(
    (d) => domain.includes(d.split('.')[0])
  );
  return {
    source: 'Google Safe Browsing',
    status: flagged ? 'malicious' : 'clean',
    details: flagged
      ? 'Mock: URL matches social engineering blocklist (demo mode)'
      : 'Mock: No Safe Browsing warnings (demo mode)',
  };
}

function mockAbuseIPDB(_url: string): ThreatIntelResult {
  return {
    source: 'AbuseIPDB',
    status: 'unknown',
    details: 'Mock: IP reputation check placeholder (demo mode)',
  };
}

export function analyzeThreatIntel(email: EmailData): ThreatIntelResult[] {
  const results: ThreatIntelResult[] = [];
  const urls = email.links.map((l) => l.href);

  if (urls.length === 0) {
    results.push({
      source: 'CyberTwin ThreatIntel',
      status: 'unknown',
      details: 'No URLs to analyze.',
    });
    return results;
  }

  for (const url of urls.slice(0, 3)) {
    results.push(mockVirusTotal(url));
    results.push(mockUrlscan(url));
    results.push(mockSafeBrowsing(url));
    results.push(mockAbuseIPDB(url));
  }

  return results;
}

export function threatIntelToFindings(intel: ThreatIntelResult[]) {
  return intel
    .filter((r) => r.status === 'suspicious' || r.status === 'malicious')
    .map((r) => ({
      agent: 'ThreatIntelAgent',
      category: 'threat_intel',
      severity: r.status === 'malicious' ? ('critical' as const) : ('high' as const),
      score: r.status === 'malicious' ? 25 : 15,
      title: `${r.source}: ${r.status}`,
      description: r.details,
    }));
}

export default analyzeThreatIntel;
