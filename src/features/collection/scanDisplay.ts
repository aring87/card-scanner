import type { CardScan } from '@/models';
import { formatSerialNumber } from '@/features/recognition/serial/parseSerialNumber';

export type ScanStatus = 'unreviewed' | 'confirmed' | 'corrected';

/** What to show for a scan: the user's correction when present, otherwise the prediction. */
export type ScanDisplay = {
  playerName: string | null;
  team: string | null;
  year: number | null;
  product: string | null;
  setName: string | null;
  cardNumber: string | null;
  insert: string | null;
  variationName: string | null;
  serial: string | null;
  confidence: number;
  status: ScanStatus;
  isSimulated: boolean;
};

export function getScanDisplay(scan: CardScan): ScanDisplay {
  const identity = scan.correction?.identity ?? scan.detectedIdentity;
  const variationName = scan.correction ? scan.correction.variationName : (scan.detectedVariation?.name ?? null);
  const serial = scan.correction ? scan.correction.serialNumber : scan.serialNumber;
  return {
    playerName: identity.playerName ?? null,
    team: identity.team ?? null,
    year: identity.year ?? null,
    product: identity.product ?? null,
    setName: identity.setName ?? null,
    cardNumber: identity.cardNumber ?? null,
    insert: identity.subsetName ?? null,
    variationName,
    serial: serial ? formatSerialNumber(serial) : null,
    confidence: scan.confidence,
    status: scan.userCorrected ? 'corrected' : scan.userConfirmed ? 'confirmed' : 'unreviewed',
    isSimulated: scan.isSimulated,
  };
}

export const STATUS_LABELS: Record<ScanStatus, string> = {
  unreviewed: 'Not reviewed',
  confirmed: 'Confirmed',
  corrected: 'Corrected',
};
