"use client";

import { useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import {
  Bold, Code, Heading2, Heading3, Image as ImageIcon, Italic, Link2, List, ListOrdered, Minus, Quote, Redo, Strikethrough, Undo, Unlink,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useToast } from "./Toast";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (html: string) => void;
  folder?: string;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, folder = "docs" }: Props) {
  const { upload } = useAuth();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } } }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: "prose-legacy tiptap" } },
  });

  if (!editor) return <div className="h-[380px] animate-pulse rounded-xl bg-surface-2" />;

  const btn = (active: boolean) => cn("rounded-lg p-2 text-ink-muted transition hover:bg-brand-500/10 hover:text-brand-700 dark:hover:text-brand-300", active && "bg-brand-500/15 text-brand-800 dark:text-brand-200");

  function setLink() {
    const prev = editor?.getAttributes("link").href as string | undefined;
    const url = window.prompt("Salgy (URL):", prev || "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor?.chain().focus().unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const m = await upload(f, "image", folder);
      editor?.chain().focus().setImage({ src: m.url, alt: f.name }).run();
      toast.success("Surat goşuldy");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ýükläp bolmady");
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/25">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface-2 px-2 py-1.5">
        <button type="button" title="Galyň" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></button>
        <button type="button" title="Kursiw" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></button>
        <button type="button" title="Çyzylan" className={btn(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()}><Strittle /></button>
        <span className="mx-1 h-5 w-px bg-line" />
        <button type="button" title="Sözbaşy 2" className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></button>
        <button type="button" title="Sözbaşy 3" className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={16} /></button>
        <button type="button" title="Sanaw" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></button>
        <button type="button" title="Sanly sanaw" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></button>
        <button type="button" title="Sitata" className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={16} /></button>
        <button type="button" title="Kod" className={btn(editor.isActive("codeBlock"))} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code size={16} /></button>
        <button type="button" title="Çyzyk" className={btn(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={16} /></button>
        <span className="mx-1 h-5 w-px bg-line" />
        <button type="button" title="Salgy" className={btn(editor.isActive("link"))} onClick={setLink}><Link2 size={16} /></button>
        <button type="button" title="Salgyny aýyr" className={btn(false)} disabled={!editor.isActive("link")} onClick={() => editor.chain().focus().unsetLink().run()}><Unlink size={16} /></button>
        <button type="button" title="Surat" className={btn(false)} onClick={() => fileRef.current?.click()}><ImageIcon size={16} /></button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
        <span className="mx-1 h-5 w-px bg-line" />
        <button type="button" title="Yza" className={btn(false)} onClick={() => editor.chain().focus().undo().run()}><Undo size={16} /></button>
        <button type="button" title="Öňe" className={btn(false)} onClick={() => editor.chain().focus().redo().run()}><Redo size={16} /></button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function Strittle() {
  return <Strikethrough size={16} />;
}
