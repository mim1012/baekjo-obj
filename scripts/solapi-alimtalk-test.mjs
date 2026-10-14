#!/usr/bin/env node
// 솔라피 카카오 알림톡 수동 테스트 스크립트 (대체문자 발송 안 함).
//
// 사용법:
//   node --env-file=.env.solapi.local scripts/solapi-alimtalk-test.mjs balance
//   node --env-file=.env.solapi.local scripts/solapi-alimtalk-test.mjs list
//   node --env-file=.env.solapi.local scripts/solapi-alimtalk-test.mjs send <템플릿키> <수신번호> [--yes]
//
// --yes 없이 send 하면 요청 본문만 출력하고 실제 발송하지 않는다.
// 필요한 env: SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_PF_ID

import crypto from "node:crypto";

const API_BASE = "https://api.solapi.com";

const SAMPLE = {
  고객명: "홍길동",
  주문번호: "TEST-20261014-0001",
  상품명: "테스트 상품",
};

const TEMPLATES = {
  orderPaid: {
    id: "KA01TP261004182611745ReuYudwj1j5",
    name: "주문결제완료",
    variables: { ...SAMPLE, 결제금액: "39,000" },
  },
  shippingStarted: {
    id: "KA01TP2610041843070259y73QWgIT0v",
    name: "배송출발",
    variables: { ...SAMPLE, 택배사: "CJ대한통운", 운송장번호: "123456789012" },
  },
  delivered: { id: "KA01TP2610041850158440QvoWWym0Rs", name: "배송완료", variables: SAMPLE },
  purchaseConfirmed: {
    id: "KA01TP261004193906384OeC4dRwDlM6",
    name: "구매확정",
    variables: { ...SAMPLE, 구매확정일: "2026-10-14" },
  },
  cancelRequested: { id: "KA01TP261004194105402MJCw7NSagIw", name: "주문취소접수", variables: SAMPLE },
  cancelCompleted: {
    id: "KA01TP261004194306136lwkwgLTOhuQ",
    name: "주문취소완료",
    variables: { ...SAMPLE, 취소금액: "39,000" },
  },
  exchangeRequested: { id: "KA01TP261004194536162QDkwhL6RanY", name: "교환접수", variables: SAMPLE },
  exchangeCompleted: { id: "KA01TP261004194716622TWzteENlxrJ", name: "교환처리완료", variables: SAMPLE },
  returnRequested: { id: "KA01TP261004194853591v4paSH984Fu", name: "반품접수", variables: SAMPLE },
  returnCompleted: { id: "KA01TP261004195150743cusTkx4ur3I", name: "반품처리완료", variables: SAMPLE },
  customMade: { id: "KA01TP261004195624501AfAI8SyvrJP", name: "주문제작상품안내", variables: SAMPLE },
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`환경변수 ${name} 누락`);
    process.exit(1);
  }
  return value;
}

function authHeader() {
  const apiKey = requireEnv("SOLAPI_API_KEY");
  const secret = requireEnv("SOLAPI_API_SECRET");
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString("hex");
  const signature = crypto.createHmac("sha256", secret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

async function call(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  console.log(`HTTP ${res.status}`);
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log(text);
  }
  if (!res.ok) process.exitCode = 1;
}

const [command, templateKey, to, flag] = process.argv.slice(2);

if (command === "balance") {
  await call("GET", "/cash/v1/balance");
} else if (command === "list") {
  for (const [key, t] of Object.entries(TEMPLATES)) console.log(`${key.padEnd(18)} ${t.name}  ${t.id}`);
} else if (command === "send") {
  const template = TEMPLATES[templateKey];
  if (!template) {
    console.error(`알 수 없는 템플릿 키: ${templateKey} (list 로 확인)`);
    process.exit(1);
  }
  const phone = (to ?? "").replace(/\D/g, "");
  if (!/^01\d{8,9}$/.test(phone)) {
    console.error("수신번호 형식 오류 (예: 01012345678)");
    process.exit(1);
  }
  const variables = Object.fromEntries(
    Object.entries(template.variables).map(([k, v]) => [`#{${k}}`, v]),
  );
  const body = {
    message: {
      to: phone,
      type: "ATA",
      kakaoOptions: {
        pfId: requireEnv("SOLAPI_PF_ID"),
        templateId: template.id,
        variables,
        disableSms: true,
      },
    },
  };
  console.log(`[${template.name}] 요청 본문:`);
  console.log(JSON.stringify(body, null, 2));
  if (flag !== "--yes") {
    console.log("\n(드라이런) 실제 발송하려면 맨 뒤에 --yes 를 붙이세요.");
  } else {
    await call("POST", "/messages/v4/send", body);
  }
} else {
  console.log("사용법: balance | list | send <템플릿키> <수신번호> [--yes]");
}
