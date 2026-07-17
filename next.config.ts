import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // 화면 라벨은 "셀렉션"인데 실제 경로는 /shop 이다 — Header(:105,:117,:237)·Footer(:7)·
      // HomeClient(:109,:118) 가 전부 /shop 으로 링크하고, /selection 라우트는 이 레포에도
      // dad UI 레포(dad041566-hue/BAGJO)에도 **존재한 적이 없다**(git 전이력 확인).
      // 즉 앱 안의 링크로는 도달 불가하고, 사용자가 라벨을 보고 URL 을 유추해 직접 입력할 때만
      // 404 가 난다 → 그 경로를 흡수한다. 되살릴 라우트가 없으므로 영구(308)가 맞다.
      {
        source: "/selection",
        destination: "/shop",
        permanent: true,
      },
      // /selection/xxx 같은 하위 경로도 같은 이유로 스토어로 보낸다(상품 상세는 /shop/[id] 라
      // 개별 매핑이 불가능하므로 목록으로 보낸다).
      {
        source: "/selection/:path*",
        destination: "/shop",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
