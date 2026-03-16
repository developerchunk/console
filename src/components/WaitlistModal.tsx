'use client';

import { useState } from 'react';

interface WaitlistModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const COUNTRIES = [
    'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria', 'Bangladesh',
    'Belgium', 'Brazil', 'Canada', 'Chile', 'China', 'Colombia', 'Czech Republic', 'Denmark',
    'Egypt', 'Ethiopia', 'Finland', 'France', 'Germany', 'Ghana', 'Greece', 'Hong Kong',
    'Hungary', 'India', 'Indonesia', 'Ireland', 'Israel', 'Italy', 'Japan', 'Kenya',
    'Luxembourg', 'Malaysia', 'Mexico', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway',
    'Pakistan', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Romania', 'Russia',
    'Saudi Arabia', 'Singapore', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka',
    'Sweden', 'Switzerland', 'Taiwan', 'Thailand', 'Turkey', 'Ukraine', 'United Kingdom',
    'United States', 'Venezuela', 'Vietnam', 'Other',
].sort();

export default function WaitlistModal({ isOpen, onClose }: WaitlistModalProps) {
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        company: '',
        designation: '',
        country: '',
        isLookingForSDUI: '',
        consentData: true,
        subscribeUpdates: true,
    });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.fullName.trim()) errs.fullName = 'Full name is required';
        if (!form.email.trim()) errs.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email';
        if (!form.company.trim()) errs.company = 'Company is required';
        if (!form.designation.trim()) errs.designation = 'Designation is required';
        if (!form.country) errs.country = 'Country is required';
        if (!form.isLookingForSDUI) errs.isLookingForSDUI = 'Please select an option';
        return errs;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setLoading(true);
        await new Promise(r => setTimeout(r, 1600));
        setLoading(false);
        setSubmitted(true);
    };

    const set = (field: string, val: string | boolean) => {
        setForm(p => ({ ...p, [field]: val }));
        if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
                backdropFilter: 'blur(14px) saturate(110%)',
                WebkitBackdropFilter: 'blur(14px) saturate(110%)',
                backgroundColor: 'rgba(2, 6, 23, 0.78)',
                backgroundImage: 'linear-gradient(180deg, rgba(2, 6, 23, 0.72), rgba(2, 6, 23, 0.85))',
                animation: 'waitlistOverlayIn 120ms ease-out both',
            }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="card relative w-full max-w-115 max-h-[92vh] overflow-y-auto"
                style={{
                    boxShadow: '0 0 0 1px rgba(37, 99, 235, 0.07), 0 24px 64px rgba(0, 0, 0, 0.75), 0 4px 16px rgba(0, 0, 0, 0.5)',
                    animation: 'waitlistCardIn 140ms ease-out both',
                }}
            >
                <div className="card__edge-glow" />
                {/* Close */}
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150"
                    style={{ color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M1 1l12 12M13 1L1 13" />
                    </svg>
                </button>

                <div className="p-8">
                    {submitted ? (
                        <SuccessState onClose={onClose} />
                    ) : (
                        <>
                            {/* Header */}
                            <div className="mb-7">
                                <p
                                    className="text-xs font-semibold uppercase tracking-widest mb-3"
                                    style={{ color: 'var(--accent-hover)', fontFamily: 'Urbanist, sans-serif' }}
                                >
                                    Early Access
                                </p>
                                <h2
                                    className="text-2xl font-bold mb-2"
                                    style={{ color: 'var(--text)', fontFamily: 'Urbanist, sans-serif', letterSpacing: '-0.02em' }}
                                >
                                    Join the Waitlist
                                </h2>
                                <p
                                    className="text-sm"
                                    style={{ color: 'var(--text-secondary)', fontFamily: 'Urbanist, sans-serif', lineHeight: 1.6 }}
                                >
                                    Be among the first to shape the future of Server-Driven UI for Android.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Field label="Full Name" id="fullName" type="text" placeholder="First name Last name"
                                    value={form.fullName} error={errors.fullName} onChange={v => set('fullName', v)} />
                                <Field label="Email" id="email" type="email" placeholder="jane@company.com"
                                    hint="Business email preferred"
                                    value={form.email} error={errors.email} onChange={v => set('email', v)} />
                                <Field label="Company" id="company" type="text" placeholder="Acme Corp"
                                    value={form.company} error={errors.company} onChange={v => set('company', v)} />
                                <Field label="Designation" id="designation" type="text" placeholder="Senior Android Engineer"
                                    value={form.designation} error={errors.designation} onChange={v => set('designation', v)} />

                                {/* Country */}
                                <div>
                                    <label htmlFor="country" className="block text-xs font-semibold mb-1.5"
                                        style={{ color: 'var(--text-secondary)', fontFamily: 'Urbanist, sans-serif', letterSpacing: '0.01em' }}>
                                        Country
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="country"
                                            value={form.country}
                                            onChange={e => set('country', e.target.value)}
                                            className="w-full px-4 py-3 pr-10 text-sm appearance-none outline-none transition-all duration-150"
                                            style={{
                                                background: 'var(--bg-surface)',
                                                border: `1px solid ${errors.country ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
                                                borderRadius: 'var(--radius-sm)',
                                                color: form.country ? 'var(--text)' : 'var(--text-tertiary)',
                                                fontFamily: 'Urbanist, sans-serif',
                                            }}
                                        >
                                            <option value="" disabled style={{ background: '#111' }}>Select your country</option>
                                            {COUNTRIES.map(c => (
                                                <option key={c} value={c} style={{ background: '#111', color: '#f5f5f7' }}>{c}</option>
                                            ))}
                                        </select>
                                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-tertiary)' }}>
                                            <path d="M2 4l4 4 4-4" />
                                        </svg>
                                    </div>
                                    {errors.country && <p className="mt-1 text-xs" style={{ color: 'rgb(239,68,68)' }}>{errors.country}</p>}
                                </div>

                                {/* SDUI toggle */}
                                <div>
                                    <label className="block text-xs font-semibold mb-2"
                                        style={{ color: 'var(--text-secondary)', fontFamily: 'Urbanist, sans-serif' }}>
                                        Is your company / app actively looking to integrate Server-Driven UI?
                                    </label>
                                    <div className="flex gap-2">
                                        {['Yes', 'No', 'Evaluating'].map(opt => (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => set('isLookingForSDUI', opt)}
                                                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                                                style={{
                                                    fontFamily: 'Urbanist, sans-serif',
                                                    background: form.isLookingForSDUI === opt ? 'var(--accent-soft)' : 'var(--bg-surface)',
                                                    border: `1px solid ${form.isLookingForSDUI === opt ? 'rgba(37,99,235,0.35)' : 'var(--border)'}`,
                                                    color: form.isLookingForSDUI === opt ? 'var(--accent-hover)' : 'var(--text-tertiary)',
                                                    borderRadius: 'var(--radius-sm)',
                                                }}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                    {errors.isLookingForSDUI && <p className="mt-1 text-xs" style={{ color: 'rgb(239,68,68)' }}>{errors.isLookingForSDUI}</p>}
                                </div>

                                {/* Divider */}
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }} />

                                {/* Checkboxes */}
                                <div className="space-y-3">
                                    <Check id="consentData" checked={form.consentData} onChange={v => set('consentData', v)}
                                        label="I allow the Ketoy.dev team to use the above details (including email) for early access outreach and product updates." />
                                    <Check id="subscribeUpdates" checked={form.subscribeUpdates} onChange={v => set('subscribeUpdates', v)}
                                        label="Subscribe to Ketoy.dev future updates and announcements." />
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 font-semibold text-sm text-white transition-all duration-200 mt-1"
                                    style={{
                                        fontFamily: 'Urbanist, sans-serif',
                                        background: loading ? 'rgba(37,99,235,0.5)' : 'var(--accent)',
                                        border: '1px solid var(--accent)',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        boxShadow: loading ? 'none' : '0 0 24px var(--accent-glow)',
                                    }}
                                    onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-hover)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 32px var(--accent-glow)'; } }}
                                    onMouseLeave={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px var(--accent-glow)'; } }}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                            </svg>
                                            Securing your spot…
                                        </span>
                                    ) : (
                                        'Secure My Spot →'
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Field({ label, id, type, placeholder, hint, value, error, onChange }: {
    label: string; id: string; type: string; placeholder: string;
    hint?: string; value: string; error?: string; onChange: (v: string) => void;
}) {
    return (
        <div>
            <label htmlFor={id} className="block text-xs font-semibold mb-1.5"
                style={{ color: 'var(--text-secondary)', fontFamily: 'Urbanist, sans-serif' }}>
                {label}
                {hint && <span className="ml-1.5 font-normal" style={{ color: 'var(--text-tertiary)' }}>({hint})</span>}
            </label>
            <input
                id={id} type={type} placeholder={placeholder} value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full px-4 py-3 text-sm outline-none transition-all duration-150"
                style={{
                    background: 'var(--bg-surface)',
                    border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text)',
                    fontFamily: 'Urbanist, sans-serif',
                }}
                onFocus={e => {
                    e.currentTarget.style.borderColor = 'rgba(37,99,235,0.4)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)';
                }}
                onBlur={e => {
                    e.currentTarget.style.borderColor = error ? 'rgba(239,68,68,0.5)' : 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            />
            {error && <p className="mt-1 text-xs" style={{ color: 'rgb(239,68,68)' }}>{error}</p>}
        </div>
    );
}

function Check({ id, checked, onChange, label }: {
    id: string; checked: boolean; onChange: (v: boolean) => void; label: string;
}) {
    return (
        <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
            <div className="relative shrink-0 mt-0.5" onClick={() => onChange(!checked)}>
                <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only" />
                <div
                    className="w-4 h-4 rounded flex items-center justify-center transition-all duration-150"
                    style={{
                        background: checked ? 'var(--accent-soft)' : 'var(--bg-surface)',
                        border: `1px solid ${checked ? 'rgba(37,99,235,0.4)' : 'var(--border)'}`,
                        borderRadius: '4px',
                    }}
                >
                    {checked && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1 4l2 2 4-3.5" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </div>
            </div>
            <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'Urbanist, sans-serif' }}>
                {label}
            </span>
        </label>
    );
}

function SuccessState({ onClose }: { onClose: () => void }) {
    return (
        <div className="text-center py-8 flex flex-col items-center">
            <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5"
                style={{ background: 'var(--accent-soft)', border: '1px solid rgba(37,99,235,0.2)' }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-hover)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                </svg>
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)', fontFamily: 'Urbanist, sans-serif' }}>
                You&apos;re on the list!
            </h3>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'Urbanist, sans-serif', maxWidth: 300 }}>
                Thanks for joining the Ketoy waitlist. We&apos;ll be in touch when early access opens — keep building great apps!
            </p>
            <button
                onClick={onClose}
                className="px-8 py-2.5 text-sm font-semibold transition-all duration-150"
                style={{
                    fontFamily: 'Urbanist, sans-serif',
                    background: 'var(--accent)',
                    border: '1px solid var(--accent)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ffffff',
                    boxShadow: '0 0 20px var(--accent-glow)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
            >
                Done
            </button>
        </div>
    );
}
