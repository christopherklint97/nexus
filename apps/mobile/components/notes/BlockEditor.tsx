import { useCallback, useRef, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import type { NoteBlock } from "@/lib/notes";

interface BlockEditorProps {
	blocks: NoteBlock[];
	onChange: (blocks: NoteBlock[]) => void;
	editable?: boolean;
}

const BLOCK_TYPES = [
	{ type: "text", label: "Text", icon: "T", description: "Plain text" },
	{ type: "heading", label: "Heading", icon: "H1", description: "Large heading" },
	{ type: "subheading", label: "Subheading", icon: "H2", description: "Medium heading" },
	{ type: "checklist", label: "Checklist", icon: "☑", description: "To-do item" },
	{ type: "code", label: "Code", icon: "<>", description: "Code block" },
	{ type: "quote", label: "Quote", icon: "❝", description: "Block quote" },
	{ type: "callout", label: "Callout", icon: "💡", description: "Callout box" },
	{ type: "divider", label: "Divider", icon: "—", description: "Horizontal line" },
] as const;

function newBlock(type: NoteBlock["type"] = "text"): NoteBlock {
	return {
		id: crypto.randomUUID(),
		type,
		content: "",
		checked: type === "checklist" ? false : undefined,
	};
}

export function BlockEditor({ blocks, onChange, editable = true }: BlockEditorProps) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const [showSlashMenu, setShowSlashMenu] = useState(false);
	const [activeBlockIndex, setActiveBlockIndex] = useState(-1);
	const inputRefs = useRef<Map<string, TextInput>>(new Map());

	const updateBlock = useCallback(
		(index: number, updates: Partial<NoteBlock>) => {
			const next = [...blocks];
			next[index] = { ...next[index], ...updates };
			onChange(next);
		},
		[blocks, onChange],
	);

	const addBlockAfter = useCallback(
		(index: number, type: NoteBlock["type"] = "text") => {
			const block = newBlock(type);
			const next = [...blocks];
			next.splice(index + 1, 0, block);
			onChange(next);
			// Focus new block after render
			setTimeout(() => inputRefs.current.get(block.id)?.focus(), 50);
		},
		[blocks, onChange],
	);

	const removeBlock = useCallback(
		(index: number) => {
			if (blocks.length <= 1) return;
			const next = blocks.filter((_, i) => i !== index);
			onChange(next);
		},
		[blocks, onChange],
	);

	const handleTextChange = useCallback(
		(index: number, text: string) => {
			// Markdown shortcuts
			if (text === "# ") {
				updateBlock(index, { type: "heading", content: "" });
				return;
			}
			if (text === "## ") {
				updateBlock(index, { type: "subheading", content: "" });
				return;
			}
			if (text === "> ") {
				updateBlock(index, { type: "quote", content: "" });
				return;
			}
			if (text === "[] " || text === "- [] ") {
				updateBlock(index, { type: "checklist", content: "", checked: false });
				return;
			}
			if (text === "``` " || text === "```") {
				updateBlock(index, { type: "code", content: "" });
				return;
			}
			if (text === "---") {
				updateBlock(index, { type: "divider", content: "" });
				addBlockAfter(index);
				return;
			}

			// Slash command trigger
			if (text === "/") {
				setActiveBlockIndex(index);
				setShowSlashMenu(true);
				return;
			}

			updateBlock(index, { content: text });
		},
		[updateBlock, addBlockAfter],
	);

	const handleSlashSelect = (type: NoteBlock["type"]) => {
		setShowSlashMenu(false);
		if (activeBlockIndex >= 0) {
			if (type === "divider") {
				updateBlock(activeBlockIndex, { type: "divider", content: "" });
				addBlockAfter(activeBlockIndex);
			} else {
				updateBlock(activeBlockIndex, {
					type,
					content: "",
					checked: type === "checklist" ? false : undefined,
				});
			}
		}
	};

	const handleKeyPress = useCallback(
		(index: number, key: string) => {
			if (key === "Enter") {
				addBlockAfter(index);
			} else if (key === "Backspace" && blocks[index].content === "" && blocks.length > 1) {
				removeBlock(index);
				// Focus previous
				if (index > 0) {
					const prevId = blocks[index - 1].id;
					setTimeout(() => inputRefs.current.get(prevId)?.focus(), 50);
				}
			}
		},
		[blocks, addBlockAfter, removeBlock],
	);

	const renderBlock = useCallback(
		({ item, index }: { item: NoteBlock; index: number }) => {
			return (
				<BlockRow
					block={item}
					colors={colors}
					editable={editable}
					inputRef={(ref) => {
						if (ref) inputRefs.current.set(item.id, ref);
						else inputRefs.current.delete(item.id);
					}}
					onChangeText={(text) => handleTextChange(index, text)}
					onKeyPress={(key) => handleKeyPress(index, key)}
					onToggleCheck={() => updateBlock(index, { checked: !item.checked })}
				/>
			);
		},
		[colors, editable, handleTextChange, handleKeyPress, updateBlock],
	);

	return (
		<View style={styles.container}>
			<FlatList
				data={blocks.length > 0 ? blocks : [newBlock()]}
				keyExtractor={(item) => item.id}
				renderItem={renderBlock}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.list}
				keyboardShouldPersistTaps="handled"
			/>

			{/* Add block button */}
			{editable && (
				<Pressable
					style={[styles.addBlockBtn, { borderColor: colors.border }]}
					onPress={() => addBlockAfter(blocks.length - 1)}
				>
					<Text style={[styles.addBlockText, { color: colors.textSecondary }]}>+ Add block</Text>
				</Pressable>
			)}

			{/* Slash command menu */}
			<Modal
				visible={showSlashMenu}
				transparent
				animationType="fade"
				onRequestClose={() => setShowSlashMenu(false)}
			>
				<Pressable style={styles.overlay} onPress={() => setShowSlashMenu(false)}>
					<View
						style={[
							styles.slashMenu,
							{ backgroundColor: colors.surface, borderColor: colors.border },
						]}
					>
						<Text style={[styles.slashTitle, { color: colors.textSecondary }]}>Insert Block</Text>
						{BLOCK_TYPES.map((bt) => (
							<Pressable
								key={bt.type}
								style={[styles.slashItem, { borderBottomColor: colors.border }]}
								onPress={() => handleSlashSelect(bt.type as NoteBlock["type"])}
							>
								<View style={[styles.slashIcon, { backgroundColor: colors.background }]}>
									<Text style={[styles.slashIconText, { color: colors.text }]}>{bt.icon}</Text>
								</View>
								<View>
									<Text style={[styles.slashLabel, { color: colors.text }]}>{bt.label}</Text>
									<Text style={[styles.slashDesc, { color: colors.textSecondary }]}>
										{bt.description}
									</Text>
								</View>
							</Pressable>
						))}
					</View>
				</Pressable>
			</Modal>
		</View>
	);
}

