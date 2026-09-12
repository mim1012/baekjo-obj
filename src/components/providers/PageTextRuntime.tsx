'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  defaultPageTextSettings,
  normalizeComparableText,
  normalizePageTextSettings,
  pageTextReplacementMap,
  type PageTextSettings,
} from '@/data/pageTextContent';

const EDITABLE_ATTRIBUTES = ['placeholder', 'title', 'aria-label'] as const;

/**
 * 공개 화면의 기존 마크업 구조를 바꾸지 않고, 환경설정에서 바꾼 평문만 고객 화면에 반영한다.
 * React가 만든 텍스트 노드/접근성 속성만 바꾸며 HTML은 삽입하지 않는다(XSS sink 없음).
 */
export default function PageTextRuntime() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<PageTextSettings>(defaultPageTextSettings);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/page-texts', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`page-texts ${response.status}`);
        return response.json() as Promise<{ settings?: unknown }>;
      })
      .then((payload) => {
        if (!cancelled && payload.settings) {
          setSettings(normalizePageTextSettings(payload.settings));
        }
      })
      .catch(() => {
        // 공개 화면은 기본 문구가 이미 렌더되어 있다. 네트워크 오류를 콘솔 에러로 확대하지 않는다.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/api')) return;
    const replacements = pageTextReplacementMap(pathname, settings);
    if (replacements.size === 0) return;

    const changedTexts = new Map<Text, { before: string; after: string }>();
    const changedAttributes = new Map<Element, Map<string, { before: string; after: string }>>();

    const replaceTextNode = (node: Text) => {
      const parent = node.parentElement;
      if (!parent || parent.closest('script, style, textarea, [data-page-text-editor]')) return;
      const replacement = replacements.get(normalizeComparableText(node.data));
      if (replacement === undefined) return;
      const leading = node.data.match(/^\s*/)?.[0] ?? '';
      const trailing = node.data.match(/\s*$/)?.[0] ?? '';
      const next = `${leading}${replacement}${trailing}`;
      if (next === node.data) return;
      const before = node.data;
      changedTexts.set(node, { before, after: next });
      node.data = next;
    };

    const replaceAttributes = (element: Element) => {
      if (element.closest('[data-page-text-editor]')) return;
      for (const attribute of EDITABLE_ATTRIBUTES) {
        const current = element.getAttribute(attribute);
        if (!current) continue;
        const replacement = replacements.get(normalizeComparableText(current));
        if (replacement === undefined || replacement === current) continue;
        let records = changedAttributes.get(element);
        if (!records) {
          records = new Map();
          changedAttributes.set(element, records);
        }
        records.set(attribute, { before: current, after: replacement });
        element.setAttribute(attribute, replacement);
      }
    };

    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        replaceTextNode(node as Text);
        return;
      }
      if (!(node instanceof Element)) return;
      replaceAttributes(node);
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      let textNode = walker.nextNode();
      while (textNode) {
        replaceTextNode(textNode as Text);
        textNode = walker.nextNode();
      }
      node.querySelectorAll('*').forEach(replaceAttributes);
    };

    processNode(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') processNode(mutation.target);
        if (mutation.type === 'childList') mutation.addedNodes.forEach(processNode);
        if (mutation.type === 'attributes') processNode(mutation.target);
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...EDITABLE_ATTRIBUTES],
    });

    return () => {
      observer.disconnect();
      for (const [node, record] of changedTexts) {
        if (node.isConnected && node.data === record.after) node.data = record.before;
      }
      for (const [element, records] of changedAttributes) {
        if (!element.isConnected) continue;
        for (const [attribute, record] of records) {
          if (element.getAttribute(attribute) === record.after) {
            element.setAttribute(attribute, record.before);
          }
        }
      }
    };
  }, [pathname, settings]);

  return null;
}
