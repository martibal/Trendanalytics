// src/app/data-health/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import DataHealthClient from "./DataHealthClient";

export default function Page() {
  return <DataHealthClient />;
}
