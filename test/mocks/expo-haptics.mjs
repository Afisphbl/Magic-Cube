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

export default {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  impactAsync,
  _getImpactAsyncCalls,
  _resetImpactAsyncCalls,
};
