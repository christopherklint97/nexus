import { router } from "expo-router";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useNotificationStore, type AppNotification } from "@/stores/notifications";

interface Props {
	visible: boolean;
	onClose: () => void;
}

function timeAgo(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return new Date(dateStr).toLocaleDateString();
}

export function NotificationCenter({ visible, onClose }: Props) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const { notifications, markRead, markAllRead, dismiss, clearAll, unreadCount } =
		useNotificationStore();

	const handlePress = (notification: AppNotification) => {
		markRead(notification.id);
		if (notification.route) {
			onClose();
			router.push(notification.route as any);
		}
	};

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				{/* Header */}
				<View style={[styles.header, { borderBottomColor: colors.border }]}>
					<Text style={[styles.headerTitle, { color: colors.text }]}>
						Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
					</Text>
					<View style={styles.headerActions}>
						{unreadCount > 0 && (
							<Pressable onPress={markAllRead}>
								<Text style={[styles.headerAction, { color: colors.tint }]}>Mark all read</Text>
							</Pressable>
						)}
						<Pressable onPress={onClose}>
							<Text style={[styles.headerAction, { color: colors.textSecondary }]}>Done</Text>
						</Pressable>
					</View>
				</View>

				{/* Notifications List */}
				<FlatList
					data={notifications}
					keyExtractor={(item) => item.id}
					renderItem={({ item, index }) => (
						<Animated.View entering={FadeIn.delay(index * 30).duration(200)}>
							<Pressable
								style={[
									styles.notifRow,
									{
										backgroundColor: item.read ? "transparent" : colors.tint + "06",
										borderBottomColor: colors.border,
									},
								]}
								onPress={() => handlePress(item)}
							>
								<View style={styles.notifIcon}>
									<Text style={styles.notifIconText}>{item.icon}</Text>
								</View>
								<View style={styles.notifContent}>
									<Text
										style={[
											styles.notifTitle,
											{ color: colors.text, fontWeight: item.read ? "500" : "700" },
										]}
										numberOfLines={1}
									>
										{item.title}
									</Text>
									<Text
										style={[styles.notifBody, { color: colors.textSecondary }]}
										numberOfLines={2}
									>
										{item.body}
									</Text>
									<Text style={[styles.notifTime, { color: colors.textSecondary }]}>
										{timeAgo(item.createdAt)}
									</Text>
								</View>
								<Pressable
									style={styles.dismissBtn}
									onPress={() => dismiss(item.id)}
									hitSlop={8}
								>
									<Text style={[styles.dismissText, { color: colors.textSecondary }]}>
										{"\u2715"}
									</Text>
								</Pressable>
								{!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.tint }]} />}
							</Pressable>
						</Animated.View>
					)}
					ListEmptyComponent={
						<View style={styles.empty}>
							<Text style={styles.emptyIcon}>{"\uD83D\uDD14"}</Text>
							<Text style={[styles.emptyTitle, { color: colors.text }]}>All caught up</Text>
							<Text style={[styles.emptyText, { color: colors.textSecondary }]}>
								No notifications yet. We'll notify you about due dates, reminders, and updates.
							</Text>
						</View>
					}
					ListFooterComponent={
						notifications.length > 0 ? (
							<Pressable style={styles.clearBtn} onPress={clearAll}>
								<Text style={[styles.clearText, { color: colors.danger }]}>
									Clear all notifications
								</Text>
							</Pressable>
						) : null
					}
				/>
			</View>
		</Modal>
	);
}

// ─── Notification Bell (for header) ───

export function NotificationBell({ onPress }: { onPress: () => void }) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const unreadCount = useNotificationStore((s) => s.unreadCount);

	return (
		<Pressable onPress={onPress} style={styles.bell} hitSlop={8}>
			<Text style={{ fontSize: 18 }}>{"\uD83D\uDD14"}</Text>
			{unreadCount > 0 && (
				<View style={[styles.badge, { backgroundColor: colors.danger }]}>
					<Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
				</View>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderBottomWidth: 1,
	},
	headerTitle: { fontSize: 18, fontWeight: "700" },
	headerActions: { flexDirection: "row", gap: 16 },
	headerAction: { fontSize: 14, fontWeight: "600" },
	notifRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: 12,
	},
	notifIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
	notifIconText: { fontSize: 20 },
	notifContent: { flex: 1 },
	notifTitle: { fontSize: 14 },
	notifBody: { fontSize: 13, marginTop: 2, lineHeight: 18 },
	notifTime: { fontSize: 11, marginTop: 4 },
	dismissBtn: { padding: 4, marginTop: 2 },
	dismissText: { fontSize: 14 },
	unreadDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		position: "absolute",
		left: 8,
		top: 18,
	},
	empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 40 },
	emptyIcon: { fontSize: 48, marginBottom: 16 },
	emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
	emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
	clearBtn: { alignItems: "center", paddingVertical: 20 },
	clearText: { fontSize: 14, fontWeight: "500" },
	bell: { position: "relative" },
	badge: {
		position: "absolute",
		top: -4,
		right: -6,
		minWidth: 16,
		height: 16,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 3,
	},
	badgeText: { color: "#FFF", fontSize: 9, fontWeight: "800" },
});
