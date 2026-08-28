import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { BrowserRouter } from 'react-router-dom';
import { store, persistor } from '@app/store';
import { ToastProvider } from '@components/ui';
import App from './App';
import './styles/index.css';
import { t } from '@/i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-roman-marble-900">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-roman-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-roman text-roman-gold-500 text-xl">{t('common.loading')}</p>
      </div>
    </div>
  );
}
