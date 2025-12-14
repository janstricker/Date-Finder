

import { cn } from '../../lib/utils';

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    className?: string;
}

export function Switch({ checked, onChange, className }: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
                checked ? "bg-slate-900" : "bg-gray-200",
                className
            )}
        >
            <span
                className={cn(
                    "pointer-events-none block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    checked ? "translate-x-5" : "translate-x-0"
                )}
            />
        </button>
    );
}
