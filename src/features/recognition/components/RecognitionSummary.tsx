import { InfoRow } from '@/components/InfoRow';
import { Panel } from '@/components/Panel';
import { getScanDisplay } from '@/features/collection/scanDisplay';
import type { CardScan } from '@/models';
import { formatPercent } from '@/utils/format';

export function RecognitionSummary({ scan }: { scan: CardScan }) {
  const d = getScanDisplay(scan);
  return (
    <Panel title={scan.userCorrected ? 'Identification (corrected)' : 'Recognition'}>
      <InfoRow label="Player" value={d.playerName} />
      <InfoRow label="Year" value={d.year} />
      <InfoRow label="Product" value={d.product} />
      <InfoRow label="Card #" value={d.cardNumber} />
      <InfoRow label="Insert" value={d.insert ?? (d.setName ? `None (${d.setName})` : null)} />
      <InfoRow label="Variation" value={d.variationName} emphasize />
      <InfoRow label="Serial Number" value={d.serial ?? 'None detected'} />
      <InfoRow label="Confidence" value={scan.userCorrected ? 'User corrected' : formatPercent(d.confidence)} />
    </Panel>
  );
}
