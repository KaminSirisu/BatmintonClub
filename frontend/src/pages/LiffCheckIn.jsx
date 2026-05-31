import { useEffect, useState } from "react";
import liff from '@line/liff';

const LIFF_ID = import.meta.env.VITE_LIFF_ID;
const API_URL = import.meta.env.VITE_API_URL;

function LiffCheckIn() {
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
        return <main>Loading LINE profile...</main>;
    }

    if (error && !profile) {
        return <main>{error}</main>;
    }

    if (result) {
        return (
        <main>
            <h1>{result.message}</h1>
            <p>Name: {result.checkIn.name}</p>
            {result.checkIn.skillLevel && (
            <p>Skill level: {result.checkIn.skillLevel}</p>
            )}
            <p>Status: {result.checkIn.status}</p>
        </main>
        );
    }

    return (
        <main>
        <h1>Badminton Club Check-in</h1>
        <p>Welcome, {profile.displayName}</p>
        <p>Club: {clubId}</p>
        <p>Please confirm your arrival.</p>

        {error && <p>{error}</p>}

        <button
            type="button"
            onClick={handleConfirmCheckIn}
            disabled={isSubmitting}
        >
            {isSubmitting ? 'Checking in...' : 'Confirm Check-in'}
        </button>
        </main>
    );

}

export default LiffCheckIn;