import * as React from 'react';
import Svg, { SvgProps, Path } from 'react-native-svg';

const SvgCloud = (props: SvgProps) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <Path d="M9.5 6a4.502 4.502 0 0 1 4.366 3.404 3.5 3.5 0 0 1 5.105 2.64A2.5 2.5 0 0 1 18.5 17h-12a3.5 3.5 0 0 1-1.497-6.665A4.5 4.5 0 0 1 9.5 6z" />
  </Svg>
);

export default SvgCloud;
