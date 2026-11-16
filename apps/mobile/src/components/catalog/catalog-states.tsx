import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GluestackButton } from '@/components/ui/button';
import { Colors, Feedback, Radii, Spacing, Typography } from '@/constants/theme';

const palette = Colors.dark;

export function EmptyState({
  title = 'Ainda não há séries publicadas',
  description = 'Quando novos conteúdos forem publicados, eles aparecerão aqui.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <View accessibilityRole="summary" style={styles.stateCard}>
      <View style={styles.symbol}>
        <Text style={styles.symbolText}>✦</Text>
      </View>
      <Text accessibilityRole="header" style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateDescription}>{description}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View accessibilityRole="alert" style={[styles.stateCard, styles.errorCard]}>
      <Text accessibilityRole="header" style={styles.stateTitle}>Não foi possível carregar</Text>
      <Text style={styles.stateDescription}>{message}</Text>
      <GluestackButton onPress={onRetry} title="Tentar novamente" />
    </View>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View accessibilityLabel="Carregando catálogo" accessibilityRole="progressbar" style={styles.loadingGroup}>
      <View style={styles.skeletonHero} />
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <View style={styles.skeletonPoster} />
          <View style={styles.skeletonTextGroup}>
            <View style={[styles.skeletonLine, styles.skeletonLineTitle]} />
            <View style={styles.skeletonLine} />
            <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
          </View>
        </View>
      ))}
      <ActivityIndicator accessibilityLabel="Carregando" color={Feedback.loading} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  stateCard: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.six,
    borderRadius: Radii.extraLarge,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.backgroundElement,
  },
  errorCard: { borderColor: '#55313B' },
  symbol: { width: 56, height: 56, borderRadius: Radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#251F4C' },
  symbolText: { color: palette.accent, fontSize: 27, fontWeight: '700' },
  stateTitle: { color: palette.text, fontSize: Typography.titleSmall, fontWeight: '700', textAlign: 'center' },
  stateDescription: { color: palette.textSecondary, fontSize: Typography.bodySmall, lineHeight: 21, textAlign: 'center' },
  loadingGroup: { gap: Spacing.three },
  skeletonHero: { height: 248, borderRadius: Radii.extraLarge, backgroundColor: Feedback.skeleton },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radii.large, backgroundColor: palette.backgroundElement },
  skeletonPoster: { width: 80, height: 104, borderRadius: Radii.medium, backgroundColor: Feedback.skeleton },
  skeletonTextGroup: { flex: 1, gap: Spacing.two },
  skeletonLine: { height: 12, width: '86%', borderRadius: Radii.pill, backgroundColor: Feedback.skeleton },
  skeletonLineTitle: { width: '64%', height: 16 },
  skeletonLineShort: { width: '48%' },
  spinner: { marginTop: Spacing.two },
});
