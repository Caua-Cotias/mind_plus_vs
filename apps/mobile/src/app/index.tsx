import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryRail, EmptyState, ErrorState, FeaturedSeriesCard, LoadingSkeleton, SectionHeader, SeriesCard } from '@/components/catalog';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useCatalogData } from '@/hooks/use-catalog-data';

const palette = Colors.dark;

export default function CatalogHomeScreen() {
  const { state, retry } = useCatalogData({ includeCategories: true, pageSize: 12 });

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.brand}>MIND <Text style={styles.brandPlus}>+</Text></Text>
            <Text style={styles.brandSubtitle}>SÉRIES EM UM NOVO RITMO</Text>
          </View>
          <Link href="/home" style={styles.accountLink}>Acessar conta</Link>
        </View>

        <View style={styles.intro}>
          <Text style={styles.kicker}>HISTÓRIAS QUE FICAM</Text>
          <Text accessibilityRole="header" style={styles.headline}>Seu próximo mundo começa aqui.</Text>
        </View>

        {state.status === 'loading' ? <LoadingSkeleton /> : null}
        {state.status === 'error' ? <ErrorState message={state.message} onRetry={retry} /> : null}
        {state.status === 'success' ? (
          <>
            <View style={styles.categorySection}>
              <SectionHeader title="Explore por categoria" />
              <CategoryRail categories={state.categories} />
            </View>

            {state.series.items.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <SectionHeader actionLabel="Ver todas" href="/series" title="Séries para descobrir" />
                <FeaturedSeriesCard series={state.series.items[0]} />
                {state.series.items.length > 1 ? (
                  <View style={styles.listSection}>
                    <SectionHeader title="Mais histórias" />
                    {state.series.items.slice(1).map((series) => (
                      <SeriesCard key={series.id} series={series} />
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  content: { width: '100%', maxWidth: 780, alignSelf: 'center', paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.eight, gap: Spacing.four },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  brand: { color: palette.text, fontSize: 25, fontWeight: '900', letterSpacing: 1.2 },
  brandPlus: { color: palette.accent },
  brandSubtitle: { marginTop: Spacing.one, color: palette.textSecondary, fontSize: 9, fontWeight: '700', letterSpacing: 1.6 },
  accountLink: { minHeight: 44, textAlignVertical: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, overflow: 'hidden', borderRadius: Radii.pill, borderWidth: 1, borderColor: palette.border, color: palette.text, fontSize: Typography.bodySmall, fontWeight: '700' },
  intro: { gap: Spacing.two, paddingTop: Spacing.two, paddingBottom: Spacing.one },
  kicker: { color: palette.accent, fontSize: Typography.caption, fontWeight: '800', letterSpacing: 2 },
  headline: { color: palette.text, fontSize: Typography.display, lineHeight: 42, fontWeight: '800', maxWidth: 520 },
  categorySection: { gap: Spacing.two },
  listSection: { gap: Spacing.three },
});
