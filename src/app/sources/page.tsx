import { SourcesTable } from "@/components/sources/SourcesTable";

export default function SourcesPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Fontes indexadas</h1>
      <SourcesTable />
    </main>
  );
}
