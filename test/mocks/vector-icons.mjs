import React from 'react';
import { Text } from 'react-native-web';

export const Ionicons = React.forwardRef((props, ref) => {
  const { name, size, color, testID, ...rest } = props;
  return React.createElement(Text, {
    ref,
    testID: testID || `icon-${name}`,
    ...rest,
  }, name);
});

Ionicons.glyphMap = new Proxy({}, {
  get: (_target, prop) => prop,
});

export default {
  Ionicons,
};
