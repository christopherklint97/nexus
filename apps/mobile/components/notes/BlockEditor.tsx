import { useCallback, useRef, useState } from "react";
import {
	FlatList,
	Keyboard,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, Layout } from "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import type { BlockType, NoteBlock } from "@/lib/notes";

// ─── Block Type Definitions ───

interface BlockTypeDef {
	type: BlockType;
	label: string;
	icon: string;
	description: string;
	section: "basic" | "media" | "advanced" | "inline";
	shortcut?: string;
}

const BLOCK_TYPES: BlockTypeDef[] = [
	{ type: "text", label: "Text", icon: "Aa", description: "Plain text", section: "basic" },
	{ type: "heading", label: "Heading 1", icon: "H1", description: "Large heading", section: "basic", shortcut: "# " },
	{ type: "subheading", label: "Heading 2", icon: "H2", description: "Medium heading", section: "basic", shortcut: "## " },
	{ type: "heading3", label: "Heading 3", icon: "H3", description: "Small heading", section: "basic", shortcut: "### " },
	{ type: "bulleted_list", label: "Bulleted List", icon: "\u2022", description: "Unordered list", section: "basic", shortcut: "- " },
	{ type: "numbered_list", label: "Numbered List", icon: "1.", description: "Ordered list", section: "basic", shortcut: "1. " },
	{ type: "checklist", label: "To-Do", icon: "\u2611", description: "Checkbox item", section: "basic", shortcut: "[] " },
	{ type: "toggle", label: "Toggle", icon: "\u25B6", description: "Collapsible content", section: "basic" },
	{ type: "code", label: "Code", icon: "<>", description: "Code block", section: "basic", shortcut: "``` " },
	{ type: "quote", label: "Quote", icon: "\u201C", description: "Block quote", section: "basic", shortcut: "> " },
	{ type: "callout", label: "Callout", icon: "\uD83D\uDCA1", description: "Highlighted box", section: "basic" },
	{ type: "divider", label: "Divider", icon: "\u2014", description: "Horizontal line", section: "basic", shortcut: "---" },
	{ type: "image", label: "Image", icon: "\uD83D\uDDBC", description: "Embed an image", section: "media" },
	{ type: "bookmark", label: "Bookmark", icon: "\uD83D\uDD17", description: "Link preview", section: "media" },
	{ type: "table", label: "Table", icon: "\u229E", description: "Simple table", section: "advanced" },
	{ type: "column_list", label: "Columns", icon: "\u2225", description: "Side-by-side layout", section: "advanced" },
];

const SECTION_LABELS: Record<string, string> = {
	basic: "Basic Blocks",
	media: "Media",
	advanced: "Advanced",
};

// ─── Helpers ───

function newBlock(type: BlockType = "text"): NoteBlock {
	return {
		id: crypto.randomUUID(),
		type,
		content: "",
		checked: type === "checklist" ? false : undefined,
		collapsed: type === "toggle" ? false : undefined,
		children: type === "toggle" ? [] : undefined,
		rows: type === "table" ? [["", ""], ["", ""]] : undefined,
		columns: type === "column_list" ? [[], []] : undefined,
		emoji: type === "callout" ? "\uD83D\uDCA1" : undefined,
	};
}

// ─── History Stack ───

interface HistoryEntry {
	blocks: NoteBlock[];
	timestamp: number;
}

function useHistory(initial: NoteBlock[]) {
	const undoStack = useRef<HistoryEntry[]>([]);
	const redoStack = useRef<HistoryEntry[]>([]);

	const pushHistory = useCallback((blocks: NoteBlock[]) => {
		undoStack.current.push({ blocks: JSON.parse(JSON.stringify(blocks)), timestamp: Date.now() });
		// Cap at 50 entries
		if (undoStack.current.length > 50) undoStack.current.shift();
		redoStack.current = [];
	}, []);

	const undo = useCallback((currentBlocks: NoteBlock[]): NoteBlock[] | null => {
		const entry = undoStack.current.pop();
		if (!entry) return null;
		redoStack.current.push({ blocks: JSON.parse(JSON.stringify(currentBlocks)), timestamp: Date.now() });
		return entry.blocks;
	}, []);

	const redo = useCallback((currentBlocks: NoteBlock[]): NoteBlock[] | null => {
		const entry = redoStack.current.pop();
		if (!entry) return null;
		undoStack.current.push({ blocks: JSON.parse(JSON.stringify(currentBlocks)), timestamp: Date.now() });
		return entry.blocks;
	}, []);

	const canUndo = () => undoStack.current.length > 0;
	const canRedo = () => redoStack.current.length > 0;

	return { pushHistory, undo, redo, canUndo, canRedo };
}

// ─── Main Editor ───

interface BlockEditorProps {
	blocks: NoteBlock[];
	onChange: (blocks: NoteBlock[]) => void;
	editable?: boolean;
}

