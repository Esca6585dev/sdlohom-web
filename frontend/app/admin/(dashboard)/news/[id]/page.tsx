"use client";

import { useParams } from "next/navigation";
import NewsForm from "@/components/admin/NewsForm";
import { PageHeader } from "@/components/admin/ui";

export default function EditNewsPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  return (
    <>
      <PageHeader title="Habary üýtgetmek" subtitle={`#${id}`} />
      <NewsForm key={id} id={id} />
    </>
  );
}
