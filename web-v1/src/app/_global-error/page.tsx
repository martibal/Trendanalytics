// src/app/_global-error/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function GlobalErrorRoute() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Global error</h1>
      <p>Fallback route for build stability.</p>
    </main>
  );
}
