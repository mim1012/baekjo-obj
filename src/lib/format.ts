// 가격 포맷
export function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원';
}

// 할인율 계산
export function calcDiscount(price: number, salePrice?: number): number {
  if (!salePrice || salePrice >= price) return 0;
  return Math.round(((price - salePrice) / price) * 100);
}

// 날짜 포맷
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  // 파싱 불가 문자열이면 "NaN.NaN.NaN" 으로 렌더된다 — 원본을 그대로 돌려준다(invalid 입력에서만 동작 변화).
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// 평점 별 배열
export function ratingStars(rating: number): ('full' | 'half' | 'empty')[] {
  const stars: ('full' | 'half' | 'empty')[] = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) stars.push('full');
    else if (rating >= i - 0.5) stars.push('half');
    else stars.push('empty');
  }
  return stars;
}

// 전화번호 포맷
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}
