'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { ArrowRight, CheckCircle2, FileText, UploadCloud } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export default function InsuranceUploadPlate() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const selectFile = useCallback((nextFile?: File) => {
    setError('');

    if (!nextFile) return;

    if (!ALLOWED_FILE_TYPES.includes(nextFile.type)) {
      setFile(null);
      setError('PDF, JPG, PNG 파일만 선택할 수 있어요.');
      return;
    }

    if (nextFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setError('파일 크기는 10MB 이하로 선택해 주세요.');
      return;
    }

    setFile(nextFile);
  }, []);

  const handleDrag = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(event.type === 'dragenter' || event.type === 'dragover');
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      selectFile(event.dataTransfer.files?.[0]);
    },
    [selectFile],
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const clearFile = () => {
    setFile(null);
    setError('');
  };

  return (
    <div className="premium-card p-5 sm:p-8">
      <div>
        <p className="page-eyebrow">보험 증권 파일</p>
        <h3 className="mt-3 break-keep text-2xl font-bold leading-8 tracking-tight text-[#17211D]">
          가지고 있는 증권을 선택해 주세요.
        </h3>
        <p className="mt-3 break-keep text-sm leading-7 text-[#6F766F]">
          PDF나 이미지 파일을 선택하면 이름과 형식을 먼저 확인할 수 있어요.
        </p>
      </div>

      {!file ? (
        <div
          className={`relative mt-7 flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed p-6 text-center transition-all duration-500 sm:p-10 ${
            isDragging
              ? 'border-[#A8742E] bg-[#F3EEE6]'
              : 'border-[#D8C4A3] bg-[#FAF8F3] hover:border-[#A8742E] hover:bg-[#F3EEE6]'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            onChange={handleChange}
            accept=".pdf,.jpg,.jpeg,.png"
            aria-label="보험 증권 파일 선택"
            aria-describedby={error ? 'insurance-file-help insurance-file-error' : 'insurance-file-help'}
          />
          <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-[#A8742E] shadow-[0_12px_30px_-18px_rgba(23,33,29,0.3)]">
            <UploadCloud className="size-6" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <p className="mt-5 break-keep text-sm font-bold text-[#17211D] sm:text-base">
            파일을 선택하거나 이곳에 놓아 주세요
          </p>
          <p id="insurance-file-help" className="mt-2 text-xs leading-5 text-[#6F766F]">
            PDF, JPG, PNG · 최대 10MB
          </p>
        </div>
      ) : (
        <div className="mt-7 rounded-3xl border border-[#D8C4A3] bg-[#FAF8F3] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#A8742E]">
              <CheckCircle2 className="size-5" strokeWidth={1.7} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-[#17211D]">파일을 선택했어요.</p>
              <p className="mt-1 break-all text-sm leading-6 text-[#6F766F]">{file.name}</p>
            </div>
          </div>
          <p className="mt-5 break-keep border-t border-[#E7E0D5] pt-5 text-xs leading-6 text-[#6F766F]">
            현재는 파일 선택 상태만 확인할 수 있으며 아직 전송되지 않았어요. 분석 신청은 상담 정보 작성으로
            이어집니다.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/insurance/apply" className="btn-primary flex-1">
              분석 신청서 작성하기
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <button type="button" onClick={clearFile} className="btn-secondary flex-1">
              다른 파일 선택하기
            </button>
          </div>
        </div>
      )}

      {error && (
        <div id="insurance-file-error" role="alert" className="mt-4 flex items-start gap-2 text-sm leading-6 text-[#9E3939]">
          <FileText className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
