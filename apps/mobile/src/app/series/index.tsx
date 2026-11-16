import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, LoadingSkeleton, SeriesCard } from '@/components/catalog';
import { Colors, Interaction, Radii, Spacing, Typography } from '@/constants/theme';
import { useCatalogData } from '@/hooks/use-catalog-data';

const palette = Colors.dark;

export default function PublicSeriesListScreen() {
  const params = useLocalSearchParams<{ category?: string | string[] }>();
  const category = Array.isArray(params.category) ? params.category[0] : params.category;
  const [draftSearch, setDraftSearch] = useState('');
  const [search, setSearch] = useState<string | undefined>();
  const filterKey = JSON.stringify([category, search]);
  const [pageSelection, setPageSelection] = useState({ filterKey, page: 1 });
  const page = pageSelection.filterKey === filterKey ? pageSelection.page : 1;
  const { state, retry } = useCatalogData({ category, search, page, pageSize: 20 });

  function changePage(nextPage: number) {
    setPageSelection({ filterKey, page: nextPage });
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headingGroup}>
            <Text style={styles.brand}>MIND <Text style={styles.brandPlus}>+</Text></Text>
            <Text accessibilityRole="header" style={styles.heading}>Todas as séries</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            accessibilityLabel="Buscar séries por título"
            autoCapitalize="none"
            onChangeText={setDraftSearch}
            onSubmitEditing={() => setSearch(draftSearch.trim() || undefined)}
            placeholder="Buscar por título"
            placeholderTextColor={palette.textSecondary}
            returnKeyType="search"
            style={styles.searchInput}
            value={draftSearch}
          />
          <Pressable accessibilityRole="button" onPress={() => setSearch(draftSearch.trim() || undefined)} style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}>
            <Text style={styles.searchButtonText}>Buscar</Text>
          </Pressable>
        </View>

        {category ? <Text style={styles.filterLabel}>Categoria selecionada: {category}</Text> : null}
        {state.status === 'loading' ? <LoadingSkeleton rows={2} /> : null}
        {state.status === 'error' ? <ErrorState message={state.message} onRetry={retry} /> : null}
        {state.status === 'success' ? (
          <>
            {state.series.items.length > 0 ? (
              <View style={styles.seriesList}>
                {state.series.items.map((series) => <SeriesCard key={series.id} series={series} />)}
              </View>
            ) : (
              <EmptyState
                description={search || category
                  ? 'Não encontramos séries publicadas para estes filtros.'
                  : undefined}
                title={search || category ? 'Nenhum resultado encontrado' : undefined}
              />
            )}
            {state.series.pagination.totalPages > 1 ? (
              <View style={styles.pagination}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !state.series.pagination.hasPreviousPage }}
                  disabled={!state.series.pagination.hasPreviousPage}
                  onPress={() => changePage(page - 1)}
                  style={({ pressed }) => [styles.pageButton, !state.series.pagination.hasPreviousPage && styles.disabled, pressed && styles.pressed]}
                >
                  <Text style={styles.pageButtonText}>Anterior</Text>
                </Pressable>
                <Text accessibilityRole="text" style={styles.pageLabel}>
                  Página {state.series.pagination.page} de {state.series.pagination.totalPages}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !state.series.pagination.hasNextPage }}
                  disabled={!state.series.pagination.hasNextPage}
                  onPress={() => changePage(page + 1)}
                  style={({ pressed }) => [styles.pageButton, !state.series.pagination.hasNextPage && styles.disabled, pressed && styles.pressed]}
                >
                  <Text style={styles.pageButtonText}>Próxima</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  content: { width: '100%', maxWidth: 780, alignSelf: 'center', paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.eight, gap: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  backButton: { width: Interaction.minimumTargetSize, height: Interaction.minimumTargetSize, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.pill, backgroundColor: palette.backgroundElement },
  backText: { color: palette.text, fontSize: 28, lineHeight: 32 },
  headingGroup: { gap: Spacing.one },
  brand: { color: palette.textSecondary, fontSize: Typography.caption, fontWeight: '800', letterSpacing: 1 },
  brandPlus: { color: palette.accent },
  heading: { color: palette.text, fontSize: Typography.title, fontWeight: '800' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  searchInput: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: palette.border, borderRadius: Radii.medium, paddingHorizontal: Spacing.three, color: palette.text, backgroundColor: palette.backgroundElement, fontSize: Typography.body },
  searchButton: { minHeight: Interaction.minimumTargetSize, justifyContent: 'center', paddingHorizontal: Spacing.three, borderRadius: Radii.medium, backgroundColor: palette.primary },
  searchButtonText: { color: palette.text, fontSize: Typography.bodySmall, fontWeight: '700' },
  filterLabel: { color: palette.textSecondary, fontSize: Typography.bodySmall },
  seriesList: { gap: Spacing.three },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  pageButton: { minHeight: Interaction.minimumTargetSize, justifyContent: 'center', paddingHorizontal: Spacing.three, borderRadius: Radii.medium, backgroundColor: palette.backgroundElement },
  pageButtonText: { color: palette.text, fontSize: Typography.bodySmall, fontWeight: '700' },
  pageLabel: { color: palette.textSecondary, fontSize: Typography.caption },
  disabled: { opacity: 0.4 },
  pressed: { opacity: Interaction.pressedOpacity },
});
