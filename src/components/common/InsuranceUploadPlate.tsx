'use client';

import { useState, useCallback } from 'react';
import { UploadCloud, CheckCircle } from 'lucide-react';

export default function InsuranceUploadPlate() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mt-12 bg-white border border-[#D8D6CE] p-8 sm:p-12 text-center rounded-2xl shadow-sm">
      <h3 className="text-2xl font-editorial font-bold text-[#202521] mb-2">기존 보험 증권 업로드</h3>
      <p className="text-[#6F756F] text-sm mb-8">영업 압박 전화 없이, 객관적인 보장 분석 리포트만 보내드립니다.</p>
      
      {!file ? (
        <div 
          className={`relative border-2 border-dashed rounded-xl p-12 transition-all duration-300 ${
            isDragging 
              ? 'border-[#2F3B34] bg-[#F4F2EC]' 
              : 'border-[#C8CEC8] hover:border-[#8A918B] bg-[#FAF9F5]'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleChange}
            accept=".pdf,.jpg,.jpeg,.png"
          />
          <UploadCloud className={`size-12 mx-auto mb-4 ${isDragging ? 'text-[#2F3B34]' : 'text-[#8A918B]'}`} />
          <p className="text-base font-semibold text-[#4F5751]">
            클릭하거나 파일을 이곳에 드래그 앤 드롭하세요
          </p>
          <p className="mt-2 text-xs text-[#8A918B]">
            지원 형식: PDF, JPG, PNG (최대 10MB)
          </p>
        </div>
      ) : (
        <div className="border border-[#2F3B34] rounded-xl p-8 bg-[#F4F2EC]">
          <CheckCircle className="size-12 mx-auto mb-4 text-[#51705b]" />
          <p className="text-lg font-semibold text-[#202521] mb-1">업로드 완료</p>
          <p className="text-sm text-[#6F756F] mb-6">{file.name}</p>
          <button 
            onClick={() => setFile(null)}
            className="text-sm font-semibold text-[#A65348] hover:underline"
          >
            다른 파일 선택하기
          </button>
        </div>
      )}

      <button 
        disabled={!file}
        className={`mt-8 w-full py-4 rounded-xl text-base font-bold transition-all duration-300 ${
          file 
            ? 'bg-[#2F3B34] text-white hover:bg-[#1a221d] shadow-md hover:-translate-y-1' 
            : 'bg-[#E5E9E4] text-[#A6AFA8] cursor-not-allowed'
        }`}
      >
        무료 분석 리포트 신청하기
      </button>
    </div>
  );
}
