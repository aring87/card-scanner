import { StyleSheet, Text, View } from 'react-native';

import { ConfidenceBar, confidenceColor } from '@/components/ConfidenceBar';
import { Panel } from '@/components/Panel';
import type { RecognitionCandidate } from '@/models';
import { CONFIDENT_MATCH_THRESHOLD, colors, font, spacing } from '@/theme';
import { formatPercent } from '@/utils/format';

import { EvidenceList } from './EvidenceList';

export function BestMatchCard({ candidate }: { candidate: RecognitionCandidate | null }) {
  if (!candidate) {
    return (
      <Panel title="Best match">
        <Text style={font.heading}>No match</Text>
        <Text style={font.caption}>No variations could be compared for this product.</Text>
      </Panel>
    );
  }
  const uncertain = candidate.confidence < CONFIDENT_MATCH_THRESHOLD || candidate.evidence.length === 0;
  return (
    <Panel title={uncertain ? 'Best guess (uncertain)' : 'Best match'}>
      <View style={styles.headline}>
        <Text style={styles.name}>{candidate.name}</Text>
        <Text style={[styles.pct, { color: confidenceColor(candidate.confidence) }]}>
          {formatPercent(candidate.confidence)}
        </Text>
      </View>
      <ConfidenceBar confidence={candidate.confidence} height={10} />
      <Text style={font.caption}>Confidence: {formatPercent(candidate.confidence)}</Text>

      {candidate.evidence.length > 0 ? <Text style={styles.section}>Evidence</Text> : null}
      <EvidenceList items={candidate.evidence} kind="evidence" />
      {candidate.conflictingEvidence.length > 0 ? <Text style={styles.section}>Conflicts</Text> : null}
      <EvidenceList items={candidate.conflictingEvidence} kind="conflict" />
      {candidate.missingEvidence.length > 0 ? <Text style={styles.section}>Not yet checked</Text> : null}
      <EvidenceList items={candidate.missingEvidence} kind="missing" />
    </Panel>
  );
}

const styles = StyleSheet.create({
  headline: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  name: { flex: 1, fontSize: 26, fontWeight: '800', color: colors.text },
  pct: { fontSize: 26, fontWeight: '800' },
  section: { ...font.label, marginTop: spacing.sm },
});
