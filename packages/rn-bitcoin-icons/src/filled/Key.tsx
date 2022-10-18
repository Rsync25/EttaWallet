import * as React from 'react';
import Svg, { SvgProps, Path } from 'react-native-svg';

const SvgKey = (props: SvgProps) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <Path
      fillRule="evenodd"
      d="M18.865 7.374c.74 2.968-1.163 5.998-4.25 6.767a6.01 6.01 0 0 1-1.155.172l-3.435 5.471a2 2 0 0 1-1.21.877l-1.974.492a1 1 0 0 1-1.212-.728l-.445-1.786a2 2 0 0 1 .246-1.547l3.157-5.028a5.338 5.338 0 0 1-.9-1.903c-.74-2.968 1.162-5.998 4.249-6.768 3.087-.77 6.189 1.013 6.929 3.98zm-4.627 1.324c.685-.171 1.108-.844.944-1.504-.165-.66-.854-1.055-1.54-.884-.686.17-1.109.844-.944 1.503.164.66.854 1.056 1.54.885z"
      clipRule="evenodd"
    />
  </Svg>
);

export default SvgKey;
