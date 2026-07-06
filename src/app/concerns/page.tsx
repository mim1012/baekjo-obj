import { concerns } from '@/data/concerns';
import ConcernCard from '@/components/common/ConcernCard';

export const metadata = {
  title: '고민해결 | 백조오브제',
  description: '우리 아이의 건강 고민, 백조오브제에서 원인을 파악하고 해결책을 찾아보세요.',
};

export default function ConcernsPage() {
  return (
    <div className="bg-[#F4F2EC] min-h-dvh py-16">
      <div className="site-container">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-[#202521] md:text-4xl">우리 아이의 고민은 무엇인가요?</h1>
          <p className="mt-4 text-gray-500">가장 신경 쓰이는 증상을 선택하고 맞춤 해결책을 확인하세요.</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
          {concerns.map(concern => (
            <ConcernCard key={concern.slug} concern={concern} />
          ))}
        </div>
      </div>
    </div>
  );
}
