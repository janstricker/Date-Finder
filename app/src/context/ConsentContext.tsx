import React, { createContext, useContext, useEffect, useState } from 'react';
import { isConsentGiven, setConsentGiven } from '../lib/consent';

interface ConsentContextType {
    hasConsent: boolean;
    giveConsent: () => void;
    revokeConsent: () => void;
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
    const [hasConsent, setHasConsentState] = useState<boolean>(() => isConsentGiven());

    useEffect(() => {
        // Sync with local storage events (optional, but good for multi-tab or external updates)
        const handleStorageChange = () => {
            setHasConsentState(isConsentGiven());
        };

        window.addEventListener('consent-change', handleStorageChange);
        return () => window.removeEventListener('consent-change', handleStorageChange);
    }, []);

    const giveConsent = () => {
        setConsentGiven(true);
        setHasConsentState(true);
    };

    const revokeConsent = () => {
        setConsentGiven(false);
        setHasConsentState(false);
    };

    return (
        <ConsentContext.Provider value={{ hasConsent, giveConsent, revokeConsent }}>
            {children}
        </ConsentContext.Provider>
    );
}

export function useConsent() {
    const context = useContext(ConsentContext);
    if (!context) {
        throw new Error('useConsent must be used within a ConsentProvider');
    }
    return context;
}
