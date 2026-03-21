import React from "react";
import { Pressable, Text } from "react-native";
import { Tabs, router } from "expo-router";
import { SymbolView } from "expo-symbols";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

export default function TabLayout() {
	const colorScheme = useColorScheme();

	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: Colors[colorScheme].tint,
				tabBarInactiveTintColor: Colors[colorScheme].tabIconDefault,
				tabBarStyle: {
					backgroundColor: Colors[colorScheme].surface,
					borderTopColor: Colors[colorScheme].border,
					borderTopWidth: 1,
					elevation: 0,
					shadowOpacity: 0,
				},
				headerStyle: {
					backgroundColor: Colors[colorScheme].surface,
					elevation: 0,
					shadowOpacity: 0,
					borderBottomWidth: 1,
					borderBottomColor: Colors[colorScheme].border,
				},
				headerTitleStyle: {
					fontWeight: "700",
					fontSize: 18,
					color: Colors[colorScheme].text,
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
					headerRight: () => (
						<Pressable style={{ marginRight: 16 }} onPress={() => router.push("/settings")}>
							<Text style={{ fontSize: 20 }}>⚙</Text>
						</Pressable>
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
	);
}