export function BlockEditor({ blocks, onChange, editable = true }: BlockEditorProps) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const [showSlashMenu, setShowSlashMenu] = useState(false);
	const [slashFilter, setSlashFilter] = useState("");
	const [activeBlockIndex, setActiveBlockIndex] = useState(-1);
	const [actionMenuIndex, setActionMenuIndex] = useState(-1);
	const [showFormatBar, setShowFormatBar] = useState(false);
	const [formatBlockIndex, setFormatBlockIndex] = useState(-1);
	const inputRefs = useRef<Map<string, TextInput>>(new Map());
	const { pushHistory, undo, redo, canUndo, canRedo } = useHistory(blocks);
	const lastHistoryPush = useRef(0);

	// Debounced history push
	const maybePushHistory = useCallback(
		(currentBlocks: NoteBlock[]) => {
			const now = Date.now();
			if (now - lastHistoryPush.current > 1000) {
				pushHistory(currentBlocks);
				lastHistoryPush.current = now;
			}
		},
		[pushHistory],
	);

	const updateBlock = useCallback(
		(index: number, updates: Partial<NoteBlock>) => {
			maybePushHistory(blocks);
			const next = [...blocks];
			next[index] = { ...next[index], ...updates };
			onChange(next);
		},
		[blocks, onChange, maybePushHistory],
	);

	const addBlockAfter = useCallback(
		(index: number, type: BlockType = "text") => {
			pushHistory(blocks);
			const block = newBlock(type);
			const next = [...blocks];
			next.splice(index + 1, 0, block);
			onChange(next);
			setTimeout(() => inputRefs.current.get(block.id)?.focus(), 50);
		},
		[blocks, onChange, pushHistory],
	);

	const removeBlock = useCallback(
		(index: number) => {
			if (blocks.length <= 1) return;
			pushHistory(blocks);
			const next = blocks.filter((_, i) => i !== index);
			onChange(next);
		},
		[blocks, onChange, pushHistory],
	);

	const duplicateBlock = useCallback(
		(index: number) => {
			pushHistory(blocks);
			const dup = { ...JSON.parse(JSON.stringify(blocks[index])), id: crypto.randomUUID() };
			const next = [...blocks];
			next.splice(index + 1, 0, dup);
			onChange(next);
		},
		[blocks, onChange, pushHistory],
	);

	const moveBlock = useCallback(
		(from: number, to: number) => {
			if (to < 0 || to >= blocks.length) return;
			pushHistory(blocks);
			const next = [...blocks];
			const [moved] = next.splice(from, 1);
			next.splice(to, 0, moved);
			onChange(next);
		},
		[blocks, onChange, pushHistory],
	);

	const turnInto = useCallback(
		(index: number, type: BlockType) => {
			pushHistory(blocks);
			const next = [...blocks];
			next[index] = {
				...next[index],
				type,
				checked: type === "checklist" ? false : undefined,
				collapsed: type === "toggle" ? false : undefined,
				children: type === "toggle" ? next[index].children || [] : undefined,
				emoji: type === "callout" ? "\uD83D\uDCA1" : undefined,
			};
			onChange(next);
		},
		[blocks, onChange, pushHistory],
	);

	const handleUndo = () => {
		const prev = undo(blocks);
		if (prev) onChange(prev);
	};

	const handleRedo = () => {
		const next = redo(blocks);
		if (next) onChange(next);
	};

	const handleTextChange = useCallback(
		(index: number, text: string) => {
			// Markdown shortcuts
			const shortcuts: [string, BlockType, Partial<NoteBlock>?][] = [
				["# ", "heading"],
				["## ", "subheading"],
				["### ", "heading3"],
				["> ", "quote"],
				["- ", "bulleted_list"],
				["* ", "bulleted_list"],
				["1. ", "numbered_list"],
				["[] ", "checklist", { checked: false }],
				["- [] ", "checklist", { checked: false }],
				["``` ", "code"],
				["```", "code"],
			];

			for (const [trigger, type, extras] of shortcuts) {
				if (text === trigger) {
					updateBlock(index, { type, content: "", ...extras });
					return;
				}
			}

			if (text === "---") {
				updateBlock(index, { type: "divider", content: "" });
				addBlockAfter(index);
				return;
			}

			// Slash command trigger
			if (text.startsWith("/")) {
				setActiveBlockIndex(index);
				setSlashFilter(text.slice(1));
				setShowSlashMenu(true);
				return;
			}

			updateBlock(index, { content: text });
		},
		[updateBlock, addBlockAfter],
	);

	const handleSlashSelect = (type: BlockType) => {
		setShowSlashMenu(false);
		setSlashFilter("");
		if (activeBlockIndex >= 0) {
			if (type === "divider") {
				updateBlock(activeBlockIndex, { type: "divider", content: "" });
				addBlockAfter(activeBlockIndex);
			} else if (type === "table") {
				updateBlock(activeBlockIndex, {
					type: "table",
					content: "",
					rows: [["", ""], ["", ""]],
				});
			} else if (type === "column_list") {
				updateBlock(activeBlockIndex, {
					type: "column_list",
					content: "",
					columns: [
						[{ id: crypto.randomUUID(), type: "text", content: "" }],
						[{ id: crypto.randomUUID(), type: "text", content: "" }],
					],
				});
			} else if (type === "image" || type === "bookmark") {
				updateBlock(activeBlockIndex, { type, content: "", url: "" });
			} else {
				updateBlock(activeBlockIndex, {
					type,
					content: "",
					checked: type === "checklist" ? false : undefined,
					collapsed: type === "toggle" ? false : undefined,
					children: type === "toggle" ? [] : undefined,
					emoji: type === "callout" ? "\uD83D\uDCA1" : undefined,
				});
			}
		}
	};

	const handleKeyPress = useCallback(
		(index: number, key: string) => {
			if (key === "Enter") {
				// For lists, continue the list type
				const currentType = blocks[index].type;
				const listTypes: BlockType[] = ["bulleted_list", "numbered_list", "checklist"];
				if (listTypes.includes(currentType) && blocks[index].content === "") {
					// Empty list item → convert to text
					turnInto(index, "text");
				} else {
					addBlockAfter(index, listTypes.includes(currentType) ? currentType : "text");
				}
			} else if (key === "Backspace" && blocks[index].content === "" && blocks.length > 1) {
				removeBlock(index);
				if (index > 0) {
					const prevId = blocks[index - 1].id;
					setTimeout(() => inputRefs.current.get(prevId)?.focus(), 50);
				}
			} else if (key === "Tab") {
				// Indent
				const currentIndent = blocks[index].indent || 0;
				if (currentIndent < 3) {
					updateBlock(index, { indent: currentIndent + 1 });
				}
			}
		},
		[blocks, addBlockAfter, removeBlock, turnInto, updateBlock],
	);

	const handleLongPress = useCallback((index: number) => {
		setActionMenuIndex(index);
	}, []);

	const handleFormatSelect = useCallback(
		(formatType: "bold" | "italic" | "strikethrough" | "code" | "underline") => {
			if (formatBlockIndex < 0) return;
			const block = blocks[formatBlockIndex];
			const content = block.content;
			const wrappers: Record<string, [string, string]> = {
				bold: ["**", "**"],
				italic: ["_", "_"],
				strikethrough: ["~~", "~~"],
				code: ["`", "`"],
				underline: ["__", "__"],
			};
			const [pre, post] = wrappers[formatType];
			// Wrap entire content (simplified — full selection-based formatting needs native module)
			updateBlock(formatBlockIndex, { content: `${pre}${content}${post}` });
			setShowFormatBar(false);
		},
		[blocks, formatBlockIndex, updateBlock],
	);

	// Filter slash menu items
	const filteredTypes = slashFilter
		? BLOCK_TYPES.filter(
				(bt) =>
					bt.label.toLowerCase().includes(slashFilter.toLowerCase()) ||
					bt.description.toLowerCase().includes(slashFilter.toLowerCase()),
			)
		: BLOCK_TYPES;

	const sections = ["basic", "media", "advanced"].filter((s) =>
		filteredTypes.some((bt) => bt.section === s),
	);

	return (
		<View style={styles.container}>
			{/* Undo/Redo + Format Toolbar */}
			{editable && (
				<View style={[styles.toolbar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
					<View style={styles.toolbarGroup}>
						<Pressable
							style={[styles.toolBtn, !canUndo() && styles.toolBtnDisabled]}
							onPress={handleUndo}
							disabled={!canUndo()}
						>
							<Text style={[styles.toolBtnText, { color: canUndo() ? colors.text : colors.textSecondary }]}>
								{"\u21A9"}
							</Text>
						</Pressable>
						<Pressable
							style={[styles.toolBtn, !canRedo() && styles.toolBtnDisabled]}
							onPress={handleRedo}
							disabled={!canRedo()}
						>
							<Text style={[styles.toolBtnText, { color: canRedo() ? colors.text : colors.textSecondary }]}>
								{"\u21AA"}
							</Text>
						</Pressable>
					</View>
					<View style={[styles.toolbarDivider, { backgroundColor: colors.border }]} />
					<View style={styles.toolbarGroup}>
						<Pressable style={styles.toolBtn} onPress={() => { setFormatBlockIndex(activeBlockIndex >= 0 ? activeBlockIndex : 0); handleFormatSelect("bold"); }}>
							<Text style={[styles.toolBtnText, { color: colors.text, fontWeight: "900" }]}>B</Text>
						</Pressable>
						<Pressable style={styles.toolBtn} onPress={() => { setFormatBlockIndex(activeBlockIndex >= 0 ? activeBlockIndex : 0); handleFormatSelect("italic"); }}>
							<Text style={[styles.toolBtnText, { color: colors.text, fontStyle: "italic" }]}>I</Text>
						</Pressable>
						<Pressable style={styles.toolBtn} onPress={() => { setFormatBlockIndex(activeBlockIndex >= 0 ? activeBlockIndex : 0); handleFormatSelect("strikethrough"); }}>
							<Text style={[styles.toolBtnText, { color: colors.text, textDecorationLine: "line-through" }]}>S</Text>
						</Pressable>
						<Pressable style={styles.toolBtn} onPress={() => { setFormatBlockIndex(activeBlockIndex >= 0 ? activeBlockIndex : 0); handleFormatSelect("code"); }}>
							<Text style={[styles.toolBtnCode, { color: colors.text, backgroundColor: colors.background }]}>{"`"}</Text>
						</Pressable>
					</View>
				</View>
			)}

			{/* Block List */}
			<FlatList
				data={blocks.length > 0 ? blocks : [newBlock()]}
				keyExtractor={(item) => item.id}
				renderItem={({ item, index }) => (
					<Animated.View layout={Layout.springify()}>
						<BlockRow
							block={item}
							index={index}
							totalBlocks={blocks.length}
							colors={colors}
							editable={editable}
							inputRef={(ref) => {
								if (ref) inputRefs.current.set(item.id, ref);
								else inputRefs.current.delete(item.id);
							}}
							onChangeText={(text) => handleTextChange(index, text)}
							onKeyPress={(key) => handleKeyPress(index, key)}
							onToggleCheck={() => updateBlock(index, { checked: !item.checked })}
							onToggleCollapse={() => updateBlock(index, { collapsed: !item.collapsed })}
							onLongPress={() => handleLongPress(index)}
							onFocus={() => setActiveBlockIndex(index)}
							onMoveUp={() => moveBlock(index, index - 1)}
							onMoveDown={() => moveBlock(index, index + 1)}
							onUpdateCell={(row, col, val) => {
								if (!item.rows) return;
								const newRows = item.rows.map((r) => [...r]);
								newRows[row][col] = val;
								updateBlock(index, { rows: newRows });
							}}
							onAddTableRow={() => {
								if (!item.rows) return;
								const cols = item.rows[0]?.length || 2;
								updateBlock(index, { rows: [...item.rows, Array(cols).fill("")] });
							}}
							onAddTableCol={() => {
								if (!item.rows) return;
								updateBlock(index, { rows: item.rows.map((r) => [...r, ""]) });
							}}
							onUrlChange={(url) => updateBlock(index, { url })}
							onCaptionChange={(caption) => updateBlock(index, { caption })}
						/>
					</Animated.View>
				)}
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

			{/* ─── Slash Command Menu ─── */}
			<Modal
				visible={showSlashMenu}
				transparent
				animationType="fade"
				onRequestClose={() => { setShowSlashMenu(false); setSlashFilter(""); }}
			>
				<Pressable style={styles.overlay} onPress={() => { setShowSlashMenu(false); setSlashFilter(""); }}>
					<View
						style={[styles.slashMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}
					>
						{/* Search within slash menu */}
						<TextInput
							style={[styles.slashSearch, { color: colors.text, borderBottomColor: colors.border }]}
							placeholder="Filter..."
							placeholderTextColor={colors.textSecondary}
							value={slashFilter}
							onChangeText={setSlashFilter}
							autoFocus
						/>

						<ScrollView style={{ maxHeight: 320 }}>
							{sections.map((section) => (
								<View key={section}>
									<Text style={[styles.slashSectionLabel, { color: colors.textSecondary }]}>
										{SECTION_LABELS[section]}
									</Text>
									{filteredTypes
										.filter((bt) => bt.section === section)
										.map((bt) => (
											<Pressable
												key={bt.type}
												style={[styles.slashItem, { borderBottomColor: colors.border }]}
												onPress={() => handleSlashSelect(bt.type)}
											>
												<View style={[styles.slashIcon, { backgroundColor: colors.background }]}>
													<Text style={[styles.slashIconText, { color: colors.text }]}>{bt.icon}</Text>
												</View>
												<View style={{ flex: 1 }}>
													<Text style={[styles.slashLabel, { color: colors.text }]}>{bt.label}</Text>
													<Text style={[styles.slashDesc, { color: colors.textSecondary }]}>
														{bt.description}
													</Text>
												</View>
												{bt.shortcut && (
													<Text style={[styles.slashShortcut, { color: colors.textSecondary }]}>
														{bt.shortcut}
													</Text>
												)}
											</Pressable>
										))}
								</View>
							))}
							{filteredTypes.length === 0 && (
								<Text style={[styles.slashEmpty, { color: colors.textSecondary }]}>
									No matching blocks
								</Text>
							)}
						</ScrollView>
					</View>
				</Pressable>
			</Modal>

			{/* ─── Block Action Menu ─── */}
			<Modal
				visible={actionMenuIndex >= 0}
				transparent
				animationType="fade"
				onRequestClose={() => setActionMenuIndex(-1)}
			>
				<Pressable style={styles.overlay} onPress={() => setActionMenuIndex(-1)}>
					<Animated.View
						entering={FadeInDown.duration(150)}
						style={[styles.actionMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}
					>
						<Text style={[styles.actionTitle, { color: colors.textSecondary }]}>Block Actions</Text>

						<Pressable style={styles.actionItem} onPress={() => { removeBlock(actionMenuIndex); setActionMenuIndex(-1); }}>
							<Text style={[styles.actionIcon, { color: colors.danger }]}>{"\uD83D\uDDD1"}</Text>
							<Text style={[styles.actionLabel, { color: colors.text }]}>Delete</Text>
						</Pressable>

						<Pressable style={styles.actionItem} onPress={() => { duplicateBlock(actionMenuIndex); setActionMenuIndex(-1); }}>
							<Text style={styles.actionIcon}>{"\uD83D\uDCCB"}</Text>
							<Text style={[styles.actionLabel, { color: colors.text }]}>Duplicate</Text>
						</Pressable>

						{actionMenuIndex > 0 && (
							<Pressable style={styles.actionItem} onPress={() => { moveBlock(actionMenuIndex, actionMenuIndex - 1); setActionMenuIndex(-1); }}>
								<Text style={styles.actionIcon}>{"\u2B06"}</Text>
								<Text style={[styles.actionLabel, { color: colors.text }]}>Move Up</Text>
							</Pressable>
						)}

						{actionMenuIndex < blocks.length - 1 && (
							<Pressable style={styles.actionItem} onPress={() => { moveBlock(actionMenuIndex, actionMenuIndex + 1); setActionMenuIndex(-1); }}>
								<Text style={styles.actionIcon}>{"\u2B07"}</Text>
								<Text style={[styles.actionLabel, { color: colors.text }]}>Move Down</Text>
							</Pressable>
						)}

						{/* Turn Into */}
						<Text style={[styles.actionSectionLabel, { color: colors.textSecondary }]}>Turn Into</Text>
						<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.turnIntoRow}>
							{BLOCK_TYPES.filter((bt) => bt.section === "basic" && bt.type !== "divider").map((bt) => (
								<Pressable
									key={bt.type}
									style={[
										styles.turnIntoChip,
										{
											backgroundColor:
												actionMenuIndex >= 0 && blocks[actionMenuIndex]?.type === bt.type
													? colors.tint + "20"
													: colors.background,
											borderColor:
												actionMenuIndex >= 0 && blocks[actionMenuIndex]?.type === bt.type
													? colors.tint
													: colors.border,
										},
									]}
									onPress={() => { turnInto(actionMenuIndex, bt.type); setActionMenuIndex(-1); }}
								>
									<Text style={[styles.turnIntoIcon, { color: colors.text }]}>{bt.icon}</Text>
									<Text style={[styles.turnIntoLabel, { color: colors.text }]}>{bt.label}</Text>
								</Pressable>
							))}
						</ScrollView>
					</Animated.View>
				</Pressable>
			</Modal>
		</View>
	);
}

// ─── Block Row Renderer ───

interface BlockRowProps {
	block: NoteBlock;
	index: number;
	totalBlocks: number;
	colors: (typeof Colors)["light"];
	editable: boolean;
	inputRef: (ref: TextInput | null) => void;
	onChangeText: (text: string) => void;
	onKeyPress: (key: string) => void;
	onToggleCheck: () => void;
	onToggleCollapse: () => void;
	onLongPress: () => void;
	onFocus: () => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onUpdateCell?: (row: number, col: number, val: string) => void;
	onAddTableRow?: () => void;
	onAddTableCol?: () => void;
	onUrlChange?: (url: string) => void;
	onCaptionChange?: (caption: string) => void;
}

function BlockRow({
	block,
	index,
	totalBlocks,
	colors,
	editable,
	inputRef,
	onChangeText,
	onKeyPress,
	onToggleCheck,
	onToggleCollapse,
	onLongPress,
	onFocus,
	onMoveUp,
	onMoveDown,
	onUpdateCell,
	onAddTableRow,
	onAddTableCol,
	onUrlChange,
	onCaptionChange,
}: BlockRowProps) {
	const indent = block.indent || 0;
	const indentPad = indent * 24;

	// ─── Divider ───
	if (block.type === "divider") {
		return (
			<Pressable onLongPress={onLongPress}>
				<View style={[styles.divider, { backgroundColor: colors.border, marginLeft: 20 + indentPad }]} />
			</Pressable>
		);
	}

	// ─── Table ───
	if (block.type === "table" && block.rows) {
		return (
			<Pressable onLongPress={onLongPress} style={[styles.tableContainer, { marginLeft: 20 + indentPad }]}>
				<ScrollView horizontal showsHorizontalScrollIndicator={false}>
					<View>
						{block.rows.map((row, ri) => (
							<View key={`row-${ri}`} style={[styles.tableRow, ri === 0 && { backgroundColor: colors.tint + "08" }]}>
								{row.map((cell, ci) => (
									<TextInput
										key={`cell-${ri}-${ci}`}
										style={[
											styles.tableCell,
											{
												borderColor: colors.border,
												color: colors.text,
												fontWeight: ri === 0 ? "700" : "400",
											},
										]}
										value={cell}
										onChangeText={(val) => onUpdateCell?.(ri, ci, val)}
										placeholder={ri === 0 ? "Header" : ""}
										placeholderTextColor={colors.textSecondary}
										editable={editable}
									/>
								))}
							</View>
						))}
						{editable && (
							<View style={styles.tableActions}>
								<Pressable
									style={[styles.tableAddBtn, { borderColor: colors.border }]}
									onPress={onAddTableRow}
								>
									<Text style={[styles.tableAddText, { color: colors.textSecondary }]}>+ Row</Text>
								</Pressable>
								<Pressable
									style={[styles.tableAddBtn, { borderColor: colors.border }]}
									onPress={onAddTableCol}
								>
									<Text style={[styles.tableAddText, { color: colors.textSecondary }]}>+ Col</Text>
								</Pressable>
							</View>
						)}
					</View>
				</ScrollView>
			</Pressable>
		);
	}

	// ─── Image Block ───
	if (block.type === "image") {
		return (
			<Pressable onLongPress={onLongPress} style={[styles.mediaBlock, { marginLeft: 20 + indentPad }]}>
				{block.url ? (
					<View style={[styles.imagePreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
						<Text style={[styles.imageUrl, { color: colors.tint }]} numberOfLines={1}>
							{block.url}
						</Text>
					</View>
				) : null}
				{editable && (
					<TextInput
						ref={inputRef}
						style={[styles.urlInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
						value={block.url || ""}
						onChangeText={(url) => onUrlChange?.(url)}
						placeholder="Paste image URL..."
						placeholderTextColor={colors.textSecondary}
						onFocus={onFocus}
					/>
				)}
				{editable && (
					<TextInput
						style={[styles.captionInput, { color: colors.textSecondary }]}
						value={block.caption || ""}
						onChangeText={(caption) => onCaptionChange?.(caption)}
						placeholder="Add caption..."
						placeholderTextColor={colors.textSecondary}
					/>
				)}
			</Pressable>
		);
	}

	// ─── Bookmark Block ───
	if (block.type === "bookmark") {
		return (
			<Pressable onLongPress={onLongPress} style={[styles.mediaBlock, { marginLeft: 20 + indentPad }]}>
				<View style={[styles.bookmarkBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
					<Text style={styles.bookmarkIcon}>{"\uD83D\uDD17"}</Text>
					{editable ? (
						<TextInput
							ref={inputRef}
							style={[styles.bookmarkUrl, { color: colors.tint }]}
							value={block.url || ""}
							onChangeText={(url) => onUrlChange?.(url)}
							placeholder="Paste URL..."
							placeholderTextColor={colors.textSecondary}
							onFocus={onFocus}
						/>
					) : (
						<Text style={[styles.bookmarkUrl, { color: colors.tint }]}>{block.url || ""}</Text>
					)}
				</View>
				{block.caption ? (
					<Text style={[styles.bookmarkCaption, { color: colors.textSecondary }]}>{block.caption}</Text>
				) : null}
			</Pressable>
		);
	}

	// ─── Column List ───
	if (block.type === "column_list" && block.columns) {
		return (
			<Pressable onLongPress={onLongPress} style={[styles.columnContainer, { marginHorizontal: 20 + indentPad }]}>
				{block.columns.map((col, ci) => (
					<View
						key={`col-${ci}`}
						style={[
							styles.column,
							{
								borderColor: colors.border,
								borderRightWidth: ci < block.columns!.length - 1 ? 1 : 0,
							},
						]}
					>
						<Text style={[styles.colLabel, { color: colors.textSecondary }]}>Col {ci + 1}</Text>
						{/* Simplified column content - shows text placeholders */}
						{col.length === 0 ? (
							<Text style={[styles.colEmpty, { color: colors.textSecondary }]}>Empty</Text>
						) : (
							col.map((innerBlock) => (
								<Text key={innerBlock.id} style={[styles.colBlockText, { color: colors.text }]}>
									{innerBlock.content || "(empty)"}
								</Text>
							))
						)}
					</View>
				))}
			</Pressable>
		);
	}

	// ─── Toggle Block ───
	if (block.type === "toggle") {
		return (
			<Pressable onLongPress={onLongPress}>
				<View style={[styles.blockRow, { paddingLeft: 20 + indentPad }]}>
					<Pressable onPress={onToggleCollapse} style={styles.toggleArrow}>
						<Text style={[styles.toggleIcon, { color: colors.textSecondary }]}>
							{block.collapsed ? "\u25B6" : "\u25BC"}
						</Text>
					</Pressable>
					<TextInput
						ref={inputRef}
						style={[styles.blockInput, { fontSize: 15, lineHeight: 22, color: colors.text, fontWeight: "600" }]}
						value={block.content}
						onChangeText={onChangeText}
						onKeyPress={(e) => onKeyPress(e.nativeEvent.key)}
						multiline
						editable={editable}
						placeholder="Toggle heading..."
						placeholderTextColor={colors.textSecondary}
						blurOnSubmit={false}
						onFocus={onFocus}
					/>
				</View>
				{!block.collapsed && block.children && block.children.length > 0 && (
					<View style={[styles.toggleContent, { borderLeftColor: colors.border, marginLeft: 32 + indentPad }]}>
						{block.children.map((child) => (
							<Text key={child.id} style={[styles.toggleChildText, { color: colors.text }]}>
								{child.content || "(empty)"}
							</Text>
						))}
					</View>
				)}
				{!block.collapsed && (!block.children || block.children.length === 0) && (
					<View style={[styles.toggleContent, { borderLeftColor: colors.border, marginLeft: 32 + indentPad }]}>
						<Text style={[styles.toggleChildText, { color: colors.textSecondary, fontStyle: "italic" }]}>
							Empty toggle. Nested content will be added in a future update.
						</Text>
					</View>
				)}
			</Pressable>
		);
	}

	// ─── Standard Text Blocks ───
	const blockStyle = getBlockStyle(block.type, colors);

	return (
		<Pressable onLongPress={onLongPress}>
			<View
				style={[
					styles.blockRow,
					{ paddingLeft: 20 + indentPad },
					block.type === "callout" && {
						...styles.calloutBox,
						backgroundColor: colors.tint + "08",
						borderColor: colors.tint + "20",
					},
					block.bgColor ? { backgroundColor: block.bgColor } : undefined,
				]}
			>
				{/* Block prefix icons */}
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
							{block.checked && <Text style={styles.checkmark}>{"\u2713"}</Text>}
						</View>
					</Pressable>
				)}

				{block.type === "bulleted_list" && (
					<Text style={[styles.bulletIcon, { color: colors.textSecondary }]}>{"\u2022"}</Text>
				)}

				{block.type === "numbered_list" && (
					<Text style={[styles.numberIcon, { color: colors.textSecondary }]}>
						{index + 1}.
					</Text>
				)}

				{block.type === "quote" && (
					<View style={[styles.quoteLine, { backgroundColor: colors.tint }]} />
				)}

				{block.type === "callout" && (
					<Text style={styles.calloutIcon}>{block.emoji || "\uD83D\uDCA1"}</Text>
				)}

				<TextInput
					ref={inputRef}
					style={[
						styles.blockInput,
						blockStyle,
						{ color: block.color || colors.text },
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
					onFocus={onFocus}
				/>
			</View>
		</Pressable>
	);
}

// ─── Style Helpers ───

function getBlockStyle(type: BlockType, _colors: (typeof Colors)["light"]) {
	switch (type) {
		case "heading":
			return { fontSize: 24, fontWeight: "800" as const, lineHeight: 32 };
		case "subheading":
			return { fontSize: 18, fontWeight: "700" as const, lineHeight: 26 };
		case "heading3":
			return { fontSize: 16, fontWeight: "700" as const, lineHeight: 24 };
		case "code":
			return { fontSize: 13, lineHeight: 20 };
		case "quote":
			return { fontSize: 15, fontStyle: "italic" as const, lineHeight: 22 };
		default:
			return { fontSize: 15, lineHeight: 22 };
	}
}

function getPlaceholder(type: BlockType): string {
	switch (type) {
		case "heading":
			return "Heading 1";
		case "subheading":
			return "Heading 2";
		case "heading3":
			return "Heading 3";
		case "code":
			return "Code...";
		case "quote":
			return "Quote...";
		case "checklist":
			return "To-do";
		case "callout":
			return "Callout...";
		case "bulleted_list":
		case "numbered_list":
			return "List item";
		case "toggle":
			return "Toggle";
		default:
			return "Type / for commands...";
	}
}

// ─── Styles ───

const styles = StyleSheet.create({
	container: { flex: 1 },
	list: { paddingBottom: 40 },

	// Toolbar
	toolbar: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderBottomWidth: 1,
		gap: 2,
	},
	toolbarGroup: { flexDirection: "row", gap: 2 },
	toolbarDivider: { width: 1, height: 20, marginHorizontal: 6 },
	toolBtn: {
		width: 36,
		height: 32,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 4,
	},
	toolBtnDisabled: { opacity: 0.3 },
	toolBtnText: { fontSize: 16 },
	toolBtnCode: { fontSize: 14, fontFamily: "SpaceMono", paddingHorizontal: 4, borderRadius: 2 },

	// Block rows
	blockRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		paddingRight: 20,
		minHeight: 36,
	},
	blockInput: {
		flex: 1,
		paddingVertical: 4,
	},

	// Checklist
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

	// Lists
	bulletIcon: { fontSize: 18, marginRight: 8, marginTop: 2, width: 16, textAlign: "center" },
	numberIcon: { fontSize: 14, fontWeight: "500", marginRight: 8, marginTop: 5, width: 22, textAlign: "right" },

	// Quote
	quoteLine: {
		width: 3,
		borderRadius: 2,
		marginRight: 12,
		marginTop: 4,
		minHeight: 20,
		alignSelf: "stretch",
	},

	// Callout
	calloutBox: {
		borderWidth: 1,
		borderRadius: 8,
		marginHorizontal: 16,
		marginVertical: 4,
		padding: 8,
	},
	calloutIcon: { fontSize: 16, marginRight: 8, marginTop: 4 },

	// Toggle
	toggleArrow: { paddingTop: 6, paddingRight: 8, width: 28 },
	toggleIcon: { fontSize: 12 },
	toggleContent: {
		borderLeftWidth: 2,
		paddingLeft: 12,
		paddingVertical: 4,
		marginBottom: 4,
	},
	toggleChildText: { fontSize: 14, lineHeight: 20, paddingVertical: 2 },

	// Divider
	divider: { height: 1, marginVertical: 12, marginRight: 20 },

	// Table
	tableContainer: { marginRight: 20, marginVertical: 8 },
	tableRow: { flexDirection: "row" },
	tableCell: {
		width: 120,
		minHeight: 36,
		borderWidth: 1,
		paddingHorizontal: 8,
		paddingVertical: 6,
		fontSize: 13,
	},
	tableActions: { flexDirection: "row", gap: 8, marginTop: 6 },
	tableAddBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, borderWidth: 1 },
	tableAddText: { fontSize: 12 },

	// Image
	mediaBlock: { marginRight: 20, marginVertical: 8 },
	imagePreview: {
		height: 120,
		borderRadius: 8,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 6,
	},
	imageUrl: { fontSize: 12 },
	urlInput: {
		height: 36,
		borderRadius: 6,
		borderWidth: 1,
		paddingHorizontal: 10,
		fontSize: 13,
		marginBottom: 4,
	},
	captionInput: { fontSize: 12, fontStyle: "italic", paddingVertical: 2 },

	// Bookmark
	bookmarkBox: {
		flexDirection: "row",
		alignItems: "center",
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		gap: 8,
	},
	bookmarkIcon: { fontSize: 16 },
	bookmarkUrl: { flex: 1, fontSize: 13 },
	bookmarkCaption: { fontSize: 12, marginTop: 4, paddingLeft: 4 },

	// Columns
	columnContainer: {
		flexDirection: "row",
		marginVertical: 8,
	},
	column: {
		flex: 1,
		paddingHorizontal: 8,
		minHeight: 60,
	},
	colLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
	colEmpty: { fontSize: 13, fontStyle: "italic" },
	colBlockText: { fontSize: 14, lineHeight: 20, paddingVertical: 2 },

	// Add block
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

	// Slash menu
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.3)",
		justifyContent: "center",
		alignItems: "center",
	},
	slashMenu: {
		width: 300,
		borderRadius: 12,
		borderWidth: 1,
		overflow: "hidden",
	},
	slashSearch: {
		height: 40,
		paddingHorizontal: 14,
		fontSize: 14,
		borderBottomWidth: 1,
	},
	slashSectionLabel: {
		fontSize: 11,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		paddingHorizontal: 14,
		paddingTop: 10,
		paddingBottom: 4,
	},
	slashItem: {
		flexDirection: "row",
		alignItems: "center",
		padding: 10,
		paddingHorizontal: 14,
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
	slashShortcut: { fontSize: 11, fontFamily: "SpaceMono" },
	slashEmpty: { textAlign: "center", padding: 20, fontSize: 13 },

	// Action menu
	actionMenu: {
		width: 300,
		borderRadius: 12,
		borderWidth: 1,
		padding: 12,
	},
	actionTitle: {
		fontSize: 11,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 8,
	},
	actionItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingVertical: 10,
	},
	actionIcon: { fontSize: 16, width: 24, textAlign: "center" },
	actionLabel: { fontSize: 15, fontWeight: "500" },
	actionSectionLabel: {
		fontSize: 11,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginTop: 12,
		marginBottom: 6,
	},
	turnIntoRow: {
		flexDirection: "row",
		marginBottom: 4,
	},
	turnIntoChip: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 6,
		borderWidth: 1,
		marginRight: 6,
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	turnIntoIcon: { fontSize: 12 },
	turnIntoLabel: { fontSize: 12, fontWeight: "500" },
});
