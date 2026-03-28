import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";

export interface Crumb {
	label: string;
	route?: string;
	icon?: string;
}

interface Props {
	crumbs: Crumb[];
}

export function Breadcrumbs({ crumbs }: Props) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];

	if (crumbs.length <= 1) return null;

	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			style={[styles.container, { borderBottomColor: colors.border }]}
			contentContainerStyle={styles.content}
		>
			{crumbs.map((crumb, i) => {
				const isLast = i === crumbs.length - 1;
				return (
					<View key={`${crumb.label}-${i}`} style={styles.crumbRow}>
						{i > 0 && (
							<Text style={[styles.separator, { color: colors.textSecondary }]}>/</Text>
						)}
						{crumb.route && !isLast ? (
							<Pressable onPress={() => router.push(crumb.route as any)}>
								<Text style={[styles.crumbText, styles.crumbLink, { color: colors.tint }]}>
									{crumb.icon ? `${crumb.icon} ` : ""}
									{crumb.label}
								</Text>
							</Pressable>
						) : (
							<Text
								style={[
									styles.crumbText,
									{ color: isLast ? colors.text : colors.textSecondary },
									isLast && styles.crumbActive,
								]}
								numberOfLines={1}
							>
								{crumb.icon ? `${crumb.icon} ` : ""}
								{crumb.label}
							</Text>
						)}
					</View>
				);
			})}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		borderBottomWidth: 1,
	},
	content: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	crumbRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	separator: {
		marginHorizontal: 6,
		fontSize: 12,
	},
	crumbText: {
		fontSize: 13,
		maxWidth: 150,
	},
	crumbLink: {
		fontWeight: "500",
	},
	crumbActive: {
		fontWeight: "600",
	},
});
