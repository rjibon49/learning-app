
import { GlobalVocabularyManager } from "@/components/admin/global-vocabulary-manager";

export default async function EditVocabularyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <GlobalVocabularyManager initialEditId={id} />;
}
