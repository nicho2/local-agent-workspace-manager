import Link from "next/link";
import type { ReactElement, ReactNode } from "react";

interface EmptyStateAction {
  href: string;
  label: ReactNode;
}

interface EmptyStateProps {
  actions?: EmptyStateAction[];
  children?: ReactNode;
  title: ReactNode;
}

export function EmptyState({ actions = [], children, title }: EmptyStateProps): ReactElement {
  return (
    <div className="empty-state">
      <h4>{title}</h4>
      {children ? <div className="empty-state-body">{children}</div> : null}
      {actions.length > 0 ? (
        <div className="empty-state-actions">
          {actions.map((action) => (
            <Link className="button-link" href={action.href} key={action.href}>
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
