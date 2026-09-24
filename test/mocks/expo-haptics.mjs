export const ImpactFeedbackStyle = {
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
  Rigid: 'rigid',
  Soft: 'soft',
};

export const NotificationFeedbackType = {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
};

let impactAsyncCalls = [];
let notificationAsyncCalls = [];

export async function impactAsync(style = ImpactFeedbackStyle.Medium) {
  impactAsyncCalls.push(style);
  return Promise.resolve();
}

export function _getImpactAsyncCalls() {
  return impactAsyncCalls;
}

export function _resetImpactAsyncCalls() {
  impactAsyncCalls = [];
}

export async function notificationAsync(type = NotificationFeedbackType.Success) {
  notificationAsyncCalls.push(type);
  return Promise.resolve();
}

export function _getNotificationAsyncCalls() {
  return notificationAsyncCalls;
}

export function _resetNotificationAsyncCalls() {
  notificationAsyncCalls = [];
}

export default {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  impactAsync,
  _getImpactAsyncCalls,
  _resetImpactAsyncCalls,
  notificationAsync,
  _getNotificationAsyncCalls,
  _resetNotificationAsyncCalls,
};

