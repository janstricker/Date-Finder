import { Globe, HelpCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface FooterProps {
    onShowOnboarding?: () => void;
}

export function Footer({ onShowOnboarding }: FooterProps) {
    const { language, setLanguage, t } = useLanguage();

    return (
        <footer className="mt-20 py-8 border-t border-gray-200 bg-white">
            <div className="max-w-6xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4">

                {/* Copyright / Info */}
                <div className="text-sm text-gray-500 flex flex-col md:flex-row items-center gap-1 md:gap-4">
                    <span>&copy; {new Date().getFullYear()} FichtelUltra. {t('footer.rights')}</span>
                    <span className="hidden md:inline text-gray-300">|</span>
                    <span>{t('footer.builtWith')} <span className="text-red-500">♥</span> & <span className="font-semibold text-gray-700">Gemini</span></span>
                </div>

                <div className="flex items-center gap-4">
                    {/* Help Button */}
                    {onShowOnboarding && (
                        <button
                            onClick={onShowOnboarding}
                            className="text-sm font-medium text-gray-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
                        >
                            <HelpCircle className="w-4 h-4" />
                            {t('footer.help')}
                        </button>
                    )}

                    {/* Language Selector */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-1.5 shadow-sm">
                            <Globe className="w-4 h-4 text-gray-400" />
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value as 'en' | 'de')}
                                className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer pr-1"
                            >
                                <option value="de">Deutsch</option>
                                <option value="en">English</option>
                            </select>
                        </div>
                    </div>
                </div>

            </div>
        </footer>
    );
}
