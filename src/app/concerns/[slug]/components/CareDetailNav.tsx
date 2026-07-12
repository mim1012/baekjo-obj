'use client';

import { useEffect, useState } from 'react';

interface Section {
  id: string;
  label: string;
}

interface CareDetailNavProps {
  sections: readonly Section[];
}

export default function CareDetailNav({ sections }: CareDetailNavProps) {
  // sections 는 mount 시점에 이미 확정된 props라 초기값을 lazy init 으로 계산해도
  // 렌더 결과가 기존(useEffect 로 mount 직후 세팅)과 동일하다 — effect 제거로 대체.
  const [activeSection, setActiveSection] = useState<string>(() => sections[0]?.id ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        root: null,
        rootMargin: '-25% 0px -60% 0px',
        threshold: 0,
      }
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [sections]);

  return (
    <nav
      aria-label="고민별 케어 상세 메뉴"
      className="care-detail-nav sticky top-[64px] z-20 border-y border-[#DED8CC] bg-[#FBFAF7]/95 backdrop-blur-xl lg:top-[72px]"
    >
      <div className="care-detail-container hide-scrollbar flex h-full items-center gap-6 overflow-x-auto sm:gap-8">
        {sections.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={`relative flex h-full shrink-0 items-center text-[14px] font-semibold transition-colors duration-300 ${
                isActive ? 'text-[#18231F]' : 'text-[#68716C] hover:text-[#18231F]'
              }`}
            >
              {section.label}
              {isActive && (
                <span className="absolute inset-x-0 bottom-[-1px] h-[2px] bg-[#B99562]" aria-hidden="true" />
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
