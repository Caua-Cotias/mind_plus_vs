export type ApiPlatform = 'android' | 'ios' | 'web' | 'windows' | 'macos';

export interface ApiUrlOptions {
  configuredURL?: string;
  platform: ApiPlatform;
  isPhysicalDevice: boolean;
  expoHost?: string;
}

export function resolveApiBaseURL({
  configuredURL,
  platform,
  isPhysicalDevice,
  expoHost,
}: ApiUrlOptions): string {
  const configured = configuredURL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  if (platform === 'android' && !isPhysicalDevice) {
    return 'http://10.0.2.2:3000';
  }

  if (isPhysicalDevice && expoHost && expoHost !== 'localhost') {
    return `http://${expoHost}:3000`;
  }

  return 'http://localhost:3000';
}
