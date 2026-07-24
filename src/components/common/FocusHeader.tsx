import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import BrandMark from './BrandMark';

export default function FocusHeader() {
  return (
    <header className="border-b border-[#E7E0D5] bg-white">
      <div className="site-container-wide flex h-16 items-center justify-between lg:h-[72px]">
        <Link href="/" aria-label="ë°±ì¡°?¤ë¸Œ???? className="text-[#17211D]">
          <BrandMark />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-[#6F766F] transition-colors duration-500 hover:bg-[#F3EEE6] hover:text-[#17211D]"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          ?ˆìœ¼ë¡?
        </Link>
      </div>
    </header>
  );
}
