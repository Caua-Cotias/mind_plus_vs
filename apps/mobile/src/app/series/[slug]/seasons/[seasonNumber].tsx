import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CatalogEpisodeCard, EmptyState, ErrorState, LoadingSkeleton } from '@/components/catalog';
import { Colors, Interaction, Radii, Spacing, Typography } from '@/constants/theme';
import { useCatalogSeasonEpisodes } from '@/hooks/use-catalog-details';

const palette = Colors.dark;
const EPISODES_PER_PAGE = 20;

export default function PublicSeasonEpisodesScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[]; seasonNumber?: string | string[] }>();
  const router = useRouter();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const rawSeasonNumber = Array.isArray(params.seasonNumber) ? params.seasonNumber[0] : params.seasonNumber;
  const seasonNumber = rawSeasonNumber && /^[1-9]\d*$/.test(rawSeasonNumber)
    ? Number(rawSeasonNumber)
    : undefined;
  const routeKey = JSON.stringify([slug, seasonNumber]);
  const [pageSelection, setPageSelection] = useState({ routeKey, page: 1 });
  const page = pageSelection.routeKey === routeKey ? pageSelection.page : 1;
  const { state, retry } = useCatalogSeasonEpisodes(slug, seasonNumber, page, EPISODES_PER_PAGE);

  function changePage(nextPage: number) {
    setPageSelection({ routeKey, page: nextPage });
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Voltar aos detalhes da série"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headingGroup}>
            <Text style={styles.brand}>MIND <Text style={styles.brandPlus}>+</Text></Text>
            <Text accessibilityRole="header" style={styles.heading}>
              {seasonNumber ? `Temporada ${seasonNumber}` : 'Temporada indisponível'}
            </Text>
          </View>
          {slug ? (
            <Link href={{ pathname: '/series/[slug]', params: { slug } }} style={styles.seriesLink}>
              Série
            </Link>
          ) : null}
        </View>

        {state.status === 'loading' ? <LoadingSkeleton rows={2} /> : null}
        {state.status === 'error' ? <ErrorState message={state.message} onRetry={retry} /> : null}
        {state.status === 'not-found' ? (
          <View style={styles.stateGroup}>
            <EmptyState
              description="Esta temporada não está disponível no catálogo."
              title="Temporada indisponível"
            />
            {slug ? (
              <Link href={{ pathname: '/series/[slug]', params: { slug } }} style={styles.returnLink}>
                Voltar aos detalhes da série
              </Link>
            ) : null}
          </View>
        ) : null}
        {state.status === 'success' ? (
          <View style={styles.episodesSection}>
            <View style={styles.sectionHeading}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Episódios</Text>
              <Text style={styles.countText}>
                {state.data.pagination.totalItems} {state.data.pagination.totalItems === 1 ? 'episódio' : 'episódios'}
              </Text>
            </View>
            <Text style={styles.accessNote}>
              FREE e PREMIUM descrevem a classificação de acesso. Reprodução e assinaturas ainda não estão disponíveis.
            </Text>

            {state.data.items.length > 0 ? (
              <View style={styles.episodeList}>
                {state.data.items.map((episode) => (
                  <CatalogEpisodeCard episode={episode} key={episode.id} />
                ))}
              </View>
            ) : (
              <EmptyState
                description="Os episódios aparecerão aqui quando forem publicados."
                title="Nenhum episódio publicado"
              />
            )}

            {state.data.pagination.totalPages > 1 ? (
              <View style={styles.pagination}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !state.data.pagination.hasPreviousPage }}
                  disabled={!state.data.pagination.hasPreviousPage}
                  onPress={() => changePage(page - 1)}
                  style={({ pressed }) => [styles.pageButton, !state.data.pagination.hasPreviousPage && styles.disabled, pressed && styles.pressed]}
                >
                  <Text style={styles.pageButtonText}>Anterior</Text>
                </Pressable>
                <Text style={styles.pageLabel}>
                  Página {state.data.pagination.page} de {state.data.pagination.totalPages}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !state.data.pagination.hasNextPage }}
                  disabled={!state.data.pagination.hasNextPage}
                  onPress={() => changePage(page + 1)}
                  style={({ pressed }) => [styles.pageButton, !state.data.pagination.hasNextPage && styles.disabled, pressed && styles.pressed]}
                >
                  <Text style={styles.pageButtonText}>Próxima</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
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
  headingGroup: { flex: 1, gap: Spacing.one },
  brand: { color: palette.textSecondary, fontSize: Typography.caption, fontWeight: '800', letterSpacing: 1 },
  brandPlus: { color: palette.accent },
  heading: { color: palette.text, fontSize: Typography.title, fontWeight: '800' },
  seriesLink: { minHeight: Interaction.minimumTargetSize, textAlignVertical: 'center', paddingHorizontal: Spacing.two, color: palette.accent, fontSize: Typography.bodySmall, fontWeight: '700' },
  episodesSection: { gap: Spacing.three },
  sectionHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.two },
  sectionTitle: { color: palette.text, fontSize: Typography.title, fontWeight: '800' },
  countText: { color: palette.textSecondary, fontSize: Typography.caption },
  accessNote: { color: palette.textSecondary, fontSize: Typography.caption, lineHeight: 18 },
  episodeList: { gap: Spacing.three },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, paddingTop: Spacing.two },
  pageButton: { minHeight: Interaction.minimumTargetSize, justifyContent: 'center', paddingHorizontal: Spacing.three, borderRadius: Radii.medium, backgroundColor: palette.backgroundElement },
  pageButtonText: { color: palette.text, fontSize: Typography.bodySmall, fontWeight: '700' },
  pageLabel: { color: palette.textSecondary, fontSize: Typography.caption },
  disabled: { opacity: 0.4 },
  stateGroup: { gap: Spacing.three, paddingTop: Spacing.four },
  returnLink: { alignSelf: 'center', padding: Spacing.three, color: palette.accent, fontSize: Typography.bodySmall, fontWeight: '700' },
  pressed: { opacity: Interaction.pressedOpacity },
});
