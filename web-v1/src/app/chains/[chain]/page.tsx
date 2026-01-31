import { ChainDetail } from "@/components/ChainDetail";

export default function Page({ params }: { params: { chain: string } }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <ChainDetail chain={params.chain} />
    </main>
  );
}
