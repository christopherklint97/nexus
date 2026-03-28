import { useState } from "react";
import {
	Alert,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import * as Clipboard from "expo-clipboard";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { toast } from "@/components/ui/Toast";
import {
	useCreateShareLink,
	useDeleteShareLink,
	useInviteMember,
	useMembersQuery,
	useShareLinksQuery,
} from "@/lib/collaboration";
import { useWorkspaceStore } from "@/stores/workspace";

interface Props {
	visible: boolean;
	onClose: () => void;
	pageType: string;
	pageId: string;
	pageTitle: string;
}

export function ShareSheet({ visible, onClose, pageType, pageId, pageTitle }: Props) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId) || "";
	const { data: shares } = useShareLinksQuery(pageType, pageId);
	const { data: members } = useMembersQuery(workspaceId);
	const createShare = useCreateShareLink();
	const deleteShare = useDeleteShareLink();
	const inviteMember = useInviteMember();
	const [inviteEmail, setInviteEmail] = useState("");
	const [permission, setPermission] = useState<"view" | "comment" | "edit">("view");

	const handleCreateLink = () => {
		createShare.mutate(
			{ pageType, pageId, permission, workspaceId },
			{
				onSuccess: (link) => {
					const url = `${process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"}/share/${link.token}`;
					toast.success("Share link created");
				},
			},
		);
	};

	const handleCopyLink = async (token: string) => {
		const url = `${process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"}/share/${token}`;
		await Clipboard.setStringAsync(url);
		toast.success("Link copied to clipboard");
	};

	const handleInvite = () => {
		if (!inviteEmail.trim()) return;
		inviteMember.mutate(
			{ workspaceId, email: inviteEmail.trim(), role: "member" },
			{
				onSuccess: () => {
					setInviteEmail("");
					toast.success("Invitation sent");
				},
				onError: (err) => toast.error(err.message),
			},
		);
	};

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				{/* Header */}
				<View style={[styles.header, { borderBottomColor: colors.border }]}>
					<Text style={[styles.headerTitle, { color: colors.text }]}>
						Share "{pageTitle}"
					</Text>
					<Pressable onPress={onClose}>
						<Text style={[styles.doneText, { color: colors.tint }]}>Done</Text>
					</Pressable>
				</View>

				<ScrollView style={styles.body}>
					{/* Invite by Email */}
					<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
						Invite People
					</Text>
					<View style={styles.inviteRow}>
						<TextInput
							style={[styles.inviteInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
							value={inviteEmail}
							onChangeText={setInviteEmail}
							placeholder="Email address..."
							placeholderTextColor={colors.textSecondary}
							keyboardType="email-address"
							autoCapitalize="none"
						/>
						<Pressable
							style={[styles.inviteBtn, { backgroundColor: colors.tint }]}
							onPress={handleInvite}
						>
							<Text style={styles.inviteBtnText}>Invite</Text>
						</Pressable>
					</View>

					{/* Members */}
					{members && members.length > 0 && (
						<>
							<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
								Workspace Members
							</Text>
							{members.map((m) => (
								<View key={m.id} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
									<View style={[styles.memberAvatar, { backgroundColor: colors.tint }]}>
										<Text style={styles.memberAvatarText}>
											{(m.user.name || "U").charAt(0).toUpperCase()}
										</Text>
									</View>
									<View style={{ flex: 1 }}>
										<Text style={[styles.memberName, { color: colors.text }]}>{m.user.name}</Text>
										<Text style={[styles.memberEmail, { color: colors.textSecondary }]}>{m.user.email}</Text>
									</View>
									<View style={[styles.roleBadge, { backgroundColor: colors.tint + "15" }]}>
										<Text style={[styles.roleText, { color: colors.tint }]}>{m.role}</Text>
									</View>
								</View>
							))}
						</>
					)}

					{/* Share Links */}
					<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
						Share Links
					</Text>

					{/* Permission selector */}
					<View style={styles.permRow}>
						{(["view", "comment", "edit"] as const).map((p) => (
							<Pressable
								key={p}
								style={[
									styles.permChip,
									{
										backgroundColor: permission === p ? colors.tint + "15" : colors.surface,
										borderColor: permission === p ? colors.tint : colors.border,
									},
								]}
								onPress={() => setPermission(p)}
							>
								<Text style={[styles.permText, { color: permission === p ? colors.tint : colors.text }]}>
									{p === "view" ? "Can view" : p === "comment" ? "Can comment" : "Can edit"}
								</Text>
							</Pressable>
						))}
					</View>

					<Pressable style={[styles.createLinkBtn, { backgroundColor: colors.tint }]} onPress={handleCreateLink}>
						<Text style={styles.createLinkText}>Create Share Link</Text>
					</Pressable>

					{/* Existing Links */}
					{shares?.map((link) => (
						<View key={link.id} style={[styles.linkRow, { borderColor: colors.border }]}>
							<View style={{ flex: 1 }}>
								<Text style={[styles.linkPermission, { color: colors.text }]}>
									{link.permission} access
								</Text>
								<Text style={[styles.linkToken, { color: colors.textSecondary }]} numberOfLines={1}>
									...{link.token.slice(-12)}
								</Text>
							</View>
							<Pressable onPress={() => handleCopyLink(link.token)} style={styles.copyBtn}>
								<Text style={[styles.copyText, { color: colors.tint }]}>Copy</Text>
							</Pressable>
							<Pressable onPress={() => deleteShare.mutate(link.id)}>
								<Text style={{ color: colors.danger, fontSize: 14 }}>{"\u2715"}</Text>
							</Pressable>
						</View>
					))}
				</ScrollView>
			</View>
		</Modal>
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
	headerTitle: { fontSize: 17, fontWeight: "700", flex: 1 },
	doneText: { fontSize: 15, fontWeight: "600" },
	body: { flex: 1, padding: 20 },
	sectionTitle: {
		fontSize: 12,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 10,
		marginTop: 20,
	},
	inviteRow: { flexDirection: "row", gap: 8 },
	inviteInput: { flex: 1, height: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 14 },
	inviteBtn: { paddingHorizontal: 16, height: 42, borderRadius: 8, alignItems: "center", justifyContent: "center" },
	inviteBtnText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
	memberRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
	memberAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
	memberAvatarText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
	memberName: { fontSize: 14, fontWeight: "600" },
	memberEmail: { fontSize: 12, marginTop: 1 },
	roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
	roleText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
	permRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
	permChip: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: "center" },
	permText: { fontSize: 13, fontWeight: "500" },
	createLinkBtn: { paddingVertical: 12, borderRadius: 10, alignItems: "center", marginBottom: 16 },
	createLinkText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
	linkRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderWidth: 1, borderRadius: 8, marginBottom: 8 },
	linkPermission: { fontSize: 14, fontWeight: "600", textTransform: "capitalize" },
	linkToken: { fontSize: 11, marginTop: 2 },
	copyBtn: { paddingHorizontal: 10, paddingVertical: 4 },
	copyText: { fontSize: 13, fontWeight: "600" },
});
