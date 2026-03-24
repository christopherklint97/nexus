import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { QueryProvider } from "@/lib/query";

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

	if (!loaded) {
		return null;
	}

	return <RootLayoutNav />;
}

function RootLayoutNav() {
	const colorScheme = useColorScheme();

	return (
		<QueryProvider>
			<ThemeProvider value={colorScheme === "dark" ? NexusDarkTheme : NexusLightTheme}>
				<Stack>
					<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
					<Stack.Screen name="(auth)" options={{ headerShown: false }} />
					<Stack.Screen
						name="settings/index"
						options={{ presentation: "modal", title: "Settings" }}
					/>
				</Stack>
			</ThemeProvider>
		</QueryProvider>
	);
}
