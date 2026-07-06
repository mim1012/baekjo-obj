import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default function InsuranceCompletePage() {
  return (
    <div className="bg-[#F4F2EC] min-h-dvh py-24">
      <div className="mx-auto max-w-lg px-4 text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm text-[#51705B]">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h1 className="text-3xl font-bold text-[#202521]">분석 신청이 완료되었습니다</h1>
        <div className="mt-6 rounded-sm bg-white p-6 shadow-sm border border-gray-100">
          <p className="text-gray-600 leading-relaxed text-sm">
            전문가가 신청하신 내용을 꼼꼼히 검토한 후,<br />
            영업일 기준 <strong className="text-[#2F3B34]">1~2일 내에 카카오톡으로</strong><br />
            분석 리포트를 발송해 드릴 예정입니다.
          </p>
        </div>
        
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/mypage" className="rounded-sm border border-gray-300 bg-white px-8 py-3.5 font-bold text-gray-700 transition hover:bg-gray-50">
            신청내역 보기
          </Link>
          <Link href="/" className="rounded-sm bg-[#2F3B34] px-8 py-3.5 font-bold text-white transition hover:bg-[#2F3B34]/90">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
