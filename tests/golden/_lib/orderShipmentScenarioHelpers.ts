import { expect, type Page } from '@playwright/test';

type AdminBrand = {
  id: string;
  name: string;
};

type AdminProduct = {
  id: string;
  name: string;
};

export type AdminOrder = {
  id: string;
  customerName: string;
  orderStatus: string;
  paymentStatus: string;
  deliveryStatus: string;
  items: Array<{
    productId: string;
    productName: string;
    brandId?: string;
  }>;
};

type ShipmentRow = {
  brandId: string;
  carrier?: string;
  trackingNumber?: string;
  deliveryStatus: string;
};

type CreatedOrder = Pick<AdminOrder, 'id' | 'paymentStatus' | 'items'>;

export type AuthSession = {
  user?: {
    role?: string;
  };
};

export type BrandScenario = {
  name: string;
  carrier: 'cj' | 'hanjin';
  carrierLabel: string;
  trackingNumber: string;
  dispatchEstimate: string;
  asNotice: string;
  supportContact: string;
  productName: string;
  brandId?: string;
  productId?: string;
};

export const BRAND_PREFIX = 'E2E-배송브랜드-';
export const PRODUCT_PREFIX = 'E2E-배송상품-';
export const RECIPIENT_PREFIX = 'E2E-브랜드배송주문-';

const PRODUCT_IMAGE = '/images/icon-product.svg';
const BRAND_LOGO = '/images/baekjo-objet-brand.png';

export function assertNotProd(): void {
  const target = process.env.E2E_BASE_URL || process.env.BASE_URL || '';
  if (/baekjo-obj\.vercel\.app/.test(target)) {
    throw new Error(`쓰기 스펙이 production(${target})을 겨냥했습니다 — 중단. 대상은 Preview/staging뿐.`);
  }
}

export async function getAdminOrders(page: Page): Promise<AdminOrder[]> {
  const response = await page.request.get('/api/admin/orders');
  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as { orders: AdminOrder[] };
  return payload.orders;
}

export async function cleanupScenarioRows(page: Page): Promise<void> {
  const products = await getAdminProducts(page);
  for (const product of products.filter((item) => item.name.startsWith(PRODUCT_PREFIX))) {
    await page.request.delete(`/api/admin/products/${encodeURIComponent(product.id)}`);
  }

  const brands = await getAdminBrands(page);
  for (const brand of brands.filter((item) => item.name.startsWith(BRAND_PREFIX))) {
    await page.request.delete(`/api/admin/brands/${encodeURIComponent(brand.id)}`);
  }
}

export async function createScenarioRows(page: Page, scenarios: BrandScenario[]): Promise<void> {
  for (const scenario of scenarios) {
    scenario.brandId = await createBrand(page, scenario);
    scenario.productId = await createProduct(page, scenario);
  }
}

export async function createBankTransferOrder(
  page: Page,
  recipientName: string,
  runId: number,
  scenarios: BrandScenario[],
): Promise<CreatedOrder> {
  const cartItems = scenarios.map((scenario) => {
    if (!scenario.productId) throw new Error(`${scenario.name} productId가 없습니다.`);
    return { productId: scenario.productId, quantity: 1 };
  });

  const response = await page.request.post('/api/orders', {
    data: {
      customerName: recipientName,
      phone: '010-1234-5678',
      address: '서울시 테스트구 브랜드배송로 1',
      items: cartItems,
      paymentMethod: '무통장입금',
      deliveryMemo: `브랜드별 배송 검증 ${runId}`,
    },
  });
  expect(response.ok(), `주문 생성 실패: ${response.status()} ${await response.text()}`).toBe(true);
  const payload = (await response.json()) as { order: CreatedOrder };
  return payload.order;
}

export async function confirmBankTransfer(page: Page, orderId: string): Promise<void> {
  const response = await page.request.patch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
    data: { paymentStatus: '결제완료' },
  });
  expect(response.ok(), `입금확인 PATCH 실패: ${response.status()} ${await response.text()}`).toBe(true);
  await expectOrderField(page, orderId, 'paymentStatus', '결제완료');
}

export async function completeOrderStatus(page: Page, orderId: string): Promise<void> {
  const response = await page.request.patch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
    data: { orderStatus: '배송완료' },
  });
  expect(response.ok(), `배송완료 PATCH 실패: ${response.status()} ${await response.text()}`).toBe(true);
  await expectOrderField(page, orderId, 'orderStatus', '배송완료');
}

export async function updateBrandShipment(page: Page, orderId: string, scenario: BrandScenario): Promise<void> {
  if (!scenario.brandId) throw new Error(`${scenario.name} brandId가 없습니다.`);
  const response = await page.request.patch(
    `/api/admin/orders/${encodeURIComponent(orderId)}/shipments/${encodeURIComponent(scenario.brandId)}`,
    {
      data: {
        carrier: scenario.carrier,
        trackingNumber: scenario.trackingNumber,
        deliveryStatus: '배송완료',
      },
    },
  );
  expect(response.ok(), `송장 저장 실패: ${response.status()} ${await response.text()}`).toBe(true);
}