// Individual block row
interface BlockRowProps {
	block: NoteBlock;
	colors: (typeof Colors)["light"];
	editable: boolean;
	inputRef: (ref: TextInput | null) => void;
	onChangeText: (text: string) => void;
	onKeyPress: (key: string) => void;
	onToggleCheck: () => void;
}

function BlockRow({
	block,
	colors,
	editable,
	inputRef,
	onChangeText,
	onKeyPress,
	onToggleCheck,
}: BlockRowProps) {
	if (block.type === "divider") {
		return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
	}

	const blockStyle = getBlockStyle(block.type, colors);

	return (
		<View
			style={[
				styles.blockRow,
				block.type === "callout" && {
					...styles.calloutBox,
					backgroundColor: colors.tint + "08",
					borderColor: colors.tint + "20",
				},
			]}
		>
			{block.type === "checklist" && (
				<Pressable onPress={onToggleCheck} style={styles.checkContainer}>
					<View
						style={[
							styles.checkbox,
							{
								borderColor: block.checked ? colors.success : colors.border,
								backgroundColor: block.checked ? colors.success : "transparent",
							},
						]}
					>
						{block.checked && <Text style={styles.checkmark}>✓</Text>}
					</View>
				</Pressable>
			)}

			{block.type === "quote" && (
				<View style={[styles.quoteLine, { backgroundColor: colors.tint }]} />
			)}

			{block.type === "callout" && <Text style={styles.calloutIcon}>💡</Text>}

			<TextInput
				ref={inputRef}
				style={[
					styles.blockInput,
					blockStyle,
					{ color: colors.text },
					block.type === "checklist" &&
						block.checked && { textDecorationLine: "line-through", color: colors.textSecondary },
					block.type === "code" && {
						backgroundColor: colors.background,
						fontFamily: "SpaceMono",
						borderRadius: 6,
						padding: 12,
					},
				]}
				value={block.content}
				onChangeText={onChangeText}
				onKeyPress={(e) => onKeyPress(e.nativeEvent.key)}
				multiline
				editable={editable}
				placeholder={getPlaceholder(block.type)}
				placeholderTextColor={colors.textSecondary}
				blurOnSubmit={false}
			/>
		</View>
	);
}

