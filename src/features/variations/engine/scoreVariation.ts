import type { CardVariation, FeaturePredicate, IdentificationRule, VisualSignature } from '@/models';

import type { EvidenceContext, FeatureObservation, VariationScore } from './types';

/** Absence of a serial number is weaker evidence than its presence (stamps can be missed or out of frame). */
const SERIAL_ABSENCE_FACTOR = 0.5;
/** Seeing a different value for an excluded feature is only mild support for the variation. */
const EXCLUSION_CLEAR_FACTOR = 0.25;

const pct = (value: number) => `${Math.round(value * 100)}%`;

function strongestObservation(
  features: FeatureObservation[],
  predicate: FeaturePredicate,
): FeatureObservation | undefined {
  return features
    .filter((f) => f.key === predicate.key)
    .sort((a, b) => b.confidence - a.confidence)[0];
}

function matches(observation: FeatureObservation, predicate: FeaturePredicate): boolean {
  return predicate.anyOf.includes(observation.value);
}

function scoreSignature(signature: VisualSignature, ctx: EvidenceContext, out: VariationScore) {
  const observed = strongestObservation(ctx.features, signature.predicate);
  if (!observed) {
    const hint = signature.requiresTilt && !ctx.captured.tilt ? ' — needs a tilt scan' : '';
    out.missingEvidence.push(`${signature.description} not observed${hint}`);
    return;
  }
  const weight = signature.weight * observed.confidence;
  if (matches(observed, signature.predicate)) {
    out.score += weight;
    out.evidence.push(`${signature.description} detected (${pct(observed.confidence)})`);
  } else {
    out.score -= weight;
    out.conflictingEvidence.push(
      `Expected ${signature.description}; observed ${observed.key} = ${observed.value}`,
    );
  }
}

function scoreRule(rule: IdentificationRule, ctx: EvidenceContext, out: VariationScore) {
  const { serial } = ctx;
  switch (rule.kind) {
    case 'serial_numbered': {
      const expected = rule.printRun === null ? 'a serial number' : `serial numbering /${rule.printRun}`;
      if (serial.status === 'not_analyzed') {
        out.missingEvidence.push(`Expected ${expected}; serial number not analyzed`);
      } else if (serial.status === 'not_found') {
        out.score -= rule.weight * SERIAL_ABSENCE_FACTOR;
        out.conflictingEvidence.push(`Expected ${expected}; none detected`);
      } else if (rule.printRun === null || rule.printRun === serial.serial.printRun) {
        out.score += rule.weight * serial.serial.confidence;
        out.evidence.push(`Serial number ${serial.serial.normalized} matches ${expected}`);
      } else {
        out.score -= rule.weight * serial.serial.confidence;
        out.conflictingEvidence.push(
          `Serial number ${serial.serial.normalized} does not match expected /${rule.printRun}`,
        );
      }
      return;
    }
    case 'not_serial_numbered': {
      if (serial.status === 'not_analyzed') {
        out.missingEvidence.push('Serial number not analyzed');
      } else if (serial.status === 'not_found') {
        out.score += rule.weight * SERIAL_ABSENCE_FACTOR;
        out.evidence.push('No serial number detected');
      } else {
        out.score -= rule.weight * serial.serial.confidence;
        out.conflictingEvidence.push(
          `Serial number ${serial.serial.normalized} detected, but this variation is not numbered`,
        );
      }
      return;
    }
    case 'excludes_feature': {
      const observed = strongestObservation(ctx.features, rule.predicate);
      if (!observed) return;
      const weight = rule.weight * observed.confidence;
      if (matches(observed, rule.predicate)) {
        out.score -= weight;
        out.conflictingEvidence.push(`${rule.description} observed (${pct(observed.confidence)})`);
      } else {
        out.score += weight * EXCLUSION_CLEAR_FACTOR;
        out.evidence.push(`No ${rule.description.toLowerCase()}`);
      }
      return;
    }
    case 'requires_text': {
      const text = ctx.ocrText[rule.side];
      if (!text) {
        out.missingEvidence.push(`${rule.description} (${rule.side} text not available)`);
        return;
      }
      let pattern: RegExp;
      try {
        pattern = new RegExp(rule.pattern, 'i');
      } catch {
        out.missingEvidence.push(`${rule.description} (invalid rule pattern)`);
        return;
      }
      if (pattern.test(text)) {
        out.score += rule.weight;
        out.evidence.push(`${rule.description} found on ${rule.side}`);
      } else {
        out.score -= rule.weight * SERIAL_ABSENCE_FACTOR;
        out.conflictingEvidence.push(`${rule.description} not found on ${rule.side}`);
      }
      return;
    }
  }
}

/**
 * Compares the extracted evidence against ONE variation's data-driven signatures and rules.
 * There is intentionally no variation-specific code here: all knowledge lives in the data.
 */
export function scoreVariation(variation: CardVariation, ctx: EvidenceContext): VariationScore {
  const out: VariationScore = {
    variationId: variation.id,
    name: variation.name,
    score: 0,
    evidence: [],
    missingEvidence: [],
    conflictingEvidence: [],
    hasNoRules: variation.visualSignatures.length === 0 && variation.identificationRules.length === 0,
  };

  if (out.hasNoRules) {
    out.missingEvidence.push('No verified visual signatures or identification rules defined yet');
    return out;
  }
  for (const signature of variation.visualSignatures) scoreSignature(signature, ctx, out);
  for (const rule of variation.identificationRules) scoreRule(rule, ctx, out);
  return out;
}
