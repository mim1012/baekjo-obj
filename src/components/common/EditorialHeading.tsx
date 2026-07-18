import type { ReactNode } from 'react';

interface SharedHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

export function PageIntro({
  eyebrow,
  title,
  description,
  action,
  align = 'left',
  className = '',
}: SharedHeadingProps) {
  const centered = align === 'center';

  return (
    <header
      className={`${centered ? 'mx-auto items-center text-center' : 'items-start text-left'} flex max-w-3xl flex-col ${className}`}
    >
      {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
      <h1 className={`${eyebrow ? 'mt-3' : ''} page-title`}>{title}</h1>
      {description && (
        <div className={`${centered ? 'mx-auto' : ''} body-copy mt-5 max-w-2xl`}>{description}</div>
      )}
      {action && <div className="mt-8 w-full">{action}</div>}
    </header>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = 'left',
  className = '',
}: SharedHeadingProps) {
  const centered = align === 'center';

  return (
    <div
      className={`${centered ? 'mx-auto items-center text-center' : 'items-start text-left'} flex max-w-3xl flex-col ${className}`}
    >
      {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
      <h2 className={`${eyebrow ? 'mt-3' : ''} section-title`}>{title}</h2>
      {description && (
        <div className={`${centered ? 'mx-auto' : ''} body-copy mt-4 max-w-2xl`}>{description}</div>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
