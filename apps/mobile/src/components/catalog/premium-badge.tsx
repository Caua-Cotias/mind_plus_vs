import { StyleSheet, Text, View } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';

export function PremiumBadge() {
  return (
    <View accessibilityLabel="Conteúdo premium" style={styles.badge}>
      <Text style={styles.text}>PREMIUM</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radii.small, backgroundColor: '#2A2156', borderColor: '#5746A6', borderWidth: 1 },
  text: { color: '#C7BEFF', fontSize: Typography.caption, fontWeight: '800', letterSpacing: 0.8 },
});
