import type { ReactNode } from "react";
import { UrdHero } from "./UrdDesignSystem";

export default function PageHero({
  eyebrow,
  title,
  highlight,
  summary,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  highlight?: ReactNode;
  summary?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <UrdHero
      eyebrow={eyebrow}
      title={title}
      highlight={highlight}
      summary={summary}
    >
      {children}
    </UrdHero>
  );
}