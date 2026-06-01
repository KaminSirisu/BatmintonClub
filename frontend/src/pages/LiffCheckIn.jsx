import { useEffect, useState } from 'react';
import liff from '@line/liff';
import {
    AlertCircle,
    Check,
    CheckCircle2,
    Clock3,
    MapPin,
    ShieldCheck,
    UserRound,
} from 'lucide-react';
import { useLanguage } from '../utils/LanguageProvider.jsx';

const LIFF_ID = import.meta.env.VITE_LIFF_ID;
const API_URL = import.meta.env.VITE_API_URL;

function LiffCheckIn() {
    const { t } = useLanguage();
    const [clubId] = useState(
        () => new URLSearchParams(window.location.search).get('clubId')
    );

    const [profile, setProfile] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        async function initializeLiff() {
            try {
                if (!LIFF_ID) {
                    throw new Error('VITE_LIFF_ID is missing.');
                }

                await liff.init({ liffId: LIFF_ID });

                if (!clubId) {
                    throw new Error('The QR code is missing clubId.');
                }

                if (!liff.isLoggedIn()) {
                    liff.login({
                        redirectUri: window.location.href,
                    });
                    return;
                }

                const lineProfile = await liff.getProfile();
                setProfile(lineProfile);
            } catch (err) {
                console.error('LIFF initialization failed:', err);
                setError(err.message || 'Unable to load LINE profile.');
            } finally {
                setIsLoading(false);
            }
        }

        initializeLiff();
    }, [clubId]);

    async function handleConfirmCheckIn() {
        try {
            setIsSubmitting(true);
            setError('');

            if (!API_URL) {
                throw new Error('VITE_API_URL is missing.');
            }

            const response = await fetch(`${API_URL}/api/line/qr-checkin`, {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                clubId,
                lineUserId: profile.userId,
                lineDisplayName: profile.displayName,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                throw new Error(data.message || 'Unable to check in.');
            }

            setResult(data);
        } catch (err) {
            console.error('QR check-in failed:', err);
            setError(err.message || 'Unable to check in.');
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
                <section className="text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
                    <p className="mt-5 text-sm font-medium text-slate-600">
                        {t('Loading your LINE profile...')}
                    </p>
                </section>
            </main>
        );
    }

    if (error && !profile) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
                <section className="w-full max-w-md rounded-3xl border border-rose-100 bg-white p-7 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                        <AlertCircle size={28} />
                    </div>
                    <h1 className="mt-5 text-xl font-bold text-slate-900">
                        {t('Unable to open check-in')}
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{error}</p>
                    <p className="mt-5 text-xs leading-5 text-slate-400">
                        {t('Please scan the club QR code again or ask an admin for help.')}
                    </p>
                </section>
            </main>
        );
    }

    if (result) {
        const isPendingProfile = result.checkIn.status === 'pending_profile';

        return (
            <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-slate-50 px-5 py-8 text-slate-900">
                <section className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
                    <div className="bg-emerald-600 px-6 py-8 text-center text-white">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                            <CheckCircle2 size={38} strokeWidth={2.5} />
                        </div>
                        <h1 className="mt-4 text-2xl font-bold">{t('Check-in successful')}</h1>
                        <p className="mt-2 text-sm text-emerald-50">
                            {t('Your arrival has been recorded.')}
                        </p>
                    </div>

                    <div className="p-6">
                        <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                {t('player')}
                            </p>
                            <p className="mt-1 text-lg font-bold text-slate-900">
                                {result.checkIn.name}
                            </p>
                            {result.checkIn.skillLevel && (
                                <p className="mt-1 text-sm text-slate-600">
                                    {t('skill level')}: {result.checkIn.skillLevel}
                                </p>
                            )}
                        </div>

                        <div className={`mt-4 rounded-2xl p-4 ${
                            isPendingProfile
                                ? 'bg-amber-50 text-amber-900'
                                : 'bg-emerald-50 text-emerald-900'
                        }`}>
                            <div className="flex items-start gap-3">
                                {isPendingProfile
                                    ? <Clock3 className="mt-0.5 shrink-0" size={20} />
                                    : <Check className="mt-0.5 shrink-0" size={20} />
                                }
                                <div>
                                    <p className="font-semibold">
                                        {isPendingProfile
                                            ? t('Waiting for admin setup')
                                            : t('Ready for matchmaking')
                                        }
                                    </p>
                                    <p className="mt-1 text-sm leading-5 opacity-80">
                                        {isPendingProfile
                                            ? t('An admin will assign your player name and skill level.')
                                            : t("You are now in today's player queue.")
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        {result.duplicate && (
                            <p className="mt-4 text-center text-xs text-slate-500">
                                {t('You were already checked in today. No duplicate was created.')}
                            </p>
                        )}
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-slate-50 px-5 py-8 text-slate-900">
            <section className="mx-auto w-full max-w-md">
                <header className="px-2 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-200">
                        <MapPin size={28} />
                    </div>
                    <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                        {t('clubTitle')}
                    </p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight">
                        {t('Confirm your arrival')}
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        {t("Please check the details below before joining today's player queue.")}
                    </p>
                </header>

                <div className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            {t('LINE profile')}
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                            {profile.pictureUrl ? (
                                <img
                                    src={profile.pictureUrl}
                                    alt=""
                                    className="h-12 w-12 rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                                    <UserRound size={22} />
                                </div>
                            )}
                            <div>
                                <p className="font-bold text-slate-900">{profile.displayName}</p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {t('Signed in with LINE')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            {t('Check-in location')}
                        </p>
                        <div className="mt-3 flex gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                <MapPin size={19} />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">
                                    {t('Club check-in desk')}
                                </p>
                                <p className="mt-1 break-all text-xs leading-5 text-slate-500">
                                    {t('Club ID')}: {clubId}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-rose-700">
                        <AlertCircle className="mt-0.5 shrink-0" size={19} />
                        <p className="text-sm leading-5">{error}</p>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleConfirmCheckIn}
                    disabled={isSubmitting}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-base font-bold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
                >
                    {isSubmitting ? (
                        <>
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                            {t('Checking you in...')}
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={21} />
                            {t('Confirm Check-in')}
                        </>
                    )}
                </button>

                <div className="mt-5 flex items-center justify-center gap-2 text-center text-xs leading-5 text-slate-500">
                    <ShieldCheck className="shrink-0 text-emerald-600" size={16} />
                    {t('Check-in happens only after you tap confirm.')}
                </div>
            </section>
        </main>
    );
}

export default LiffCheckIn;
