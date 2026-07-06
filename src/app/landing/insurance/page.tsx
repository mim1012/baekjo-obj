import Link from 'next/link';
import { ShieldCheck, FileText, ArrowRight, HeartPulse } from 'lucide-react';

export const metadata = {
  title: '펫보험 무료 분석 | 백조오브제',
  description: '수많은 펫보험, 우리 아이에게 맞는 정답은 따로 있습니다. 백조오브제의 객관적인 무료 분석을 받아보세요.',
};

export default function InsuranceLandingPage() {
  return (
    <div className="bg-[#FAF9F5] min-h-dvh">
      {/* Hero Section */}
      <section className="bg-[#2F3B34] text-white py-24 lg:py-32 overflow-hidden relative">
        <div className="site-container relative z-10 text-center">
          <p className="text-[#B5BDB6] font-semibold tracking-widest text-sm mb-4 uppercase">Free Insurance Review</p>
          <h1 className="text-4xl md:text-6xl font-editorial mb-6 text-balance leading-tight">
            옆집 아이의 정답이<br />우리 아이의 정답일까요?
          </h1>
          <p className="text-[#D8DCD9] max-w-2xl mx-auto leading-relaxed text-lg">
            매달 바뀌는 수많은 약관과 보장 조건, 보호자님이 모두 비교하기는 벅찹니다.<br />
            백조오브제가 객관적인 시선으로 우리 아이에게 진짜 유리한 선택지를 정리해 드립니다.
          </p>
          <div className="mt-10">
            <Link href="/insurance/apply" className="inline-flex items-center gap-2 bg-[#F3F1EB] px-8 py-4 text-sm font-semibold text-[#2B352E] transition hover:bg-white rounded-sm">
              무료 분석 신청하기 <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Why Section */}
      <section className="py-24">
        <div className="site-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#202521] mb-4">왜 백조오브제의 분석일까요?</h2>
            <p className="text-[#6F756F]">판매가 목적이 아닌, 아이의 생애 주기와 리스크를 먼저 봅니다.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 border border-[#D8D6CE] text-center">
              <ShieldCheck className="size-12 text-[#5E6C62] mx-auto mb-5" strokeWidth={1.5} />
              <h3 className="text-xl font-bold text-[#2F3B34] mb-3">가입 강요 없는 투명함</h3>
              <p className="text-[#6F756F] text-sm leading-relaxed">지금 가입하신 보험이 최선이라면, 유지하시라고 정직하게 말씀드립니다.</p>
            </div>
            <div className="bg-white p-8 border border-[#D8D6CE] text-center">
              <FileText className="size-12 text-[#5E6C62] mx-auto mb-5" strokeWidth={1.5} />
              <h3 className="text-xl font-bold text-[#2F3B34] mb-3">집요한 약관 분석</h3>
              <p className="text-[#6F756F] text-sm leading-relaxed">눈에 띄는 보장 금액 뒤에 숨은 세부 약관과 면책 조항까지 꼼꼼히 살핍니다.</p>
            </div>
            <div className="bg-white p-8 border border-[#D8D6CE] text-center">
              <HeartPulse className="size-12 text-[#5E6C62] mx-auto mb-5" strokeWidth={1.5} />
              <h3 className="text-xl font-bold text-[#2F3B34] mb-3">종특과 병력 맞춤 매칭</h3>
              <p className="text-[#6F756F] text-sm leading-relaxed">우리 아이의 품종 특이성과 과거 병력에 꼭 필요한 특약을 찾아냅니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-[#EAE8E1] py-24">
        <div className="site-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#202521] mb-4">분석은 이렇게 진행됩니다</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {[
              { step: '01', title: '간단한 정보 입력', desc: '아이의 정보와 고민을 남겨주세요.' },
              { step: '02', title: '전담 분석가 배정', desc: '입력하신 내용을 바탕으로 분석가가 배정됩니다.' },
              { step: '03', title: '맞춤 약관 시뮬레이션', desc: '여러 조건들을 시뮬레이션하며 비교합니다.' },
              { step: '04', title: '상세 리포트 도착', desc: '정리된 결과를 카카오톡이나 이메일로 받습니다.' },
            ].map(item => (
              <div key={item.step} className="bg-[#F8F7F2] p-6 text-center rounded-sm">
                <span className="font-editorial text-3xl text-[#8A918B] block mb-4">{item.step}</span>
                <h3 className="font-bold text-[#2F3B34] mb-2">{item.title}</h3>
                <p className="text-sm text-[#6F756F]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 text-center">
        <div className="site-container">
          <h2 className="text-3xl font-bold text-[#202521] mb-6">1분이면 충분합니다.</h2>
          <p className="text-[#6F756F] mb-10 max-w-xl mx-auto">
            무료 분석 신청 시 어떤 비용이나 가입 의무도 발생하지 않습니다.<br />
            우리 아이를 위한 똑똑한 첫걸음, 지금 시작해보세요.
          </p>
          <Link href="/insurance/apply" className="inline-flex items-center gap-2 bg-[#2F3B34] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#3D4A42] rounded-sm">
            무료 분석 신청하기 <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
