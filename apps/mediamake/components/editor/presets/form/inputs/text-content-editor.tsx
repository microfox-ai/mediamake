"use client";

import { useEffect, useState } from "react";
import { Extension, Mark, mergeAttributes } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Strikethrough, Underline as UnderlineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { ColorInput, ColorSwatch } from "./color-input";
import {
    htmlToPlainText,
    isHtmlText,
    serializeRichTextHtml,
    toEditorHtml,
} from "./text-content";

type Mode = "text" | "html";

const EnterAsHardBreak = Extension.create({
    name: "enterAsHardBreak",
    addKeyboardShortcuts() {
        return {
            Enter: () => this.editor.commands.setHardBreak(),
            "Shift-Enter": () => this.editor.commands.setHardBreak(),
        };
    },
});

/** Keeps pasted `<span style="…">` (color, etc.) instead of stripping them. */
const InlineSpan = Mark.create({
    name: "inlineSpan",
    spanning: true,
    inclusive: false,
    addAttributes() {
        return {
            style: {
                default: null,
                parseHTML: (element) => element.getAttribute("style"),
                renderHTML: (attributes) => (attributes.style ? { style: attributes.style } : {}),
            },
            class: {
                default: null,
                parseHTML: (element) => element.getAttribute("class"),
                renderHTML: (attributes) => (attributes.class ? { class: attributes.class } : {}),
            },
        };
    },
    parseHTML() {
        return [{ tag: "span" }];
    },
    renderHTML({ HTMLAttributes }) {
        return ["span", mergeAttributes(HTMLAttributes), 0];
    },
});

function spanColor(style: unknown): string {
    if (typeof style !== "string") return "";
    const match = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
    return match?.[1]?.trim() ?? "";
}

function withColor(style: unknown, color: string): string | undefined {
    const rest = typeof style === "string"
        ? style.replace(/(?:^|;)\s*color\s*:\s*[^;]*/gi, "").replace(/^;|;$/g, "").trim()
        : "";
    if (!color) return rest || undefined;
    return rest ? `color: ${color}; ${rest}` : `color: ${color}`;
}

