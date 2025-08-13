import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast, { ToastContainer } from '../Toast';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'success', duration = 3000) => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, message, type, duration, createdAt: Date.now() }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    // Sort toasts by creation time to ensure newest is at bottom
    const sortedToasts = [...toasts].sort((a, b) => a.createdAt - b.createdAt);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <ToastContainer>
                {sortedToasts.map((toast, index) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={() => removeToast(toast.id)}
                        style={{
                            // Calculate position from bottom for each toast
                            bottom: `${(index * 70) + 20}px`
                        }}
                    />
                ))}
            </ToastContainer>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export default ToastContext;