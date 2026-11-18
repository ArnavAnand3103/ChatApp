import { useEffect, useState } from 'react';
import { fetchAnalytics } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ChatAnalyticsModal({ isOpen, onClose }) {
    const { token } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetchAnalytics(token);
            if (res?.message && !res.totalUsers) {
                setError(res.message);
            } else {
                setData(res);
            }
        } catch (err) {
            setError(err.message || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const mySent = data?.mySent ?? 0;
    const myReceived = data?.myReceived ?? 0;
    const myTotal = mySent + myReceived;
    const totalMsgs = data?.totalMessages ?? 0;
    const totalUsers = data?.totalUsers ?? 0;
    const totalBlocks = data?.totalBlocks ?? 0;

    const sentRatio = myTotal > 0 ? Math.round((mySent / myTotal) * 100) : 50;
    const receivedRatio = myTotal > 0 ? 100 - sentRatio : 50;
    const platformShare = totalMsgs > 0 ? ((myTotal / totalMsgs) * 100).toFixed(1) : 0;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
                padding: '16px',
                animation: 'fadeIn 0.2s ease'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--card-bg)',
                    color: 'var(--text-color)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '20px',
                    width: '520px',
                    maxWidth: '100%',
                    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Modal Header */}
                <div
                    style={{
                        padding: '20px 24px 16px',
                        borderBottom: '1px solid var(--border-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                            style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                                color: '#ffffff'
                            }}
                        >
                            📊
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px' }}>
                                Chat Analytics
                            </h3>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                Real-time messaging metrics and account activity
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'var(--active-item-bg)',
                            border: '1px solid var(--border-light)',
                            borderRadius: '10px',
                            color: 'var(--text-color)',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.15s ease'
                        }}
                        title="Close analytics"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Content */}
                <div style={{ padding: '24px', overflowY: 'auto', maxHeight: '72vh' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '24px', marginBottom: '10px', animation: 'spin 1s linear infinite' }}>⏳</div>
                            <span>Loading live analytics...</span>
                        </div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#ef4444' }}>
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
                            <p>{error}</p>
                            <button
                                type="button"
                                onClick={loadData}
                                style={{
                                    marginTop: '12px',
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    background: 'var(--accent-blue)',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* KPI Metrics 4-Box Grid */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '12px'
                                }}
                            >
                                {/* Total Messages */}
                                <div
                                    style={{
                                        background: 'var(--active-item-bg)',
                                        border: '1px solid var(--border-light)',
                                        borderRadius: '14px',
                                        padding: '14px 16px'
                                    }}
                                >
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Platform Messages
                                    </div>
                                    <div style={{ fontSize: '26px', fontWeight: 700, margin: '4px 0 2px', color: 'var(--text-color)' }}>
                                        {totalMsgs.toLocaleString()}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        Exchanged across network
                                    </div>
                                </div>

                                {/* Active Users */}
                                <div
                                    style={{
                                        background: 'var(--active-item-bg)',
                                        border: '1px solid var(--border-light)',
                                        borderRadius: '14px',
                                        padding: '14px 16px'
                                    }}
                                >
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Registered Users
                                    </div>
                                    <div style={{ fontSize: '26px', fontWeight: 700, margin: '4px 0 2px', color: 'var(--text-color)' }}>
                                        {totalUsers.toLocaleString()}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        Network members
                                    </div>
                                </div>

                                {/* Sent by Me */}
                                <div
                                    style={{
                                        background: 'var(--active-item-bg)',
                                        border: '1px solid var(--border-light)',
                                        borderRadius: '14px',
                                        padding: '14px 16px'
                                    }}
                                >
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span>📤</span>
                                        <span>My Messages Sent</span>
                                    </div>
                                    <div style={{ fontSize: '26px', fontWeight: 700, margin: '4px 0 2px', color: 'var(--text-color)' }}>
                                        {mySent.toLocaleString()}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        Outbound messages
                                    </div>
                                </div>

                                {/* Received by Me */}
                                <div
                                    style={{
                                        background: 'var(--active-item-bg)',
                                        border: '1px solid var(--border-light)',
                                        borderRadius: '14px',
                                        padding: '14px 16px'
                                    }}
                                >
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span>📥</span>
                                        <span>My Messages Received</span>
                                    </div>
                                    <div style={{ fontSize: '26px', fontWeight: 700, margin: '4px 0 2px', color: 'var(--text-color)' }}>
                                        {myReceived.toLocaleString()}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        Inbound messages
                                    </div>
                                </div>
                            </div>

                            {/* Ratio Breakdown Card */}
                            <div
                                style={{
                                    background: 'var(--active-item-bg)',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '14px',
                                    padding: '16px'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-color)' }}>
                                        Sent vs Received Ratio
                                    </span>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                                        {myTotal} total messages
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div
                                    style={{
                                        width: '100%',
                                        height: '10px',
                                        borderRadius: '6px',
                                        background: '#334155',
                                        overflow: 'hidden',
                                        display: 'flex'
                                    }}
                                >
                                    <div
                                        style={{
                                            width: `${sentRatio}%`,
                                            height: '100%',
                                            background: '#4f46e5',
                                            transition: 'width 0.4s ease'
                                        }}
                                        title={`Sent: ${sentRatio}%`}
                                    />
                                    <div
                                        style={{
                                            width: `${receivedRatio}%`,
                                            height: '100%',
                                            background: '#10b981',
                                            transition: 'width 0.4s ease'
                                        }}
                                        title={`Received: ${receivedRatio}%`}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px' }}>
                                    <span style={{ color: '#4f46e5', fontWeight: 600 }}>
                                        ● Sent: {sentRatio}% ({mySent})
                                    </span>
                                    <span style={{ color: '#10b981', fontWeight: 600 }}>
                                        ● Received: {receivedRatio}% ({myReceived})
                                    </span>
                                </div>
                            </div>

                            {/* Network Security & Engagement Stats */}
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 16px',
                                    background: 'var(--active-item-bg)',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '12px',
                                    fontSize: '13px'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>🛡️</span>
                                    <span>Blocked Contacts</span>
                                </div>
                                <span style={{ fontWeight: 700, color: totalBlocks > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                                    {totalBlocks} {totalBlocks === 1 ? 'user' : 'users'}
                                </span>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 16px',
                                    background: 'var(--active-item-bg)',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '12px',
                                    fontSize: '13px'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>🌐</span>
                                    <span>Your Platform Traffic Share</span>
                                </div>
                                <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>
                                    {platformShare}% of all messages
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div
                    style={{
                        padding: '14px 24px',
                        borderTop: '1px solid var(--border-light)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '10px'
                    }}
                >
                    <button
                        type="button"
                        onClick={loadData}
                        disabled={loading}
                        style={{
                            background: 'var(--active-item-bg)',
                            border: '1px solid var(--border-medium)',
                            borderRadius: '10px',
                            color: 'var(--text-color)',
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <span>🔄</span>
                        <span>Refresh</span>
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#ffffff',
                            padding: '8px 20px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
