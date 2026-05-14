import React from 'react';
import Alert, { AlertProps } from './Alert';

const MarketplaceAlert: React.FC<Omit<AlertProps, 'type'>> = (props) => (
  <Alert type="marketplace" {...props} />
);

export default MarketplaceAlert;
