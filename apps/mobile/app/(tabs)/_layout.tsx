import { Tabs, router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { NotificationBell, NotificationCenter } from "@/components/navigation/NotificationCenter";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useNavigationStore } from "@/stores/navigation";

export default function TabLayout() {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const setDrawerOpen = useNavigationStore((s) => s.setDrawerOpen);
	const [showNotifications, setShowNotifications] = useState(false);

	return (
		<>
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: colors.tint,
				tabBarInactiveTintColor: colors.tabIconDefault,
				tabBarStyle: {
					backgroundColor: colors.surface,
					borderTopColor: colors.border,
					borderTopWidth: 1,
					elevation: 0,
					shadowOpacity: 0,
				},
				headerStyle: {
					backgroundColor: colors.surface,
					elevation: 0,
					shadowOpacity: 0,
					borderBottomWidth: 1,
					borderBottomColor: colors.border,
				},
				headerTitleStyle: {
					fontWeight: "700",
					fontSize: 18,
					color: colors.text,
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					tabBarIcon: ({ color }) => (
						<SymbolView
							name={{ ios: "house.fill", android: "home", web: "home" }}
							tintColor={color}
							size={24}
						/>
					),
					headerLeft: () => (
						<Pressable
							style={{ marginLeft: 16 }}
							onPress={() => setDrawerOpen(true)}
						>
							<Text style={{ fontSize: 20, color: colors.textSecondary }}>
								{"\u2630"}
							</Text>
						</Pressable>
					),
					headerRight: () => (
						<View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginRight: 16 }}>
							<NotificationBell onPress={() => setShowNotifications(true)} />
							<Pressable onPress={() => router.push("/settings")}>
								<Text style={{ fontSize: 18 }}>{"\u2699"}</Text>
							</Pressable>
						</View>
					),
				}}
			/>
			<Tabs.Screen
				name="tasks"
				options={{
					title: "Tasks",
					headerShown: false,
					tabBarIcon: ({ color }) => (
						<SymbolView
							name={{
								ios: "checkmark.circle.fill",
								android: "check_circle",
								web: "check_circle",
							}}
							tintColor={color}
							size={24}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="shopping"
				options={{
					title: "Shopping",
					headerShown: false,
					tabBarIcon: ({ color }) => (
						<SymbolView
							name={{ ios: "cart.fill", android: "shopping_cart", web: "shopping_cart" }}
							tintColor={color}
							size={24}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="notes"
				options={{
					title: "Notes",
					headerShown: false,
					tabBarIcon: ({ color }) => (
						<SymbolView
							name={{ ios: "doc.text.fill", android: "description", web: "description" }}
							tintColor={color}
							size={24}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="databases"
				options={{
					title: "Databases",
					headerShown: false,
					tabBarIcon: ({ color }) => (
						<SymbolView
							name={{
								ios: "tablecells",
								android: "grid_view",
								web: "grid_view",
							}}
							tintColor={color}
							size={24}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="recipes"
				options={{
					title: "Recipes",
					headerShown: false,
					tabBarIcon: ({ color }) => (
						<SymbolView
							name={{
								ios: "book.fill",
								android: "menu_book",
								web: "menu_book",
							}}
							tintColor={color}
							size={24}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="calendar"
				options={{
					title: "Calendar",
					headerShown: false,
					tabBarIcon: ({ color }) => (
						<SymbolView
							name={{
								ios: "calendar",
								android: "calendar_today",
								web: "calendar_today",
							}}
							tintColor={color}
							size={24}
						/>
					),
				}}
			/>
		</Tabs>
		<NotificationCenter
			visible={showNotifications}
			onClose={() => setShowNotifications(false)}
		/>
		</>
	);
}
