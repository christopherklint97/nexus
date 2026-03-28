import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { View } from "react-native";
import "react-native-reanimated";

import { DrawerOverlay } from "@/components/navigation/DrawerOverlay";
import { QuickSwitcher } from "@/components/navigation/QuickSwitcher";
import { PWAInstallPrompt } from "@/components/ui/PWAInstallPrompt";
import { ToastContainer } from "@/components/ui/Toast";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { QueryProvider } from "@/lib/query";
import { registerForPushNotifications, setupNotificationResponseHandler } from "@/lib/notifications";
import { useAuthStore } from "@/stores/auth";
import { useNavigationStore } from "@/stores/navigation";
import { useNotificationStore } from "@/stores/notifications";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
	initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

const NexusLightTheme = {
	...DefaultTheme,
	colors: {
		...DefaultTheme.colors,
		primary: Colors.light.tint,
		background: Colors.light.background,
		card: Colors.light.surface,
		text: Colors.light.text,
		border: Colors.light.border,
	},
};

const NexusDarkTheme = {
	...DarkTheme,
	colors: {
		...DarkTheme.colors,
		primary: Colors.dark.tint,
		background: Colors.dark.background,
		card: Colors.dark.surface,
		text: Colors.dark.text,
		border: Colors.dark.border,
	},
};

export default function RootLayout() {
	const [loaded, error] = useFonts({
		SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
	});

	useEffect(() => {
		if (error) throw error;
	}, [error]);

	useEffect(() => {
		if (loaded) {
			SplashScreen.hideAsync();
		}
	}, [loaded]);

	useEffect(() => {
		useAuthStore.getState().hydrate();
		useNotificationStore.getState().hydrate();
		registerForPushNotifications();
		const sub = setupNotificationResponseHandler();
		return () => sub.remove();
	}, []);

	if (!loaded) {
		return null;
	}

	return <RootLayoutNav />;
}

function useProtectedRoute() {
	const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
	const isLoading = useAuthStore((s) => s.isLoading);
	const segments = useSegments();

	useEffect(() => {
		if (isLoading) return;

		const inAuthGroup = segments[0] === "(auth)";

		if (!isAuthenticated && !inAuthGroup) {
			router.replace("/(auth)/login");
		} else if (isAuthenticated && inAuthGroup) {
			router.replace("/(tabs)");
		}
	}, [isAuthenticated, isLoading, segments]);
}

function RootLayoutNav() {
	const colorScheme = useColorScheme();
	useProtectedRoute();
	const isDrawerOpen = useNavigationStore((s) => s.isDrawerOpen);
	const setDrawerOpen = useNavigationStore((s) => s.setDrawerOpen);
	const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);

	return (
		<QueryProvider>
			<ThemeProvider value={colorScheme === "dark" ? NexusDarkTheme : NexusLightTheme}>
				<View style={{ flex: 1 }}>
					<Stack>
						<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
						<Stack.Screen name="(auth)" options={{ headerShown: false }} />
						<Stack.Screen
							name="settings/index"
							options={{ presentation: "modal", title: "Settings" }}
						/>
					</Stack>

					{/* Global Drawer Overlay */}
					<DrawerOverlay
						visible={isDrawerOpen}
						onClose={() => setDrawerOpen(false)}
						onOpenQuickSwitcher={() => {
							setDrawerOpen(false);
							setQuickSwitcherOpen(true);
						}}
					/>

					{/* Global Quick Switcher */}
					<QuickSwitcher
						visible={quickSwitcherOpen}
						onClose={() => setQuickSwitcherOpen(false)}
					/>

					{/* Toast Notifications */}
					<ToastContainer />

					{/* PWA Install Prompt (web only) */}
					<PWAInstallPrompt />
				</View>
			</ThemeProvider>
		</QueryProvider>
	);
}
