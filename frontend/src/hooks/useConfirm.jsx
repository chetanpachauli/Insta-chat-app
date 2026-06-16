import { createContext, useContext, useState, useCallback } from 'react';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';

const ConfirmContext = createContext();

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false, title: '', message: '', confirmLabel: 'Delete', cancelLabel: 'Cancel', resolve: null });

  const confirm = useCallback((message, title = 'Are you sure?', options = {}) => {
    return new Promise((resolve) => {
      setState({ open: true, title, message, ...options, resolve });
    });
  }, []);

  const handleClose = (result) => {
    state.resolve?.(result);
    setState(s => ({ ...s, open: false, resolve: null }));
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={state.open}
        onClose={() => handleClose(false)}
        PaperProps={{
          sx: { bgcolor: '#18181b', color: 'white', borderRadius: 3, minWidth: 320, border: '1px solid #27272a' }
        }}
      >
        <DialogTitle sx={{ color: 'white', fontWeight: 600 }}>{state.title}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#a1a1aa' }}>{state.message}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: '0 16px 16px', gap: 1 }}>
          <Button
            onClick={() => handleClose(false)}
            sx={{ color: '#a1a1aa', textTransform: 'none', borderRadius: 2, px: 3 }}
          >
            {state.cancelLabel}
          </Button>
          <Button
            onClick={() => handleClose(true)}
            variant="contained"
            sx={{ bgcolor: '#ef4444', color: 'white', textTransform: 'none', borderRadius: 2, px: 3, '&:hover': { bgcolor: '#dc2626' } }}
          >
            {state.confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
