import React from 'react';
import { View } from 'react-native-web';

let currentInsets = { top: 0, bottom: 0, left: 0, right: 0 };

export function useSafeAreaInsets() {
  return currentInsets;
}

export function __setMockInsets(insets) {
  currentInsets = { ...currentInsets, ...insets };
}

export const SafeAreaView = React.forwardRef((props, ref) => {
  return React.createElement(View, { ref, ...props });
});

export const SafeAreaProvider = ({ children }) => children;

export default {
  useSafeAreaInsets,
  __setMockInsets,
  SafeAreaView,
  SafeAreaProvider,
};
