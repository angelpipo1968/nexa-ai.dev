'use client';

import * as Sentry from '@sentry/nextjs';

export default function SentryExamplePage() {
    return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
            <h1>Sentry Test Page</h1>
            <p>Click the button below to test Sentry error capture.</p>
            <button
                onClick={() => {
                    Sentry.captureMessage('Test message from Sentry example page', 'info');
                    throw new Error('Sentry Test Error - This is intentional!');
                }}
                style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                    backgroundColor: '#6c5ce7',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginTop: '20px',
                }}
            >
                Throw Test Error
            </button>
        </div>
    );
}
