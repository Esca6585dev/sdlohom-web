"use client";

import NewsForm from "@/components/admin/NewsForm";
import { PageHeader } from "@/components/admin/ui";

export default function NewNewsPage() {
  return (
    <>
      <PageHeader title="Täze habar" />
      <NewsForm />
    </>
  );
}
