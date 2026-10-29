"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { errMsg } from "./hooks";
import RichTextEditor from "./RichTextEditor";
import { useToast } from "./Toast";
import { Button, Card, Field, Input, Select, Spinner, Toggle } from "./ui";
import { FileUploader, ImageUploader } from "./Uploader";
import { ApiError } from "@/lib/api";
import type { Lang, MenuItem, Page } from "@/lib/types";
import { slugify } from "@/lib/utils";

interface FormState {
  lang: Lang;
  parent_id: number;
  title: string;
  full_title: string;
  slug: string;
  content: string;
  image: string | null;
  video: string | null;
  external_url: string;
  sort: number;
  is_active: boolean;
  show_in_menu: boolean;
}

export default function PageForm({ id, initialParent, initialLang }: { id?: number; initialParent?: number; initialLang?: Lang }) {
  const { get, send } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ lang: initialLang || "tm", parent_id: initialParent || 0, title: "", full_title: "", slug: "", content: "", image: null, video: null, external_url: "", sort: 0, is_active: true, show_in_menu: true });
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loaded, setLoaded] = useState(!id);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(!!id);

  useEffect(() => {
    get<MenuItem[]>("/admin/menus").then(setMenus).catch(() => {});
    if (!id) return;
    get<Page>(`/admin/menus/${id}`)
      .then((p) => {
        setForm({ lang: p.lang, parent_id: p.parent_id ?? 0, title: p.title, full_title: p.full_title, slug: p.slug, content: p.content, image: p.image, video: p.video, external_url: p.external_url ?? "", sort: p.sort, is_active: p.is_active, show_in_menu: p.show_in_menu });
        setLoaded(true);
      })
      .catch((e) => toast.error(errMsg(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const parentOptions = menus.filter((m) => m.lang === form.lang && m.depth < 3 && m.id !== id);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const body = { ...form, parent_id: form.parent_id || 0, slug: form.slug || slugify(form.title), external_url: form.external_url || null };
    try {
      const saved = id ? await send<Page>("PUT", `/admin/menus/${id}`, body) : await send<Page>("POST", "/admin/menus", body);
      toast.success(id ? "Sahypa täzelendi" : "Sahypa döredildi");
      if (!id) router.replace(`/admin/pages/${saved.id}`);
      else setForm((f) => ({ ...f, slug: saved.slug }));
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields ?? {});
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <Spinner />;

  return (
    <form onSubmit={save} className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Menýudaky ady" error={errors.title}>
                <Input value={form.title} onChange={(e) => { set("title", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} required />
              </Field>
              <Field label="Doly ady (sahypa sözbaşysy)">
                <Input value={form.full_title} onChange={(e) => set("full_title", e.target.value)} placeholder={form.title} />
              </Field>
            </div>
            <Field label="Slug (URL)" error={errors.slug}>
              <Input value={form.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} />
            </Field>
            <Field label="Daşky salgy (URL)" hint="Doldurylsa menýu şu salga açylýar (mysal: Moodle)">
              <Input value={form.external_url} onChange={(e) => set("external_url", e.target.value)} placeholder="https://" />
            </Field>
            <div>
              <span className="mb-1.5 block text-sm font-semibold text-ink">Mazmun</span>
              <RichTextEditor value={form.content} onChange={(html) => set("content", html)} folder="docs" />
            </div>
          </div>
        </Card>
      </div>
      <div className="space-y-6">
        <Card title="Ýerleşişi">
          <div className="space-y-4">
            <Field label="Dil">
              <Select value={form.lang} onChange={(e) => { set("lang", e.target.value as Lang); set("parent_id", 0); }}>
                <option value="tm">Türkmençe</option><option value="en">English</option><option value="ru">Русский</option>
              </Select>
            </Field>
            <Field label="Ene menýu">
              <Select value={form.parent_id} onChange={(e) => set("parent_id", Number(e.target.value))}>
                <option value={0}>— Ýokarky menýu —</option>
                {parentOptions.map((m) => <option key={m.id} value={m.id}>{"— ".repeat(m.depth - 1)}{m.title}</option>)}
              </Select>
            </Field>
            <Field label="Tertip belgisi">
              <Input type="number" value={form.sort} onChange={(e) => set("sort", Number(e.target.value))} />
            </Field>
            <Toggle checked={form.is_active} onChange={(v) => set("is_active", v)} label="Işjeň" />
            <Toggle checked={form.show_in_menu} onChange={(v) => set("show_in_menu", v)} label="Menýuda görkez" />
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" loading={busy}><Save size={16} /> Ýatda sakla</Button>
              <Link href="/admin/pages"><Button type="button" variant="secondary"><ArrowLeft size={16} /> Yza</Button></Link>
            </div>
          </div>
        </Card>
        <Card title="Media">
          <div className="space-y-5">
            <ImageUploader value={form.image} onChange={(p) => set("image", p)} folder="docs" label="Surat" />
            <FileUploader value={form.video} onChange={(p) => set("video", p)} folder="wideo_menu" kind="video" label="Wideo (MP4)" accept="video/mp4,video/webm" />
          </div>
        </Card>
      </div>
    </form>
  );
}
