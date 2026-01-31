export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import CatalogClient from "./CatalogClient";

export default function Page() {
  return <CatalogClient />;
}
