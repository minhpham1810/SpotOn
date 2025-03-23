import React from 'react';
import styles from './LoadingSpinner.module.css';

const LoadingSpinner = ({ size = 'medium', light = true }) => {
    const spinnerClass = `${styles.Spinner} ${styles[size]} ${light ? styles.light : ''}`;
    
    return (
        <div className={styles.Container}>
            <div className={spinnerClass}>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
            </div>
        </div>
    );
};

export default LoadingSpinner;