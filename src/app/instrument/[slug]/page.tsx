import { redirect, notFound } from "next/navigation";
import { getToolBySlug, TOOLS } from "../../tools-config";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return TOOLS.map((tool) => ({ slug: tool.slug }));
}

/** Редирект со старых URL /instrument/[slug] на новые /path (например /pdf-to-word) */
export default async function InstrumentRedirectPage({ params }: Props) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) notFound();
  redirect(`/${tool.path}`);
}
