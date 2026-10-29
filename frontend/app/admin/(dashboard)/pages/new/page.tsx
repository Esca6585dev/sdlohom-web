"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PageForm from "@/components/admin/PageForm";
import { PageHeader, Spinner } from "@/components/admin/ui";
import { isLocale } from "@/lib/i18n/config";

function Inner() {
  const sp = useSearchParams();
  const parent = Number(sp.get("parent") || 0) || undefined;
  const lang = sp.get("lang");
  return <PageForm initialParent={parent} initialLang={isLocale(lang) ? lang : undefined} />;
}

export default function NewPagePage() {
  return (
    <>
      <PageHeader title="Täze sahypa" />
      <Suspense fallback={<Spinner />}><Inner /></Suspense>
    </>
  );
}
