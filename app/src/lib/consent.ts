
export const CONSENT_KEY = 'privacy_consent';

export function isConsentGiven(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(CONSENT_KEY) === 'true';
}

export function setConsentGiven(given: boolean) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CONSENT_KEY, String(given));
    // Dispatch a custom event so non-React code or parallel components can react if needed
    window.dispatchEvent(new Event('consent-change'));
}
