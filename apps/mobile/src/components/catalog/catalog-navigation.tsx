import { Link, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Interaction, Radii, Spacing, Typography } from '@/constants/theme';
import type { CatalogCategory } from '@mind-plus/contracts';

const palette = Colors.dark;

export function CategoryChip({ category }: { category: CatalogCategory }) {
  const href = { pathname: '/series', params: { category: category.slug } } as Href;

  return (
    <Link asChild href={href}>
      <Pressable accessibilityRole="link" style={({ pressed }) => [styles.categoryChip, pressed && styles.pressed]}>
        <Text style={styles.categoryText}>{category.name}</Text>
      </Pressable>
    </Link>
  );
}

export function CategoryRail({ categories }: { categories: CatalogCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <ScrollView horizontal contentContainerStyle={styles.categoryRail} showsHorizontalScrollIndicator={false}>
      {categories.map((category) => <CategoryChip category={category} key={category.id} />)}
    </ScrollView>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  href,
}: {
  title: string;
  actionLabel?: string;
  href?: Href;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {actionLabel && href ? (
        <Link asChild href={href}>
          <Pressable accessibilityRole="link" hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  categoryRail: { gap: Spacing.two, paddingVertical: Spacing.one },
  categoryChip: {
    minHeight: Interaction.minimumTargetSize,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.backgroundElement,
  },
  categoryText: { color: palette.text, fontSize: Typography.bodySmall, fontWeight: '600' },
  sectionHeader: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  sectionTitle: { color: palette.text, fontSize: Typography.titleSmall, fontWeight: '700' },
  actionText: { color: palette.accent, fontSize: Typography.bodySmall, fontWeight: '700' },
  pressed: { opacity: Interaction.pressedOpacity },
});
