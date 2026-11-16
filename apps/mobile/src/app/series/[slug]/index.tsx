import { LinearGradient } from 'expo-linear-gradient';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryChip, EmptyState, ErrorState, LoadingSkeleton, SeriesSeasonCard } from '@/components/catalog';
import { PublicImage } from '@/components/catalog/public-image';
import { Colors, Interaction, Radii, Spacing, Typography } from '@/constants/theme';
import { useCatalogSeriesDetail } from '@/hooks/use-catalog-details';

const palette = Colors.dark;

export default function PublicSeriesDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const router = useRouter();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const { state, retry } = useCatalogSeriesDetail(slug);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Voltar à tela anterior"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.brand}>MIND <Text style={styles.brandPlus}>+</Text></Text>
          <Link href="/series" style={styles.catalogLink}>Todas as séries</Link>
        </View>

        {state.status === 'loading' ? <LoadingSkeleton rows={2} /> : null}
        {state.status === 'error' ? <ErrorState message={state.message} onRetry={retry} /> : null}
        {state.status === 'not-found' ? (
          <View style={styles.stateGroup}>
            <EmptyState
              description="Esta série não está disponível no catálogo."
              title="Série indisponível"
            />
            <Link href="/series" style={styles.returnLink}>Voltar a todas as séries</Link>
          </View>
        ) : null}
        {state.status === 'success' ? (
          <>
            <SeriesHero
              imageUrl={state.data.series.featuredImageUrl ?? state.data.series.posterUrl}
              title={state.data.series.title}
            />

            <View style={styles.details}>
              {state.data.series.ageRating ? (
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>{state.data.series.ageRating}</Text>
                </View>
              ) : null}

              <Text style={styles.sectionEyebrow}>SINOPSE</Text>
              <Text style={styles.synopsis}>{state.data.series.synopsis}</Text>

              {state.data.series.description ? (
                <View style={styles.descriptionBlock}>
                  <Text style={styles.sectionEyebrow}>SOBRE A SÉRIE</Text>
                  <Text numberOfLines={descriptionExpanded ? undefined : 4} style={styles.description}>
                    {state.data.series.description}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: descriptionExpanded }}
                    onPress={() => setDescriptionExpanded((expanded) => !expanded)}
                    style={({ pressed }) => [styles.expandButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.expandText}>
                      {descriptionExpanded ? 'Recolher descrição' : 'Ler descrição completa'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {state.data.series.categories.length > 0 ? (
                <View style={styles.categoriesSection}>
                  <Text style={styles.sectionEyebrow}>CATEGORIAS</Text>
                  <ScrollView horizontal contentContainerStyle={styles.categoryRail} showsHorizontalScrollIndicator={false}>
                    {state.data.series.categories.map((category) => (
                      <CategoryChip category={category} key={category.id} />
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              <View style={styles.seasonsSection}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>Temporadas</Text>
                {state.data.seasons.length > 0 ? (
                  <View style={styles.seasonList}>
                    {state.data.seasons.map((season) => (
                      <SeriesSeasonCard key={season.id} season={season} slug={state.data.series.slug} />
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    description="As temporadas aparecerão aqui quando houver episódios publicados."
                    title="Nenhuma temporada disponível"
                  />
                )}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SeriesHero({ imageUrl, title }: { imageUrl: string | null; title: string }) {
  return (
    <View style={styles.hero}>
      <PublicImage
        accessibilityLabel={`Imagem de ${title}`}
        fallback={(
          <View accessibilityLabel="Imagem de destaque indisponível" style={styles.heroFallback}>
            <View style={styles.heroGlow} />
            <Text style={styles.fallbackLabel}>IMAGEM INDISPONÍVEL</Text>
          </View>
        )}
        style={StyleSheet.absoluteFill}
        url={imageUrl}
      />
      <LinearGradient
        colors={['rgba(8,11,20,0.03)', 'rgba(8,11,20,0.52)', '#080B14']}
        locations={[0, 0.54, 1]}
        pointerEvents="none"
        style={styles.heroGradient}
      />
      <View style={styles.heroTitleBlock}>
        <Text style={styles.heroEyebrow}>SÉRIE</Text>
        <Text accessibilityRole="header" style={styles.heroTitle}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  content: { width: '100%', maxWidth: 780, alignSelf: 'center', paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.eight, gap: Spacing.four },
  header: { minHeight: Interaction.minimumTargetSize, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  backButton: { width: Interaction.minimumTargetSize, height: Interaction.minimumTargetSize, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.pill, backgroundColor: palette.backgroundElement },
  backText: { color: palette.text, fontSize: 28, lineHeight: 32 },
  brand: { flex: 1, color: palette.text, fontSize: Typography.titleSmall, fontWeight: '900', letterSpacing: 1 },
  brandPlus: { color: palette.accent },
  catalogLink: { color: palette.accent, fontSize: Typography.caption, fontWeight: '700', padding: Spacing.two },
  hero: { height: 390, overflow: 'hidden', justifyContent: 'flex-end', borderRadius: Radii.extraLarge, backgroundColor: palette.backgroundSelected },
  heroGradient: { ...StyleSheet.absoluteFill },
  heroFallback: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111326' },
  heroGlow: { position: 'absolute', top: 24, right: -36, width: 260, height: 260, borderRadius: Radii.pill, backgroundColor: palette.primary, opacity: 0.5 },
  fallbackLabel: { color: palette.textSecondary, fontSize: Typography.caption, fontWeight: '800', letterSpacing: 1.2 },
  heroTitleBlock: { padding: Spacing.five, gap: Spacing.two },
  heroEyebrow: { color: '#C5BCFF', fontSize: Typography.caption, fontWeight: '800', letterSpacing: 1.8 },
  heroTitle: { color: palette.text, fontSize: Typography.display, lineHeight: 42, fontWeight: '900' },
  details: { gap: Spacing.four },
  ratingBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderWidth: 1, borderColor: palette.border, borderRadius: Radii.small, backgroundColor: palette.backgroundElement },
  ratingText: { color: palette.textSecondary, fontSize: Typography.caption, fontWeight: '700' },
  sectionEyebrow: { color: palette.accent, fontSize: Typography.caption, fontWeight: '800', letterSpacing: 1.2 },
  synopsis: { color: palette.text, fontSize: Typography.body, lineHeight: 25 },
  descriptionBlock: { gap: Spacing.two },
  description: { color: palette.textSecondary, fontSize: Typography.bodySmall, lineHeight: 22 },
  expandButton: { alignSelf: 'flex-start', minHeight: Interaction.minimumTargetSize, justifyContent: 'center', paddingVertical: Spacing.two },
  expandText: { color: palette.accent, fontSize: Typography.bodySmall, fontWeight: '700' },
  categoriesSection: { gap: Spacing.two },
  categoryRail: { gap: Spacing.two, alignItems: 'center' },
  seasonsSection: { gap: Spacing.three, paddingTop: Spacing.two },
  sectionTitle: { color: palette.text, fontSize: Typography.title, fontWeight: '800' },
  seasonList: { gap: Spacing.two },
  stateGroup: { gap: Spacing.three, paddingTop: Spacing.four },
  returnLink: { alignSelf: 'center', padding: Spacing.three, color: palette.accent, fontSize: Typography.bodySmall, fontWeight: '700' },
  pressed: { opacity: Interaction.pressedOpacity },
});
