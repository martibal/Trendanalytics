// src/app/_not-found/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function NotFoundRoute() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Not found</h1>
      <p>Fallback route for build stability.</p>
    </main>
  );
}
