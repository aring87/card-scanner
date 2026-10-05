import type { CaptureRequest, CardRegion, CardVariation, RecognitionCandidate } from '@/models';

import type { EvidenceContext, FeatureObservation } from './types';

const REGION_PHRASES: Record<CardRegion, string> = {
  full: 'the whole card',
  center: 'the center of the card',
  border: 'the border',
  'top-border': 'the top border',
  'bottom-border': 'the bottom border',
  'left-border': 'the left border',
  'right-border': 'the right border',
  'upper-left': 'the upper-left border',
  'upper-right': 'the upper-right border',
  'lower-left': 'the lower-left border',
  'lower-right': 'the lower-right border',
  nameplate: 'the nameplate',
  logo: 'the logo area',
};

export function describeRegion(region: CardRegion): string {
  return REGION_PHRASES[region];
}

const observed = (features: FeatureObservation[], key: string) => features.some((f) => f.key === key);

/**
 * Derives "please capture X" requests from what the top candidates are still missing. Driven
 * entirely by variation data (signature regions, requiresTilt, serial rules).
 */
export function deriveCaptureRequests(
  topCandidates: RecognitionCandidate[],
  variationsById: Map<string, CardVariation>,
  ctx: EvidenceContext,
): CaptureRequest[] {
  const requests = new Map<string, CaptureRequest>();
  const add = (request: CaptureRequest) => {
    const key = `${request.side}:${request.region}`;
    if (!requests.has(key)) requests.set(key, request);
  };

  for (const candidate of topCandidates) {
    const variation = variationsById.get(candidate.variationId);
    if (!variation) continue;

    for (const signature of variation.visualSignatures) {
      if (observed(ctx.features, signature.predicate.key)) continue;
      if (signature.requiresTilt && !ctx.captured.tilt) {
        const where = describeRegion(signature.region);
        add({
          side: 'tilt',
          region: signature.region,
          instruction: `Tilt ${where} under light.`,
          reason: `To check for ${signature.description.toLowerCase()} (${variation.name})`,
        });
      } else if (!signature.requiresTilt && !ctx.captured.front) {
        add({
          side: 'front',
          region: signature.region,
          instruction: 'Capture the front of the card.',
          reason: `To check for ${signature.description.toLowerCase()} (${variation.name})`,
        });
      }
    }

    const needsSerial = variation.identificationRules.some(
      (r) => r.kind === 'serial_numbered' || r.kind === 'not_serial_numbered',
    );
    if (needsSerial && !ctx.captured.back && ctx.serial.status !== 'found') {
      add({
        side: 'back',
        region: 'full',
        instruction: 'Capture the back of the card.',
        reason: 'Serial numbering is often printed on the back',
      });
    }
  }

  return Array.from(requests.values());
}
