import Link from 'next/link';
import { ArrowRight, ShieldCheck, FileText, Activity, Gift } from 'lucide-react';

export const metadata = {
  title: '케어 키트 | 백조오브제',
  description: '동물병원, 장례식장, 그리고 보호자를 위한 백조오브제의 특별한 케어 키트입니다.',
};

export default function CareKitLandingPage() {
  return (
    <div className="bg-[#F4F2EC] min-h-dvh">
      <section className="bg-[#2B352E] text-white py-24 lg:py-32">
        <div className="site-container text-center">
          <p className="text-[#8A918B] font-semibold tracking-widest text-sm mb-4 uppercase">Baekjo Care Kit</p>
          <h1 className="text-4xl md:text-6xl font-editorial mb-6 text-balance">
            가장 도움이 필요한 순간,<br />작은 위로를 전합니다
          </h1>
          <p className="text-[#B7C0B9] max-w-2xl mx-auto leading-relaxed text-lg">
            단순한 샘플 묶음이 아닙니다. 백조오브제 케어 키트는 동물병원, 장례식장, 파트너 브랜드와 함께
            보호자가 가장 도움이 필요한 순간에 받을 수 있는 실질적인 케어 가이드입니다.
          </p>
          <div className="mt-10">
            <Link href="#partner" className="inline-flex items-center gap-2 bg-white px-8 py-4 text-sm font-semibold text-[#2B352E] transition hover:bg-gray-100 rounded-sm">
              제휴 문의하기 <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 border-b border-[#D8D6CE]">
        <div className="site-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#202521] mb-4">4가지 맞춤 케어 키트</h2>
            <p className="text-[#6F756F]">각 상황에 꼭 필요한 성분과 제품만 선별했습니다.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {[
              { 
                icon: Activity, 
                title: '활력 케어 키트', 
                desc: '일상에서 꼭 필요한 영양과 구강 관리 위주의 구성. 3일 체험용',
                target: '기초 건강 관리가 필요한 아이' 
              },
              { 
                icon: ShieldCheck, 
                title: '병원 케어 키트', 
                desc: '진료 후 회복을 돕는 영양식과 처방 보조 제품군',
                target: '내원 및 치료 후 회복기 아이' 
              },
              { 
                icon: Gift, 
                title: '웰컴 키트', 
                desc: '반려동물을 처음 맞이한 가족을 위한 필수 가이드와 입문 용품',
                target: '입양 또는 첫 만남' 
              },
              { 
                icon: FileText, 
                title: '위로 키트', 
                desc: '이별의 순간을 돕는 작은 위로와 기억을 담은 굿즈',
                target: '이별을 준비하거나 맞이한 가족' 
              }
            ].map(kit => {
              const Icon = kit.icon;
              return (
                <div key={kit.title} className="bg-white p-8 border border-[#D8D6CE] hover:shadow-md transition">
                  <Icon className="size-8 text-[#5E6C62] mb-5" />
                  <h3 className="text-2xl font-bold text-[#2F3B34] mb-3">{kit.title}</h3>
                  <p className="text-[#6F756F] mb-6">{kit.desc}</p>
                  <p className="text-sm font-semibold text-[#8A918B]">추천 대상: {kit.target}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="partner" className="py-24 bg-[#EAE8E1]">
        <div className="site-container max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#202521] mb-4">B2B 파트너십 문의</h2>
            <p className="text-[#6F756F]">동물병원, 장례식장, 브랜드 제휴 등 협력 관련 문의를 남겨주세요.</p>
          </div>
          <div className="bg-white p-8 md:p-12 border border-[#D8D6CE]">
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#4F5751] mb-2">기관 / 업체명</label>
                <input type="text" className="w-full border border-[#C9C8C0] px-4 py-3 bg-[#FAF9F5] focus:border-[#2F3B34]" placeholder="상호명 입력" />
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#4F5751] mb-2">담당자 성함</label>
                  <input type="text" className="w-full border border-[#C9C8C0] px-4 py-3 bg-[#FAF9F5] focus:border-[#2F3B34]" placeholder="홍길동" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4F5751] mb-2">연락처</label>
                  <input type="text" className="w-full border border-[#C9C8C0] px-4 py-3 bg-[#FAF9F5] focus:border-[#2F3B34]" placeholder="010-0000-0000" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4F5751] mb-2">문의 내용</label>
                <textarea rows={4} className="w-full border border-[#C9C8C0] px-4 py-3 bg-[#FAF9F5] focus:border-[#2F3B34]" placeholder="제휴 관련 문의하실 내용을 자유롭게 적어주세요."></textarea>
              </div>
              <div className="flex items-start gap-3 py-2">
                <input type="checkbox" id="agree" className="mt-1 size-4 accent-[#2F3B34]" />
                <label htmlFor="agree" className="text-sm text-[#6F756F]">
                  개인정보 수집 및 이용에 동의합니다. (필수)
                </label>
              </div>
              <button type="button" className="w-full bg-[#2F3B34] text-white py-4 font-semibold hover:bg-[#3D4A42] transition shadow-md hover:-translate-y-1">
                제휴 문의 제출하기
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