function getBlockStyle(type: NoteBlock["type"], _colors: (typeof Colors)["light"]) {
	switch (type) {
		case "heading":
			return { fontSize: 24, fontWeight: "800" as const, lineHeight: 32 };
		case "subheading":
			return { fontSize: 18, fontWeight: "700" as const, lineHeight: 26 };
		case "code":
			return { fontSize: 13, lineHeight: 20 };
		case "quote":
			return { fontSize: 15, fontStyle: "italic" as const, lineHeight: 22 };
		default:
			return { fontSize: 15, lineHeight: 22 };
	}
}

function getPlaceholder(type: NoteBlock["type"]): string {
	switch (type) {
		case "heading":
			return "Heading";
		case "subheading":
			return "Subheading";
		case "code":
			return "Code...";
		case "quote":
			return "Quote...";
		case "checklist":
			return "To-do";
		case "callout":
			return "Callout...";
		default:
			return "Type / for commands...";
	}
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	list: { paddingBottom: 40 },
	blockRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		paddingHorizontal: 20,
		minHeight: 36,
	},
	blockInput: {
		flex: 1,
		paddingVertical: 4,
	},
	checkContainer: { paddingTop: 6, paddingRight: 8 },
	checkbox: {
		width: 20,
		height: 20,
		borderRadius: 4,
		borderWidth: 2,
		alignItems: "center",
		justifyContent: "center",
	},
	checkmark: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
	quoteLine: {
		width: 3,
		borderRadius: 2,
		marginRight: 12,
		marginTop: 4,
		minHeight: 20,
		alignSelf: "stretch",
	},
	calloutBox: {
		borderWidth: 1,
		borderRadius: 8,
		marginHorizontal: 16,
		marginVertical: 4,
		padding: 8,
	},
	calloutIcon: { fontSize: 16, marginRight: 8, marginTop: 4 },
	divider: { height: 1, marginVertical: 12, marginHorizontal: 20 },
	addBlockBtn: {
		borderWidth: 1,
		borderStyle: "dashed",
		borderRadius: 8,
		padding: 12,
		marginHorizontal: 20,
		marginTop: 8,
		alignItems: "center",
	},
	addBlockText: { fontSize: 13, fontWeight: "500" },
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.3)",
		justifyContent: "center",
		alignItems: "center",
	},
	slashMenu: {
		width: 280,
		borderRadius: 12,
		borderWidth: 1,
		padding: 8,
		maxHeight: 400,
	},
	slashTitle: {
		fontSize: 11,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	slashItem: {
		flexDirection: "row",
		alignItems: "center",
		padding: 10,
		gap: 12,
		borderBottomWidth: 0.5,
	},
	slashIcon: {
		width: 32,
		height: 32,
		borderRadius: 6,
		alignItems: "center",
		justifyContent: "center",
	},
	slashIconText: { fontSize: 14, fontWeight: "700" },
	slashLabel: { fontSize: 14, fontWeight: "600" },
	slashDesc: { fontSize: 12, marginTop: 1 },
});
