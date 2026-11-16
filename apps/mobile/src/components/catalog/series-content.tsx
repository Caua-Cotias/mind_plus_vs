import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Interaction, Radii, Spacing, Typography } from '@/constants/theme';
import type { CatalogEpisode, CatalogSeason } from '@mind-plus/contracts';

import { PremiumBadge } from './premium-badge';
import { PublicImage } from './public-image';

const palette = Colors.dark;

export function SeriesSeasonCard({ season, slug }: { season: CatalogSeason; slug: string }) {
  const title = season.title ?? `Temporada ${season.seasonNumber}`;
  const href = {
    pathname: '/series/[slug]/seasons/[seasonNumber]',
    params: { slug, seasonNumber: String(season.seasonNumber) },
  } as const;

  return (
    <Link asChild href={href}>
      <Pressable
        accessibilityLabel={`Abrir ${title}, temporada ${season.seasonNumber}`}
        accessibilityRole="link"
        style={({ pressed }) => [styles.seasonCard, pressed && styles.pressed]}
      >
        <View style={styles.seasonNumber}>
          <Text style={styles.seasonNumberText}>{String(season.seasonNumber).padStart(2, '0')}</Text>
        </View>
        <View style={styles.seasonTextGroup}>
          <Text style={styles.seasonEyebrow}>TEMPORADA {season.seasonNumber}</Text>
          <Text style={styles.seasonTitle}>{title}</Text>
        </View>
        <Text accessibilityElementsHidden style={styles.chevron}>›</Text>
      </Pressable>
    </Link>
  );
}

export function CatalogEpisodeCard({ episode }: { episode: CatalogEpisode }) {
  return (
    <View style={styles.episodeCard}>
      <PublicImage
        accessibilityLabel={`Miniatura do episódio ${episode.episodeNumber}: ${episode.title}`}
        fallback={(
          <View accessibilityLabel="Miniatura indisponível" style={[styles.episodeThumbnail, styles.thumbnailFallback]}>
            <View style={styles.thumbnailGlow} />
            <Text style={styles.thumbnailEpisodeNumber}>EP {String(episode.episodeNumber).padStart(2, '0')}</Text>
            <Text style={styles.thumbnailFallbackLabel}>THUMBNAIL INDISPONÍVEL</Text>
          </View>
        )}
        style={styles.episodeThumbnail}
        url={episode.thumbnailUrl}
      />
      <View style={styles.episodeContent}>
        <Text style={styles.episodeEyebrow}>EPISÓDIO {String(episode.episodeNumber).padStart(2, '0')}</Text>
        <Text accessibilityRole="header" style={styles.episodeTitle}>{episode.title}</Text>
        {episode.description ? (
          <Text numberOfLines={3} style={styles.episodeDescription}>{episode.description}</Text>
        ) : null}
        <View style={styles.episodeMeta}>
          <EpisodeAccessBadge accessLevel={episode.accessLevel} />
          {episode.durationSeconds ? (
            <Text style={styles.duration}>{formatDuration(episode.durationSeconds)}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function EpisodeAccessBadge({ accessLevel }: { accessLevel: CatalogEpisode['accessLevel'] }) {
  if (accessLevel === 'PREMIUM') return <PremiumBadge />;

  return (
    <View accessibilityLabel="Conteúdo gratuito" style={styles.freeBadge}>
      <Text style={styles.freeBadgeText}>FREE</Text>
    </View>
  );
}

export function formatDuration(durationSeconds: number) {
  if (durationSeconds < 60) return `${durationSeconds} s`;

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
}

const styles = StyleSheet.create({
  seasonCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: Radii.large,
    backgroundColor: palette.backgroundElement,
  },
  seasonNumber: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.medium,
    backgroundColor: '#251F4C',
  },
  seasonNumberText: { color: palette.accent, fontSize: Typography.title, fontWeight: '800' },
  seasonTextGroup: { flex: 1, gap: Spacing.one },
  seasonEyebrow: { color: palette.accent, fontSize: Typography.caption, fontWeight: '800', letterSpacing: 1 },
  seasonTitle: { color: palette.text, fontSize: Typography.titleSmall, fontWeight: '700' },
  chevron: { color: palette.textSecondary, fontSize: 28, paddingHorizontal: Spacing.one },
  episodeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: Radii.large,
    backgroundColor: palette.backgroundElement,
  },
  episodeThumbnail: {
    width: 112,
    height: 132,
    borderRadius: Radii.medium,
    overflow: 'hidden',
    backgroundColor: palette.backgroundSelected,
  },
  thumbnailFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border, padding: Spacing.two },
  thumbnailGlow: { position: 'absolute', top: -30, right: -20, width: 92, height: 92, borderRadius: Radii.pill, backgroundColor: palette.primary, opacity: 0.38 },
  thumbnailEpisodeNumber: { color: palette.text, fontSize: Typography.titleSmall, fontWeight: '800' },
  thumbnailFallbackLabel: { marginTop: Spacing.one, color: palette.textSecondary, fontSize: 8, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
  episodeContent: { flex: 1, gap: Spacing.two },
  episodeEyebrow: { color: palette.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  episodeTitle: { color: palette.text, fontSize: Typography.body, fontWeight: '700', lineHeight: 22 },
  episodeDescription: { color: palette.textSecondary, fontSize: Typography.bodySmall, lineHeight: 19 },
  episodeMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, marginTop: Spacing.one },
  freeBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radii.small, borderWidth: 1, borderColor: '#285B57', backgroundColor: '#183936' },
  freeBadgeText: { color: '#9AE6D3', fontSize: Typography.caption, fontWeight: '800', letterSpacing: 0.8 },
  duration: { color: palette.textSecondary, fontSize: Typography.caption, fontWeight: '600' },
  pressed: { opacity: Interaction.pressedOpacity },
});
