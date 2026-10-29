"use client";

import { useParams } from "next/navigation";
import PageForm from "@/components/admin/PageForm";
import { PageHeader } from "@/components/admin/ui";

export default function EditPagePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  return (
    <>
      <PageHeader title="Sahypany üýtgetmek" subtitle={`#${id}`} />
      <PageForm key={id} id={id} />
    </>
  );
}
