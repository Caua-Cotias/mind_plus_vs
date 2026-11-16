import { DarkTheme, Stack, ThemeProvider } from 'expo-router';

import '../global.css';

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#080B14' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="series" />
        <Stack.Screen name="(public)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </ThemeProvider>
  );
}
