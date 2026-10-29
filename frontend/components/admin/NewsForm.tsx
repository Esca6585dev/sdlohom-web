"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { errMsg } from "./hooks";
import RichTextEditor from "./RichTextEditor";
import { useToast } from "./Toast";
import { Button, Card, Field, Input, Select, Spinner, Textarea, Toggle } from "./ui";
import { FileUploader, ImageUploader } from "./Uploader";
import { ApiError } from "@/lib/api";
import type { Lang, News } from "@/lib/types";
import { slugify, toDatetimeLocal } from "@/lib/utils";

interface FormState {
  lang: Lang;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image: string | null;
  video: string | null;
  published_at: string;
  is_published: boolean;
}

const empty: FormState = { lang: "tm", title: "", slug: "", excerpt: "", content: "", image: null, video: null, published_at: toDatetimeLocal(new Date().toISOString()), is_published: true };

export default function NewsForm({ id }: { id?: number }) {
  const { get, send } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(empty);
  const [loaded, setLoaded] = useState(!id);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(!!id);

  useEffect(() => {
    if (!id) return;
    get<News>(`/admin/news/${id}`)
      .then((n) => {
        setForm({ lang: n.lang, title: n.title, slug: n.slug, excerpt: n.excerpt, content: n.content, image: n.image, video: n.video, published_at: toDatetimeLocal(n.published_at), is_published: n.is_published });
        setLoaded(true);
      })
      .catch((e) => toast.error(errMsg(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const body = {
      ...form,
      slug: form.slug || slugify(form.title),
      published_at: form.published_at ? new Date(form.published_at).toISOString() : undefined,
    };
    try {
      const saved = id ? await send<News>("PUT", `/admin/news/${id}`, body) : await send<News>("POST", "/admin/news", body);
      toast.success(id ? "Habar täzelendi" : "Habar döredildi");
      if (!id) router.replace(`/admin/news/${saved.id}`);
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
            <Field label="Ady" error={errors.title}>
              <Input value={form.title} onChange={(e) => { set("title", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} required />
            </Field>
            <Field label="Slug (URL)" hint="Boş goýsaňyz awtomat döredilýär" error={errors.slug}>
              <Input value={form.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} />
            </Field>
            <Field label="Gysga mazmun" hint="Boş goýsaňyz tekstden awtomat alynýar">
              <Textarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={3} />
            </Field>
            <div>
              <span className="mb-1.5 block text-sm font-semibold text-ink">Mazmun</span>
              <RichTextEditor value={form.content} onChange={(html) => set("content", html)} folder="habarlar" />
            </div>
          </div>
        </Card>
      </div>
      <div className="space-y-6">
        <Card title="Çap etmek">
          <div className="space-y-4">
            <Toggle checked={form.is_published} onChange={(v) => set("is_published", v)} label={form.is_published ? "Çap edilen" : "Garalama"} />
            <Field label="Dil">
              <Select value={form.lang} onChange={(e) => set("lang", e.target.value as Lang)}>
                <option value="tm">Türkmençe</option><option value="en">English</option><option value="ru">Русский</option>
              </Select>
            </Field>
            <Field label="Senesi">
              <Input type="datetime-local" value={form.published_at} onChange={(e) => set("published_at", e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" loading={busy}><Save size={16} /> Ýatda sakla</Button>
              <Link href="/admin/news"><Button type="button" variant="secondary"><ArrowLeft size={16} /> Yza</Button></Link>
            </div>
          </div>
        </Card>
        <Card title="Media">
          <div className="space-y-5">
            <ImageUploader value={form.image} onChange={(p) => set("image", p)} folder="habarlar" label="Esasy surat" />
            <FileUploader value={form.video} onChange={(p) => set("video", p)} folder="wideo_habarlar" kind="video" label="Wideo (MP4)" accept="video/mp4,video/webm" />
          </div>
        </Card>
      </div>
    </form>
  );
}
