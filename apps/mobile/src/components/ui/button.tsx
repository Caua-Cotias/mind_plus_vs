import { createButton } from '@gluestack-ui/core/button/creator';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ColorTokens, Interaction } from '@/constants/theme';

const GluestackButtonPrimitive = createButton({
  Root: Pressable,
  Text,
  Group: View,
  Spinner: ActivityIndicator,
  Icon: View,
});

export function GluestackButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  testID,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const unavailable = loading || disabled;

  return (
    <GluestackButtonPrimitive
      accessibilityRole="button"
      accessibilityState={{ disabled: unavailable, busy: loading }}
      className="min-h-12 flex-row items-center justify-center rounded-xl bg-primary px-5 py-3 data-[disabled=true]:opacity-50 data-[active=true]:opacity-80"
      isDisabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        { minHeight: Interaction.minimumTargetSize, opacity: unavailable ? Interaction.disabledOpacity : pressed ? Interaction.pressedOpacity : 1 },
      ]}
      testID={testID}
    >
      {loading ? (
        <GluestackButtonPrimitive.Spinner color={ColorTokens.textPrimary} />
      ) : (
        <GluestackButtonPrimitive.Text className="text-base font-semibold text-primary-foreground">
          {title}
        </GluestackButtonPrimitive.Text>
      )}
    </GluestackButtonPrimitive>
  );
}
