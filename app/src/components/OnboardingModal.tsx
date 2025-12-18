import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useConsent } from '../context/ConsentContext';
import { Sparkles, Sliders, Activity, Calendar, ChevronRight, Check, MapPin, Shield } from 'lucide-react';
import type { TranslationKey } from '../lib/i18n';

interface OnboardingModalProps {
    onClose: () => void;
    showConsent?: boolean;
}

export function OnboardingModal({ onClose, showConsent = true }: OnboardingModalProps) {
    const { t } = useLanguage();
    const { giveConsent } = useConsent();
    const [step, setStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const allSteps = [
        {
            id: 'welcome',
            icon: Sparkles,
            titleKey: 'onboarding.welcome.title' as TranslationKey,
            descKey: 'onboarding.welcome.desc' as TranslationKey,
            color: 'text-amber-500',
            bg: 'bg-amber-100',
            dotColor: 'bg-amber-500'
        },
        {
            id: 'location',
            icon: MapPin,
            titleKey: 'onboarding.location.title' as TranslationKey,
            descKey: 'onboarding.location.desc' as TranslationKey,
            color: 'text-emerald-500',
            bg: 'bg-emerald-100',
            dotColor: 'bg-emerald-500'
        },
        {
            id: 'config',
            icon: Sliders,
            titleKey: 'onboarding.config.title' as TranslationKey,
            descKey: 'onboarding.config.desc' as TranslationKey,
            color: 'text-blue-500',
            bg: 'bg-blue-100',
            dotColor: 'bg-blue-500'
        },
        {
            id: 'analysis',
            icon: Activity,
            titleKey: 'onboarding.analysis.title' as TranslationKey,
            descKey: 'onboarding.analysis.desc' as TranslationKey,
            color: 'text-purple-500',
            bg: 'bg-purple-100',
            dotColor: 'bg-purple-500'
        },
        {
            id: 'visualization',
            icon: Calendar,
            titleKey: 'onboarding.visualization.title' as TranslationKey,
            descKey: 'onboarding.visualization.desc' as TranslationKey,
            color: 'text-emerald-500',
            bg: 'bg-emerald-100',
            dotColor: 'bg-emerald-500'
        },
        {
            id: 'consent',
            icon: Shield,
            titleKey: 'consent.message' as TranslationKey,
            descKey: 'consent.details' as TranslationKey,
            color: 'text-slate-600',
            bg: 'bg-slate-100',
            dotColor: 'bg-slate-500'
        }
    ];

    // Filter steps to exclude consent if not requested
    const steps = showConsent ? allSteps : allSteps.filter(s => s.id !== 'consent');

    const currentStep = steps[step];
    const Icon = currentStep.icon;

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            // FINISH
            // Only give consent if we are actually on the consent step
            if (currentStep.id === 'consent') {
                giveConsent();
            }
            handleClose();
        }
    };

    const handleSkip = () => {
        // Find index of consent step
        const consentIndex = steps.findIndex(s => s.id === 'consent');

        if (consentIndex !== -1 && step < consentIndex) {
            // Jump to consent if available and not there yet
            setStep(consentIndex);
        } else {
            // Otherwise close (e.g. no consent step or already there)
            handleClose();
        }
    };

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
    };

    const isConsentStep = currentStep.id === 'consent';
    const isLastStep = step === steps.length - 1;

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'bg-black/50 backdrop-blur-sm opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0 pointer-events-none'}`}>
            <div className={`bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transition-all duration-300 transform ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>

                {/* Progress Bar */}
                <div className="h-1.5 bg-gray-100 w-full">
                    <div
                        className="h-full bg-blue-600 transition-all duration-500 ease-out"
                        style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                    />
                </div>

                <div className="p-8">
                    {/* Header Icon */}
                    <div className={`w-16 h-16 ${currentStep.bg} rounded-2xl flex items-center justify-center mb-6 transition-colors duration-500`}>
                        <Icon className={`w-8 h-8 ${currentStep.color} transition-colors duration-500`} />
                    </div>

                    {/* Content */}
                    <div className="space-y-4 min-h-[160px]">
                        <h2 className="text-2xl font-bold text-gray-900 animate-in fade-in slide-in-from-bottom-2 duration-300" key={`title-${step}`}>
                            {t(currentStep.titleKey)}
                        </h2>

                        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 delay-100" key={`desc-${step}`}>
                            {/* Special case for Consent Step to look less like a list if possible, but existing list is fine */}
                            {currentStep.descKey === 'consent.details' ? (
                                <p className="text-gray-600 text-[15px] leading-relaxed">
                                    {t(currentStep.descKey)}
                                </p>
                            ) : (
                                <ul className="space-y-2.5">
                                    {t(currentStep.descKey).split('\n').map((line, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-gray-600 text-[15px] leading-snug">
                                            <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${currentStep.dotColor}`} />
                                            <span>{line}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Dots */}
                    <div className="flex justify-center gap-2 mb-8 mt-4">
                        {steps.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-2 rounded-full transition-all duration-300 ${idx === step ? 'w-8 bg-blue-600' : 'w-2 bg-gray-200'}`}
                            />
                        ))}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                        <button
                            onClick={handleSkip}
                            className="text-gray-400 hover:text-gray-600 text-sm font-medium px-4 py-2 transition-colors"
                        >
                            {/* Show 'Close' if last step OR if next step is last step (consent) and we want to skip it? No, keep it simple */}
                            {isLastStep ? t('onboarding.close') : t('onboarding.skip')}
                        </button>

                        <div className="flex gap-3">
                            {step > 0 && (
                                <button
                                    onClick={() => setStep(step - 1)}
                                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                >
                                    {t('onboarding.back')}
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                className={`px-5 py-2.5 rounded-xl text-white font-medium transition-all shadow-lg flex items-center gap-2 ${isLastStep ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
                            >
                                {isLastStep ? (
                                    <>
                                        {isConsentStep ? t('consent.accept') : t('onboarding.finish')}
                                        <Check className="w-4 h-4" />
                                    </>
                                ) : (
                                    <>
                                        {t('onboarding.next')}
                                        <ChevronRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