export async function assertBrandShipments(page: Page, orderId: string, scenarios: BrandScenario[]): Promise<void> {
  await expect(async () => {
    const response = await page.request.get(`/api/admin/orders/${encodeURIComponent(orderId)}/shipments`);
    expect(response.ok()).toBe(true);
    const payload = (await response.json()) as { shipments: ShipmentRow[] };
    for (const scenario of scenarios) {
      const shipment = payload.shipments.find((item) => item.brandId === scenario.brandId);
      expect(shipment?.carrier).toBe(scenario.carrier);
      expect(shipment?.trackingNumber).toBe(scenario.trackingNumber);
      expect(shipment?.deliveryStatus).toBe('배송완료');
    }
  }).toPass({ timeout: 20_000 });
  await expectOrderField(page, orderId, 'deliveryStatus', '배송완료');
}

export async function assertMemberTrackingModal(page: Page, orderId: string, scenario: BrandScenario): Promise<void> {
  const orderCard = page.locator('.mypage-card', { hasText: orderId }).first();
  const deliveryRow = orderCard
    .locator('div.flex.items-center.justify-between.gap-3', { hasText: scenario.name })
    .first();
  await expect(deliveryRow).toBeVisible({ timeout: 15_000 });
  await deliveryRow.getByRole('button', { name: '배송조회' }).click();

  const modal = page.getByRole('dialog', { name: '배송조회' });
  await expect(modal).toBeVisible({ timeout: 15_000 });
  await expect(modal).toContainText(scenario.name);
  await expect(modal).toContainText(scenario.carrierLabel);
  await expect(modal).toContainText(scenario.trackingNumber);
  await expect(modal).toContainText(scenario.dispatchEstimate);
  await expect(modal).toContainText(scenario.asNotice);
  await expect(modal).toContainText(scenario.supportContact);
  await expect(modal.getByRole('link', { name: /택배사에서 배송조회/ })).toBeVisible();
  await expect(modal.getByRole('button', { name: '구매확정' })).toBeEnabled();
  await modal.getByRole('button', { name: '닫기' }).click();
  await expect(modal).toBeHidden({ timeout: 10_000 });
}

export async function expectOrderField(
  page: Page,
  orderId: string,
  field: keyof Pick<AdminOrder, 'orderStatus' | 'paymentStatus' | 'deliveryStatus'>,
  value: string,
): Promise<void> {
  await expect(async () => {
    const orders = await getAdminOrders(page);
    expect(orders.find((order) => order.id === orderId)?.[field]).toBe(value);
  }).toPass({ timeout: 20_000 });
}

async function getAdminBrands(page: Page): Promise<AdminBrand[]> {
  const response = await page.request.get('/api/admin/brands');
  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as { brands: AdminBrand[] };
  return payload.brands;
}

async function getAdminProducts(page: Page): Promise<AdminProduct[]> {
  const response = await page.request.get('/api/admin/products');
  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as { products: AdminProduct[] };
  return payload.products;
}

async function createBrand(page: Page, scenario: BrandScenario): Promise<string> {
  const response = await page.request.post('/api/admin/brands', {
    data: {
      name: scenario.name,
      logo: BRAND_LOGO,
      description: `${scenario.name} 배송 정책 검증용 브랜드`,
      philosophy: `${scenario.name} 브랜드별 배송 문구가 회원 배송조회에 반영되는지 검증합니다.`,
      auditGrade: 'A',
      auditPoints: [],
      representativeProductIds: [],
      relatedConcernSlugs: [],
      isRecommended: false,
      isNew: false,
      isVisible: true,
      shipping: {
        defaultCarrier: scenario.carrier,
        shippingFee: 3100,
        freeShippingThreshold: 55000,
        dispatchEstimate: scenario.dispatchEstimate,
        asNotice: scenario.asNotice,
        supportContact: scenario.supportContact,
        supportHours: '평일 10-17',
      },
    },
  });
  expect(response.ok(), `브랜드 생성 실패: ${response.status()} ${await response.text()}`).toBe(true);
  const payload = (await response.json()) as { brand: AdminBrand };
  return payload.brand.id;
}

async function createProduct(page: Page, scenario: BrandScenario): Promise<string> {
  if (!scenario.brandId) throw new Error(`${scenario.name} brandId가 없습니다.`);
  const response = await page.request.post('/api/admin/products', {
    data: {
      brandId: scenario.brandId,
      name: scenario.productName,
      price: 12000,
      rating: 0,
      reviewCount: 0,
      category: 'E2E',
      lifestyleCategory: 'E2E',
      concernTags: [],
      petType: 'both',
      ageGroup: 'all',
      image: PRODUCT_IMAGE,
      stock: 999,
      description: `${scenario.productName} 주문 배송 검증용 상품`,
      isVisible: true,
      isBest: false,
      isRecommended: false,
    },
  });
  expect(response.ok(), `상품 생성 실패: ${response.status()} ${await response.text()}`).toBe(true);
  const payload = (await response.json()) as { product: AdminProduct };
  return payload.product.id;
}
