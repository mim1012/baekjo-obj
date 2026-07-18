import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // 화면 라벨은 "셀렉션"인데 실제 경로는 /shop 이다 — Header(:105,:117,:237)·Footer(:7)·
      // HomeClient(:109,:118) 가 전부 /shop 으로 링크하고, /selection 라우트는 이 레포에도
      // dad UI 레포(dad041566-hue/BAGJO)에도 **존재한 적이 없다**(git 전이력 확인).
      // 즉 앱 안의 링크로는 도달 불가하고, 사용자가 라벨을 보고 URL 을 유추해 직접 입력할 때만
      // 404 가 난다 → 그 경로를 흡수한다. `/shop`이 정본인지 추가 검증될 때까지
      // Next 16의 temporary redirect(`permanent: false` = 307)로 캐시 고착을 피한다.
      {
        source: "/selection",
        destination: "/shop",
        permanent: false,
      },
      // /selection/xxx 같은 하위 경로도 같은 이유로 스토어로 보낸다(상품 상세는 /shop/[id] 라
      // 개별 매핑이 불가능하므로 목록으로 보낸다).
      {
        source: "/selection/:path*",
        destination: "/shop",
        permanent: false,
      },
    ];
  },
  images: {
    // 관리자 업로드(브랜드 로고·상품 이미지)는 ImageUploader 가 Supabase Storage 공개 버킷에
    // 저장하고 https://<project-ref>.supabase.co/storage/v1/object/public/... URL 을 돌려준다.
    // next/image 는 remotePatterns 에 없는 호스트를 만나면 렌더가 아니라 즉시 throw 하므로,
    // 이 패턴이 없으면 그 이미지를 쓰는 공개 상세 페이지(/brands/[id], /shop/[id])가 그 순간
    // 통째로 크래시한다. 지금까지 안 걸린 건 시드 이미지가 전부 로컬 /public 경로였기 때문—
    // 관리자가 처음 실사진을 업로드하는 순간 재현된다(2026-07-18 e2e 작업 중 발견).
    // hostname 을 와일드카드로 둬 스테이징(aeooyivfijthfcrfrnyk)·prod(vgeqpbyyggxxaeowtbtj)
    // 프로젝트 ref 변경에도 안전하게 하고, pathname 은 공개 스토리지 오브젝트 경로로만 좁힌다.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
