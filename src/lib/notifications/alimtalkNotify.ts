import 'server-only';
import { after } from 'next/server';
import { getOrderById } from '@/lib/orders/repo';
import { logServerError } from '@/lib/logServerError';
import { isAlimtalkEnabled, sendAlimtalk } from '@/lib/notifications/alimtalk';
import { resolveAlimtalkMessages, type AlimtalkTrigger } from '@/lib/notifications/alimtalkMessages';

/**
 * 주문 이벤트에 맞는 알림톡을 보낸다(응답 이후 실행). 호출부는 "이번 호출이 실제로 상태를 바꿨다"는
 * 신호(CAS 1행, 반환 true 등)를 확인한 뒤에만 부른다 — 멱등 재호출에는 보내지 않기 위함이다.
 * 이 함수는 동기적으로 던지지 않으며, 알림 실패가 결제·배송·취소 응답을 늦추거나 깨뜨리지 않는다.
 */
export function notifyAlimtalkAfter(trigger: AlimtalkTrigger): void {
  try {
    if (!isAlimtalkEnabled()) {
      console.info('[alimtalk] skipped (disabled)');
      return;
    }
    const task = () => dispatchAlimtalk(trigger);
    try {
      after(task);
    } catch {
      // 요청 스코프 밖(크론 스크립트·테스트 등)에서는 after()가 던진다 — 분리 실행으로 대체.
      void task();
    }
  } catch (error) {
    logServerError(`[alimtalk] schedule failed event=${trigger.event} order=${trigger.orderId}`, error);
  }
}

/** 주문을 읽어 메시지를 구성·발송한다. 모든 예외는 로그로만 남긴다. */
export async function dispatchAlimtalk(trigger: AlimtalkTrigger): Promise<void> {
  try {
    const order = await getOrderById(trigger.orderId);
    if (!order) {
      console.warn(`[alimtalk] skipped (order not found) event=${trigger.event} order=${trigger.orderId}`);
      return;
    }
    for (const message of resolveAlimtalkMessages(order, trigger)) {
      await sendAlimtalk(message.event, message.data, order.phone);
    }
  } catch (error) {
    logServerError(`[alimtalk] dispatch failed event=${trigger.event} order=${trigger.orderId}`, error);
  }
}
