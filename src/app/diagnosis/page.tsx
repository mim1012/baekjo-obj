'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getSurveyConfig } from '@/lib/storage';
import type { SurveyQuestion } from '@/types';

export default function DiagnosisPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSurveyConfig().then((config) => {
      if (cancelled) return;
      setQuestions(config.questions);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const question = questions[currentStep];

  const handleSelect = (value: string) => {
    if (question.type === 'single') {
      setAnswers((prev) => ({ ...prev, [question.id]: value }));
    } else {
      setAnswers((prev) => {
        const current = (prev[question.id] || []) as string[];
        if (current.includes(value)) {
          return { ...prev, [question.id]: current.filter((v) => v !== value) };
        }
        return { ...prev, [question.id]: [...current, value] };
      });
    }
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    } else {
      // Save answers and go to result
      localStorage.setItem('baekjo_survey_answers', JSON.stringify(answers));
      router.push('/diagnosis/result');
    }
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  const isNextDisabled = !question || !answers[question.id] || (Array.isArray(answers[question.id]) && answers[question.id].length === 0);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  if (loading) {
    return <div className="min-h-dvh flex items-center justify-center bg-[#F4F2EC] text-[#59615B]">진단 문항을 불러오는 중...</div>;
  }

  if (!question) {
    return <div className="min-h-dvh flex items-center justify-center bg-[#F4F2EC] text-[#59615B]">등록된 진단 문항이 없습니다.</div>;
  }

  return (
    <div className="min-h-dvh bg-[#F4F2EC] flex flex-col items-center justify-center py-4 md:py-20 px-4 md:px-5 overflow-hidden">
      <div className="max-w-xl w-full">
        {/* Progress bar */}
        <div className="mb-4 md:mb-10">
          <div className="flex justify-between text-[11px] md:text-xs font-semibold text-[#8A918B] mb-1.5 md:mb-3">
            <span>진행률</span>
            <span>{currentStep + 1} / {questions.length}</span>
          </div>
          <div className="h-1 bg-[#D8D6CE] w-full rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2F3B34] transition-all duration-[var(--ease-out-expo)]"
              style={{ width: `${((currentStep + 1) / questions.length) * 100}%`, transitionDuration: '600ms' }}
            />
          </div>
        </div>

        <div className="bg-white p-5 md:p-12 border border-[#D8D6CE] shadow-sm relative min-h-[280px] md:min-h-[400px] flex flex-col justify-between rounded-sm">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="w-full flex-1"
            >
              <h1 className="text-[18px] md:text-3xl font-bold text-[#202521] mb-5 md:mb-8 text-center text-balance leading-tight">
                {question.title}
              </h1>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
                {question.options.map((option) => {
                  const isSelected = question.type === 'single' 
                    ? answers[question.id] === option.value
                    : ((answers[question.id] || []) as string[]).includes(option.value);

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelect(option.value)}
                      className={`border p-3 md:p-8 text-center rounded-lg md:rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md md:hover:-translate-y-1 min-h-[48px] md:min-h-[56px] flex items-center justify-center ${
                        isSelected
                          ? 'border-[#2F3B34] bg-[#2F3B34] text-white'
                          : 'border-[#D8D6CE] bg-[#FAF9F5] hover:border-[#8A918B] text-[#4F5751]'
                      }`}
                    >
                      <span className="font-bold text-[14px] md:text-lg text-balance leading-snug">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 md:mt-10 pt-4 md:pt-6 border-t border-[#D8D6CE] flex justify-between gap-2.5 md:gap-3">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="px-3 md:px-6 py-2.5 md:py-3 h-[44px] md:h-[52px] text-[13px] md:text-sm font-semibold text-[#667368] disabled:opacity-30 min-w-[70px] md:min-w-[80px]"
            >
              이전
            </button>
            <button
              onClick={handleNext}
              disabled={isNextDisabled}
              className="bg-[#2F3B34] flex-1 md:flex-none px-4 md:px-8 py-2.5 md:py-3 h-[44px] md:h-[52px] text-[14px] md:text-sm font-semibold text-white transition hover:bg-[#3D4A42] disabled:opacity-40 rounded-sm"
            >
              {currentStep === questions.length - 1 ? '결과 확인하기' : '다음'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
