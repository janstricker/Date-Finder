import { Mountain } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function Header() {
    const { t } = useLanguage();

    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 bg-white/80 backdrop-blur-md">
            <div className="max-w-6xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <Mountain size={20} className="text-green-500" />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold text-slate-900 leading-tight tracking-tight">
                                {t('header.brand')}
                            </h1>
                            <a
                                href="https://github.com/janstricker/Date-Finder"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-100 hover:bg-blue-100 hover:text-blue-700 transition-colors uppercase tracking-wider translate-y-[1px]"
                            >
                                Beta
                            </a>
                        </div>
                        <span className="text-xs font-medium text-slate-500 tracking-wide">
                            {t('header.app')}
                        </span>
                    </div>
                </div>

                {/* Placeholder for future header actions, e.g. language switcher or user profile */}
                <div className="flex items-center gap-4">
                    {/* Add language switcher here if needed later, currently relying on simple Footer or dedicated config */}
                </div>
            </div>
        </header>
    );
}
