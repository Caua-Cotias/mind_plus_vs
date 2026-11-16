import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { resolveApiBaseURL } from './api-url';

const platform = Platform.OS === 'android' || Platform.OS === 'ios' ? Platform.OS : 'web';
const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];

export const apiBaseURL = resolveApiBaseURL({
  configuredURL: process.env.EXPO_PUBLIC_API_URL,
  platform,
  isPhysicalDevice: Device.isDevice,
  expoHost,
});
