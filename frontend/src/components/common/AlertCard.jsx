import React from 'react';
import { Alert, AlertTitle, Button } from '@mui/material';

const AlertCard = ({ type = 'warning', title, message, actionText, onAction }) => {
  const severityMap = {
    critical: 'error',
    warning: 'warning',
    info: 'info',
  };

  const severity = severityMap[type] || 'warning';

  return (
    <Alert
      severity={severity}
      sx={{ borderRadius: 1, '& .MuiAlert-message': { width: '100%' } }}
      action={
        actionText ? (
          <Button color="inherit" size="small" onClick={onAction}>
            {actionText}
          </Button>
        ) : null
      }
    >
      {title && <AlertTitle sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>{title}</AlertTitle>}
      {message}
    </Alert>
  );
};

export default AlertCard;
