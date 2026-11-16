import { useState } from 'react';
import type { ReactNode } from 'react';
import type { ImageStyle, StyleProp } from 'react-native';
import { Image } from 'expo-image';

export function isPublicImageUrl(value: string | null | undefined): value is string {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:')
      && !parsed.username
      && !parsed.password;
  } catch {
    return false;
  }
}

export function PublicImage({
  url,
  accessibilityLabel,
  style,
  fallback,
}: {
  url: string | null | undefined;
  accessibilityLabel: string;
  style: StyleProp<ImageStyle>;
  fallback: ReactNode;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!isPublicImageUrl(url) || failedUrl === url) return fallback;

  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      contentFit="cover"
      onError={() => setFailedUrl(url)}
      source={{ uri: url }}
      style={style}
      transition={180}
    />
  );
}
