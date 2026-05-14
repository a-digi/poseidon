import React from 'react';
import Alert, { AlertProps } from './Alert';

const NeutralAlert: React.FC<Omit<AlertProps, 'type'>> = (props) => (
  <Alert type="neutral" {...props} />
);

export default NeutralAlert;
