import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Interaction, Radii, Spacing, Typography } from '@/constants/theme';
import type { CatalogSeriesSummary } from '@mind-plus/contracts';

import { PublicImage } from './public-image';

const palette = Colors.dark;

function SeriesArtwork({ series, featured = false }: { series: CatalogSeriesSummary; featured?: boolean }) {
  return (
    <PublicImage
      accessibilityLabel={`Capa de ${series.title}`}
      fallback={(
        <View accessibilityLabel="Capa indisponível" style={[styles.artwork, styles.artworkFallback, featured && styles.featuredArtwork]}>
          <View style={[styles.artGlow, featured && styles.featuredGlow]} />
          <Text style={styles.artLabel}>IMAGEM INDISPONÍVEL</Text>
        </View>
      )}
      style={[styles.artwork, featured && styles.featuredArtwork]}
      url={series.posterUrl}
    />
  );
}

export function FeaturedSeriesCard({ series }: { series: CatalogSeriesSummary }) {
  return (
    <Link asChild href={{ pathname: '/series/[slug]', params: { slug: series.slug } }}>
      <Pressable accessibilityLabel={`Abrir detalhes de ${series.title}`} accessibilityRole="link" style={({ pressed }) => [styles.featuredCard, pressed && styles.pressed]}>
        <SeriesArtwork featured series={series} />
        <View style={styles.featuredContent}>
          <Text style={styles.eyebrow}>SÉRIE</Text>
          <Text accessibilityRole="header" style={styles.featuredTitle}>{series.title}</Text>
          <Text numberOfLines={3} style={styles.featuredSynopsis}>{series.synopsis}</Text>
          {series.categories.length > 0 ? (
            <Text numberOfLines={1} style={styles.categoryLine}>
              {series.categories.map(({ name }) => name).join(' · ')}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

export function SeriesCard({ series }: { series: CatalogSeriesSummary }) {
  return (
    <Link asChild href={{ pathname: '/series/[slug]', params: { slug: series.slug } }}>
      <Pressable accessibilityLabel={`Abrir detalhes de ${series.title}`} accessibilityRole="link" style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <SeriesArtwork series={series} />
        <View style={styles.cardContent}>
          <Text accessibilityRole="header" numberOfLines={2} style={styles.cardTitle}>{series.title}</Text>
          <Text numberOfLines={3} style={styles.cardSynopsis}>{series.synopsis}</Text>
          {series.categories.length > 0 ? (
            <Text numberOfLines={1} style={styles.categoryLine}>
              {series.categories.map(({ name }) => name).join(' · ')}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radii.large,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.backgroundElement,
  },
  cardContent: { flex: 1, justifyContent: 'center', gap: Spacing.two },
  cardSynopsis: { color: palette.textSecondary, fontSize: Typography.bodySmall, lineHeight: 20 },
  cardTitle: { color: palette.text, fontSize: Typography.titleSmall, fontWeight: '700' },
  artwork: { width: 92, height: 124, borderRadius: Radii.medium, overflow: 'hidden', backgroundColor: palette.backgroundSelected },
  artworkFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border },
  artGlow: { position: 'absolute', top: -24, right: -24, width: 96, height: 96, borderRadius: Radii.pill, backgroundColor: '#7567F8', opacity: 0.42 },
  artLabel: { paddingHorizontal: Spacing.two, color: palette.textSecondary, fontSize: 9, fontWeight: '700', letterSpacing: 1, textAlign: 'center' },
  featuredCard: { overflow: 'hidden', borderRadius: Radii.extraLarge, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.backgroundElement },
  featuredArtwork: { width: '100%', height: 232, borderRadius: 0 },
  featuredGlow: { top: -54, right: -16, width: 210, height: 210, opacity: 0.5 },
  featuredContent: { padding: Spacing.five, gap: Spacing.two },
  featuredTitle: { color: palette.text, fontSize: Typography.display, lineHeight: 42, fontWeight: '800' },
  featuredSynopsis: { color: palette.textSecondary, fontSize: Typography.body, lineHeight: 24 },
  eyebrow: { color: palette.accent, fontSize: Typography.caption, fontWeight: '800', letterSpacing: 1.6 },
  categoryLine: { color: palette.accent, fontSize: Typography.caption, fontWeight: '600' },
  pressed: { opacity: Interaction.pressedOpacity, transform: [{ scale: 0.995 }] },
});
