"use client";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html>
      <body style={{ padding: 24 }}>
        <h1>Something went wrong</h1>
        <pre style={{ whiteSpace: "pre-wrap" }}>{error?.message ?? "Unknown error"}</pre>
        <p style={{ opacity: 0.7, marginTop: 12 }}>Digest: {(error as any)?.digest ?? "n/a"}</p>
      </body>
    </html>
  );
}
