'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { surveyQuestions } from '@/data/survey';

export default function DiagnosisPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const question = surveyQuestions[currentStep];

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
    if (currentStep < surveyQuestions.length - 1) {
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

  const isNextDisabled = !answers[question.id] || (Array.isArray(answers[question.id]) && answers[question.id].length === 0);

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

  return (
    <div className="min-h-dvh bg-[#F4F2EC] flex flex-col items-center justify-center py-20 px-5 overflow-hidden">
      <div className="max-w-xl w-full">
        {/* Progress bar */}
        <div className="mb-10">
          <div className="flex justify-between text-xs font-semibold text-[#8A918B] mb-3">
            <span>진행률</span>
            <span>{currentStep + 1} / {surveyQuestions.length}</span>
          </div>
          <div className="h-1 bg-[#D8D6CE] w-full rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#2F3B34] transition-all duration-[var(--ease-out-expo)]" 
              style={{ width: `${((currentStep + 1) / surveyQuestions.length) * 100}%`, transitionDuration: '600ms' }}
            />
          </div>
        </div>

        <div className="bg-white p-8 md:p-12 border border-[#D8D6CE] shadow-sm relative min-h-[400px] flex flex-col justify-between">
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
              <h1 className="text-2xl md:text-3xl font-bold text-[#202521] mb-8 text-center text-balance leading-tight">
                {question.title}
              </h1>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {question.options.map((option) => {
                  const isSelected = question.type === 'single' 
                    ? answers[question.id] === option.value
                    : ((answers[question.id] || []) as string[]).includes(option.value);

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelect(option.value)}
                      className={`border p-6 md:p-8 text-center rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 ${
                        isSelected
                          ? 'border-[#2F3B34] bg-[#2F3B34] text-white'
                          : 'border-[#D8D6CE] bg-[#FAF9F5] hover:border-[#8A918B] text-[#4F5751]'
                      }`}
                    >
                      <span className="font-bold text-lg">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 pt-6 border-t border-[#D8D6CE] flex justify-between">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="px-6 py-3 text-sm font-semibold text-[#667368] disabled:opacity-30"
            >
              이전
            </button>
            <button
              onClick={handleNext}
              disabled={isNextDisabled}
              className="bg-[#2F3B34] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#3D4A42] disabled:opacity-40 rounded-sm"
            >
              {currentStep === surveyQuestions.length - 1 ? '결과 확인하기' : '다음'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