function RichTextEditor({
    value,
    onChange,
    placeholder,
    disabled,
    rows,
}: {
    value: string;
    onChange: (next: string) => void;
    placeholder?: string;
    disabled?: boolean;
    rows: number;
}) {
    const editor = useEditor({
        immediatelyRender: false,
        shouldRerenderOnTransaction: true,
        extensions: [
            StarterKit.configure({
                heading: false,
                bulletList: false,
                orderedList: false,
                listItem: false,
                listKeymap: false,
                blockquote: false,
                codeBlock: false,
                code: false,
                horizontalRule: false,
                link: false,
                trailingNode: false,
            }),
            InlineSpan,
            EnterAsHardBreak,
        ],
        content: toEditorHtml(value),
        editable: !disabled,
        parseOptions: { preserveWhitespace: "full" },
        editorProps: {
            attributes: {
                class: cn(
                    "text-sm leading-snug text-foreground focus:outline-none",
                    "whitespace-break-spaces break-words",
                    "px-2.5 py-1.5 min-h-[4.5rem]",
                    "[&_p]:m-0 [&_p]:whitespace-break-spaces",
                ),
                style: "white-space: break-spaces;",
            },
        },
        onUpdate: ({ editor: ed }) => {
            onChange(serializeRichTextHtml(ed.getHTML()));
        },
    });

    useEffect(() => {
        if (!editor) return;
        const next = serializeRichTextHtml(toEditorHtml(value));
        const current = serializeRichTextHtml(editor.getHTML());
        if (next !== current) {
            editor.commands.setContent(toEditorHtml(value), {
                emitUpdate: false,
                parseOptions: { preserveWhitespace: "full" },
            });
        }
    }, [value, editor]);

    useEffect(() => {
        if (!editor) return;
        editor.setEditable(!disabled);
    }, [disabled, editor]);

    if (!editor) return null;

    const color = spanColor(editor.getAttributes("inlineSpan").style);

    return (
        <div className="overflow-hidden rounded-md border border-input bg-transparent">
            <div className="flex items-center gap-0.5 border-b border-input bg-muted/40 px-0.5 py-0.5">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className={cn("h-6 w-6 p-0", editor.isActive("bold") && "bg-accent text-accent-foreground")}
                    title="Bold"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                >
                    <Bold className="h-3 w-3" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className={cn("h-6 w-6 p-0", editor.isActive("italic") && "bg-accent text-accent-foreground")}
                    title="Italic"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                    <Italic className="h-3 w-3" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className={cn("h-6 w-6 p-0", editor.isActive("underline") && "bg-accent text-accent-foreground")}
                    title="Underline"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                    <UnderlineIcon className="h-3 w-3" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className={cn("h-6 w-6 p-0", editor.isActive("strike") && "bg-accent text-accent-foreground")}
                    title="Strikethrough"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                >
                    <Strikethrough className="h-3 w-3" />
                </Button>
                <Popover>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            disabled={disabled}
                            title="Text color"
                            className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-sm hover:bg-accent disabled:opacity-50"
                        >
                            <ColorSwatch
                                color={color || "currentColor"}
                                className="h-3.5 w-3.5 rounded-sm"
                            />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent side="left" align="start" className="w-[268px] p-3" onOpenAutoFocus={(event) => event.preventDefault()}>
                        <ColorInput
                            embedded
                            allowAlpha
                            value={color || "#ffffff"}
                            onChange={(next) => {
                                const style = withColor(editor.getAttributes("inlineSpan").style, next);
                                if (!style) editor.chain().focus().unsetMark("inlineSpan").run();
                                else editor.chain().focus().setMark("inlineSpan", { style }).run();
                            }}
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="overflow-y-auto" style={{ minHeight: `${Math.max(rows, 3)}lh` }}>
                <EditorContent editor={editor} />
            </div>
            {!value && placeholder ? (
                <span className="sr-only">{placeholder}</span>
            ) : null}
        </div>
    );
}

/**
 * Text field with a Simple / HTML toggle. Default is plain text.
 * Spaces and line breaks are preserved in both modes.
 */
export function TextContentEditor({
    value,
    onChange,
    placeholder,
    disabled,
    rows = 5,
    className,
}: {
    value: string;
    onChange: (next: string) => void;
    placeholder?: string;
    disabled?: boolean;
    rows?: number;
    className?: string;
}) {
    const [mode, setMode] = useState<Mode>(() => (isHtmlText(value) ? "html" : "text"));

    useEffect(() => {
        if (isHtmlText(value)) setMode("html");
    }, [value]);

    const setSimple = () => {
        if (mode === "html" && isHtmlText(value)) onChange(htmlToPlainText(value));
        setMode("text");
    };

    return (
        <div className={cn("space-y-1.5 text-sm", className)}>
            <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={mode}
                onValueChange={(next) => {
                    if (next === "html") setMode("html");
                    else if (next === "text") setSimple();
                }}
                className="w-fit"
            >
                <ToggleGroupItem value="text" className="h-6 px-2 text-sm" disabled={disabled}>
                    Text
                </ToggleGroupItem>
                <ToggleGroupItem value="html" className="h-6 px-2 text-sm" disabled={disabled}>
                    HTML
                </ToggleGroupItem>
            </ToggleGroup>
            {mode === "html" ? (
                <RichTextEditor
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={rows}
                />
            ) : (
                <Textarea
                    value={value}
                    disabled={disabled}
                    placeholder={placeholder}
                    rows={rows}
                    spellCheck={false}
                    className="min-h-16 resize-y overflow-y-auto whitespace-break-spaces text-sm [tab-size:4]"
                    style={{ whiteSpace: "break-spaces" }}
                    onChange={(event) => onChange(event.target.value)}
                />
            )}
        </div>
    );
}
