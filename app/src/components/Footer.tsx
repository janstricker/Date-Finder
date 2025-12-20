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
                    <div className="flex items-center gap-1 md:gap-4">
                        <a href="https://fichtelultra.de" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="FichtelUltra Website">
                            <svg width="24" height="24" viewBox="0 0 176 208" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="h-6 w-auto">
                                <path clipRule="evenodd" d="m17.5633.0L158.436 1219e-8V23.2816H17.5633zm0 46.5642H158.436v23.2816H17.5633zM0 187.786l64.3385-36.456-64.33849485-36.456L11.6487 94.6596 88 137.923l76.351-43.2634L176 114.874l-64.339 36.456L176 187.786 164.351 208 88 164.737 11.6487 208z" fillRule="evenodd"></path>
                            </svg>
                        </a>
                        <span className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} <a href="https://fichtelultra.de" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition-colors">{t('header.app')}</a>. {t('footer.rights')}</span>
                    </div>
                    <a
                        href="https://github.com/janstricker/Date-Finder"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-700 transition-all group"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500/70 group-hover:bg-blue-500 transition-colors"></span>
                        v0.1-beta
                    </a>
                    <span className="hidden md:inline text-gray-300">|</span>
                    <span>{t('footer.builtWith')} <span className="text-green-500">♥</span> & <span className="text-gray-700"><a href="https://antigravity.google/" target="_blank" rel="noopener noreferrer">Antigravity</a></span></span>
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
