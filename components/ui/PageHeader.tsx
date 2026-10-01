import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <header className="ui-page-header">
      <h1 className="ui-page-title">{title}</h1>
      {actions ? <div className="ui-page-header__actions">{actions}</div> : null}
    </header>
  );
}

