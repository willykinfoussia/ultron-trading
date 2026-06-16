import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  meta?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, meta, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-main">
        <h1 className="page-header-title">{title}</h1>
        {meta && <span className="page-header-meta">{meta}</span>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  );
}
