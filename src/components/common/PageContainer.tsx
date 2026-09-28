import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

// 왜 존재하는가:
// globals.css의 공통 폭 기준(#344, site-container-wide = max-w-[1280px] + --page-gutter)이
// 바뀌었는데도, 페이지마다 `max-w-[1120px] px-5 md:px-6 ...` 식으로 폭·좌우 여백을 인라인
// Tailwind 클래스로 직접 적은 최상위 컨테이너가 43곳 남아있었다. 헤더(Header.tsx)는
// site-container-wide를 쓰므로 헤더의 좌측 시작선이 기준선인데, 인라인 컨테이너들은 이
// 기준을 따라가지 않아 본문·푸터 좌측 시작선이 헤더와 어긋나는 회귀가 발생했다(브랜드 상세
// 64px, 푸터 34px, 홈 섹션 8px 밀림, 2026-08-25 레이아웃 통일 감사).
//
// 공개 페이지의 최상위 폭 컨테이너는 폭·여백을 직접 적지 말고 반드시 이 컴포넌트를 써서,
// globals.css의 공통 기준이 다시 바뀌어도 헤더와 함께 자동으로 따라가게 한다.
type PageContainerProps<T extends ElementType> = {
  as?: T;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

export default function PageContainer<T extends ElementType = 'div'>({
  as,
  className,
  children,
  ...rest
}: PageContainerProps<T>) {
  const Component = as ?? 'div';
  const mergedClassName = className ? `site-container-wide ${className}` : 'site-container-wide';

  return (
    <Component className={mergedClassName} {...rest}>
      {children}
    </Component>
  );
}
