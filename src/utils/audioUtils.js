// Check if audio playback is supported in the browser
export const isAudioPlaybackSupported = () => {
    try {
        return typeof window !== 'undefined' && 
               typeof window.Audio !== 'undefined' && 
               typeof new Audio().play === 'function';
    } catch (e) {
        return false;
    }
};

// Test if a preview URL is valid and can be loaded
export const testAudioUrl = async (url) => {
    if (!url) return false;
    
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok && response.headers.get('content-type')?.includes('audio');
    } catch (e) {
        console.error('Error testing audio URL:', e);
        return false;
    }
};

// Create and setup audio element with error handling
export const createAudio = (url, onEnded, onError) => {
    if (!url) return null;
    
    const audio = new Audio(url);
    
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        if (onError) onError(e);
    });

    // Preload metadata to check if the audio is actually available
    audio.preload = 'metadata';
    
    return audio;
};

// Stop all playing audio except for the provided audio element
export const stopOtherAudio = (currentAudio) => {
    document.querySelectorAll('audio').forEach(audio => {
        if (audio !== currentAudio) {
            audio.pause();
            audio.currentTime = 0;
        }
    });
};

// Format time in seconds to MM:SS
export const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Handle play attempt with proper error catching
export const attemptPlay = async (audio) => {
    if (!audio) return false;

    try {
        await audio.play();
        return true;
    } catch (error) {
        console.error('Playback error:', error);
        return false;
    }
};