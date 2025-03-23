import React, { useEffect } from 'react';
import styles from './Toast.module.css';

const Toast = ({ message, type = 'success', duration = 3000, onClose, style }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div 
            className={`${styles.Toast} ${styles[type]} ${styles.show}`}
            style={style}
            role="alert"
            aria-live="polite"
        >
            <div className={styles.content}>
                {type === 'success' && (
                    <span className={styles.icon} role="img" aria-label="success">
                        ✓
                    </span>
                )}
                {type === 'error' && (
                    <span className={styles.icon} role="img" aria-label="error">
                        ✕
                    </span>
                )}
                {message}
            </div>
        </div>
    );
};

export default Toast;