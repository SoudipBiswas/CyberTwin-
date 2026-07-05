import type { AgentFinding, EmailData } from '../types';

const QR_INDICATORS = [
  /\b(scan (the )?qr|qr code|quick response code)\b/i,
  /qr[_\-\s]?pay/i,
  /invoice.*\.png/i,
  /payment.*\.png/i,
];

export interface QRScanPlaceholder {
  supported: boolean;
  message: string;
  uploadReady: boolean;
}

export function detectQRPhishing(email: EmailData): AgentFinding[] {
  const findings: AgentFinding[] = [];
  const text = `${email.subject} ${email.bodyText}`;
  const attachments = email.attachments.join(' ');

  const hasQRReference = QR_INDICATORS.some(
    (p) => p.test(text) || p.test(attachments)
  );
  const hasQRImage = email.attachments.some((a) =>
    /qr|invoice.*\.png|payment.*\.png/i.test(a)
  );

  if (hasQRReference || hasQRImage) {
    findings.push({
      agent: 'QRAgent',
      category: 'qr_phishing',
      severity: 'high',
      score: 20,
      title: 'QR code phishing indicator',
      description:
        'Message references QR code payment or includes QR-related imagery — a common quishing vector.',
      evidence: hasQRImage ? email.attachments.find((a) => /\.png|\.jpg/i.test(a)) : 'QR language in body',
    });
  }

  return findings;
}

export function getQRScanPlaceholder(): QRScanPlaceholder {
  return {
    supported: false,
    message:
      'QR image scanning will be available in a future update. Upload a screenshot from the dashboard to analyze.',
    uploadReady: true,
  };
}

export function analyzeQR(_imageData?: string): AgentFinding[] {
  if (!_imageData) return [];
  return [
    {
      agent: 'QRAgent',
      category: 'qr_placeholder',
      severity: 'medium',
      score: 15,
      title: 'QR scan placeholder result',
      description: 'Mock QR analysis — real OCR/decode integration pending.',
    },
  ];
}

export default detectQRPhishing;
