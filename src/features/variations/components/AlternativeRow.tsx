import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfidenceBar } from '@/components/ConfidenceBar';
import type { RecognitionCandidate } from '@/models';
import { colors, spacing } from '@/theme';
import { formatPercent } from '@/utils/format';

import { EvidenceList } from './EvidenceList';

/** A ranked alternative. Tap to expand its evidence. */
export function AlternativeRow({ candidate }: { candidate: RecognitionCandidate }) {
  const [open, setOpen] = useState(false);
  const hasDetail =
    candidate.evidence.length + candidate.conflictingEvidence.length + candidate.missingEvidence.length > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${candidate.name}, ${formatPercent(candidate.confidence)}`}
      accessibilityState={{ expanded: open }}
      onPress={() => hasDetail && setOpen((v) => !v)}
      style={styles.row}>
      <View style={styles.line}>
        <Text style={styles.name}>{candidate.name}</Text>
        <Text style={styles.pct}>{formatPercent(candidate.confidence)}</Text>
      </View>
      <ConfidenceBar confidence={candidate.confidence} height={6} />
      {open ? (
        <View style={styles.detail}>
          <EvidenceList items={candidate.evidence} kind="evidence" />
          <EvidenceList items={candidate.conflictingEvidence} kind="conflict" />
          <EvidenceList items={candidate.missingEvidence} kind="missing" />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.xs, paddingVertical: spacing.sm },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  name: { color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  pct: { color: colors.textMuted, fontSize: 16, fontWeight: '700' },
  detail: { paddingTop: spacing.sm, gap: spacing.sm },
});
