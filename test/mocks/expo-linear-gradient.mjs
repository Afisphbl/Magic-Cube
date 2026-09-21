import React from 'react';
import { View } from 'react-native-web';

export const LinearGradient = React.forwardRef((props, ref) => {
  const { colors, start, end, locations, children, ...rest } = props;
  return React.createElement(View, { ref, ...rest }, children);
});

export default {
  LinearGradient,
};
