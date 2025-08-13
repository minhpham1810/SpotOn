import React from 'react';

const LoadingSpinner = ({ size = 'medium', light = true }) => {
    const sizeClasses = {
        small: 'w-6 h-6',
        medium: 'w-10 h-10',
        large: 'w-16 h-16'
    };

    const spinnerRingClasses = {
        small: 'w-5 h-5',
        medium: 'w-8 h-8',
        large: 'w-[51px] h-[51px]'
    };

    const borderColor = light ? 'border-t-white' : 'border-t-primary';

    return (
        <div className="flex justify-center items-center p-4">
            <div className={`relative inline-block ${sizeClasses[size]} animate-fadeIn`}>
                <div className="absolute inset-0 bg-shimmer animate-shimmer opacity-30" />
                <div className={`relative inline-block ${sizeClasses[size]}`}>
                    {[...Array(4)].map((_, index) => (
                        <div
                            key={index}
                            className={`box-border block absolute rounded-full border-3
                                      ${light ? 'border-white/[0.15]' : 'border-primary/[0.15]'}
                                      ${borderColor}
                                      ${spinnerRingClasses[size]}
                                      animate-[spin_1.2s_cubic-bezier(0.5,0,0.5,1)_infinite]
                                      backdrop-blur-sm shadow-[0_0_20px_rgba(255,255,255,0.15)]
                                      transition-all duration-300`}
                            style={{
                                animationDelay: `${-0.45 + (index * 0.15)}s`,
                                borderRightColor: 'transparent',
                                borderBottomColor: 'transparent',
                                borderLeftColor: 'transparent',
                                filter: `blur(${0.2 * index}px)`
                            }}
                        />
                    ))}
                    <div className={`absolute inset-0 animate-pulse ${light ? 'bg-white' : 'bg-primary'}
                                   rounded-full opacity-10 mix-blend-overlay`} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent
                               rounded-full animate-spinSlow blur-xl opacity-50" />
            </div>
        </div>
    );
};

export const LoadingOverlay = ({ size = 'large', light = true }) => (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center z-50
                    animate-fadeIn">
        <div className="relative p-8 rounded-xl bg-white/5">
            <LoadingSpinner size={size} light={light} />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent rounded-xl
                          animate-pulse blur-xl" />
            <div className="absolute inset-0 bg-shimmer animate-shimmer opacity-20" />
        </div>
    </div>
);

export default LoadingSpinner;