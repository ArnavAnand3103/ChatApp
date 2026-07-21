import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    summarizeChatAPI, chatRAGAPI, documentRAGAPI,
    semanticSearchAPI, generateStickerAPI, editImageAPI,
    extractTasksAPI, multiAgentAPI
} from '../../services/api';

const TABS = [
    { id: 'summarize',  label: '📋 Summarize',      icon: '📋' },
    { id: 'chat-rag',   label: '💬 Chat Q&A',        icon: '💬' },
    { id: 'doc-rag',    label: '📄 Doc Q&A',          icon: '📄' },
    { id: 'search',     label: '🔍 Semantic Search',  icon: '🔍' },
    { id: 'sticker',    label: '🎨 Sticker',          icon: '🎨' },
    { id: 'edit-img',   label: '✏️ Edit Image',       icon: '✏️' },
    { id: 'tasks',      label: '✅ Tasks',             icon: '✅' },
    { id: 'multi-agent',label: '🤖 Multi-Agent',      icon: '🤖' },
];

export default function AIPanelModal({ onClose, selectedUser, onSendImageMessage }) {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState('summarize');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    // Input states per tab
    const [ragQuestion, setRagQuestion] = useState('');
    const [docText, setDocText] = useState('');
    const [docQuestion, setDocQuestion] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [stickerPrompt, setStickerPrompt] = useState('');
    const [editOrigPrompt, setEditOrigPrompt] = useState('');
    const [editInstruction, setEditInstruction] = useState('');
    const [agentGoal, setAgentGoal] = useState('');

    const withEmail = selectedUser?.isGroup ? selectedUser._id : (selectedUser?.email || '');

    const reset = () => { setResult(null); setError(''); };

    const run = async (fn) => {
        setLoading(true);
        setResult(null);
        setError('');
        try {
            const data = await fn();
            if (!data.success) throw new Error(data.message || 'Failed');
            setResult(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSticker = async () => {
        setLoading(true);
        setResult(null);
        setError('');
        try {
            const data = await generateStickerAPI(token, stickerPrompt, withEmail);
            if (!data.success) throw new Error(data.message || 'Failed');
            setResult(data);
            if (withEmail !== 'ai@chatapp.com' && onSendImageMessage) {
                onSendImageMessage(data.imageUrl, `[Sticker] ${stickerPrompt}`);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEditImage = async () => {
        setLoading(true);
        setResult(null);
        setError('');
        try {
            const data = await editImageAPI(token, editOrigPrompt, editInstruction, withEmail);
            if (!data.success) throw new Error(data.message || 'Failed');
            setResult(data);
            if (withEmail !== 'ai@chatapp.com' && onSendImageMessage) {
                onSendImageMessage(data.imageUrl, `[Edit] ${editOrigPrompt} → ${editInstruction}`);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (id) => { setActiveTab(id); reset(); };

    const renderContent = () => {
        switch (activeTab) {

            case 'summarize':
                return (
                    <div style={styles.tabBody}>
                        <p style={styles.desc}>Summarize the current conversation with <b>{selectedUser?.name || 'this contact'}</b>.</p>
                        <button style={styles.btn} onClick={() => run(() => summarizeChatAPI(token, withEmail))} disabled={loading || !withEmail}>
                            {loading ? '⏳ Summarizing...' : '📋 Summarize Chat'}
                        </button>
                        {result?.summary && <div style={styles.resultBox}><pre style={styles.pre}>{result.summary}</pre></div>}
                    </div>
                );

            case 'chat-rag':
                return (
                    <div style={styles.tabBody}>
                        <p style={styles.desc}>Ask any question about the chat with <b>{selectedUser?.name || 'this contact'}</b>.</p>
                        <input style={styles.input} placeholder="e.g. What did we agree on?" value={ragQuestion} onChange={e => setRagQuestion(e.target.value)} />
                        <button style={styles.btn} onClick={() => run(() => chatRAGAPI(token, withEmail, ragQuestion))} disabled={loading || !withEmail || !ragQuestion.trim()}>
                            {loading ? '⏳ Thinking...' : '💬 Ask'}
                        </button>
                        {result?.answer && <div style={styles.resultBox}><pre style={styles.pre}>{result.answer}</pre></div>}
                    </div>
                );

            case 'doc-rag':
                return (
                    <div style={styles.tabBody}>
                        <p style={styles.desc}>Paste a document and ask questions about it.</p>
                        <textarea style={{...styles.input, height: '120px', resize: 'vertical'}} placeholder="Paste document text here..." value={docText} onChange={e => setDocText(e.target.value)} />
                        <input style={styles.input} placeholder="Your question about the document..." value={docQuestion} onChange={e => setDocQuestion(e.target.value)} />
                        <button style={styles.btn} onClick={() => run(() => documentRAGAPI(token, docText, docQuestion))} disabled={loading || !docText.trim() || !docQuestion.trim()}>
                            {loading ? '⏳ Thinking...' : '📄 Ask Document'}
                        </button>
                        {result?.answer && <div style={styles.resultBox}><pre style={styles.pre}>{result.answer}</pre></div>}
                    </div>
                );

            case 'search':
                return (
                    <div style={styles.tabBody}>
                        <p style={styles.desc}>Search messages by meaning (not just keywords) from <b>{selectedUser?.name || 'this chat'}</b>.</p>
                        <input style={styles.input} placeholder="e.g. plans for next week" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        <button style={styles.btn} onClick={() => run(() => semanticSearchAPI(token, withEmail, searchQuery))} disabled={loading || !withEmail || !searchQuery.trim()}>
                            {loading ? '⏳ Searching...' : '🔍 Search'}
                        </button>
                        {result?.results && (
                            <div style={styles.resultBox}>
                                {result.results.length === 0
                                    ? <p style={styles.noResult}>No relevant messages found.</p>
                                    : result.results.map((m, i) => (
                                        <div key={i} style={styles.searchResult}>
                                            <span style={styles.searchFrom}>{m.from}:</span>
                                            <span style={styles.searchMsg}>{m.message || '[media]'}</span>
                                        </div>
                                    ))
                                }
                            </div>
                        )}
                    </div>
                );

            case 'sticker':
                return (
                    <div style={styles.tabBody}>
                        <p style={styles.desc}>Generate an AI sticker for any idea!</p>
                        <input style={styles.input} placeholder="e.g. Happy cat with sunglasses" value={stickerPrompt} onChange={e => setStickerPrompt(e.target.value)} />
                        <button style={styles.btn} onClick={handleGenerateSticker} disabled={loading || !stickerPrompt.trim()}>
                            {loading ? '⏳ Generating...' : '🎨 Generate Sticker'}
                        </button>
                        {result?.imageUrl && (
                            <div style={styles.imgResult}>
                                <img src={result.imageUrl} alt="sticker" style={styles.img} />
                            </div>
                        )}
                    </div>
                );

            case 'edit-img':
                return (
                    <div style={styles.tabBody}>
                        <p style={styles.desc}>Describe the original image and tell AI what to change.</p>
                        <input style={styles.input} placeholder="Original image description (e.g. a cat on a couch)" value={editOrigPrompt} onChange={e => setEditOrigPrompt(e.target.value)} />
                        <input style={styles.input} placeholder="Edit instruction (e.g. make it look like a watercolor painting)" value={editInstruction} onChange={e => setEditInstruction(e.target.value)} />
                        <button style={styles.btn} onClick={handleEditImage} disabled={loading || !editOrigPrompt.trim() || !editInstruction.trim()}>
                            {loading ? '⏳ Editing...' : '✏️ Apply Edit'}
                        </button>
                        {result?.imageUrl && (
                            <div style={styles.imgResult}>
                                <img src={result.imageUrl} alt="edited" style={styles.img} />
                            </div>
                        )}
                    </div>
                );

            case 'tasks':
                return (
                    <div style={styles.tabBody}>
                        <p style={styles.desc}>Extract action items and tasks from your conversation with <b>{selectedUser?.name || 'this contact'}</b>.</p>
                        <button style={styles.btn} onClick={() => run(() => extractTasksAPI(token, withEmail))} disabled={loading || !withEmail}>
                            {loading ? '⏳ Extracting...' : '✅ Extract Tasks'}
                        </button>
                        {result?.tasks && (
                            <div style={styles.resultBox}>
                                {result.tasks.length === 0
                                    ? <p style={styles.noResult}>No tasks found in this conversation.</p>
                                    : result.tasks.map((t, i) => (
                                        <div key={i} style={styles.taskCard}>
                                            <div style={styles.taskTitle}>
                                                <span style={{ ...styles.badge, background: t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#22c55e' }}>
                                                    {t.priority}
                                                </span>
                                                {t.task}
                                            </div>
                                            {t.assignedTo && <div style={styles.taskMeta}>👤 {t.assignedTo}</div>}
                                            {t.dueDate && <div style={styles.taskMeta}>📅 {t.dueDate}</div>}
                                        </div>
                                    ))
                                }
                            </div>
                        )}
                    </div>
                );

            case 'multi-agent':
                return (
                    <div style={styles.tabBody}>
                        <p style={styles.desc}>Give AI a complex goal. A <b>Planner Agent</b> breaks it into sub-tasks, and an <b>Executor Agent</b> completes each one.</p>
                        <textarea style={{...styles.input, height: '80px', resize: 'vertical'}} placeholder="e.g. Write a complete marketing plan for a new coffee shop" value={agentGoal} onChange={e => setAgentGoal(e.target.value)} />
                        <button style={styles.btn} onClick={() => run(() => multiAgentAPI(token, agentGoal))} disabled={loading || !agentGoal.trim()}>
                            {loading ? '⏳ Running agents...' : '🤖 Run Multi-Agent'}
                        </button>
                        {result && (
                            <div style={styles.resultBox}>
                                <div style={styles.agentGoal}>🎯 Goal: {result.goal}</div>
                                {result.results?.map((r, i) => (
                                    <div key={i} style={styles.agentTask}>
                                        <div style={styles.agentTaskLabel}>📌 Sub-task {i + 1}: {r.task}</div>
                                        <pre style={styles.pre}>{r.result}</pre>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            default: return null;
        }
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={styles.header}>
                    <span style={styles.headerTitle}>🤖 AI Tools</span>
                    <button style={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* Tab bar */}
                <div style={styles.tabBar}>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            style={{ ...styles.tabBtn, ...(activeTab === tab.id ? styles.tabBtnActive : {}) }}
                            onClick={() => handleTabChange(tab.id)}
                            title={tab.label}
                        >
                            {tab.icon}
                        </button>
                    ))}
                </div>

                {/* Tab label */}
                <div style={styles.tabLabel}>{TABS.find(t => t.id === activeTab)?.label}</div>

                {/* Error */}
                {error && <div style={styles.errorBox}>⚠️ {error}</div>}

                {/* Tab content */}
                <div style={styles.body}>
                    {renderContent()}
                </div>

            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, backdropFilter: 'blur(4px)'
    },
    modal: {
        background: 'linear-gradient(145deg, #1a1a2e, #16213e)',
        borderRadius: '18px', width: '520px', maxWidth: '95vw',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden'
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)'
    },
    headerTitle: { color: '#e2e8f0', fontSize: '17px', fontWeight: 700, letterSpacing: '0.5px' },
    closeBtn: {
        background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px',
        color: '#94a3b8', cursor: 'pointer', fontSize: '16px', padding: '4px 10px',
        transition: 'background 0.2s'
    },
    tabBar: {
        display: 'flex', flexWrap: 'wrap', gap: '6px',
        padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)'
    },
    tabBtn: {
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px', color: '#94a3b8', cursor: 'pointer', fontSize: '18px',
        padding: '7px 11px', transition: 'all 0.2s'
    },
    tabBtnActive: {
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        border: '1px solid #6366f1', color: '#fff',
        boxShadow: '0 4px 15px rgba(99,102,241,0.4)'
    },
    tabLabel: {
        color: '#c4b5fd', fontSize: '13px', fontWeight: 600,
        padding: '8px 20px 0', letterSpacing: '0.5px'
    },
    errorBox: {
        background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: '10px', color: '#fca5a5', fontSize: '13px',
        margin: '10px 16px 0', padding: '10px 14px'
    },
    body: { overflowY: 'auto', flex: 1, padding: '4px 0' },
    tabBody: { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' },
    desc: { color: '#94a3b8', fontSize: '13px', margin: 0, lineHeight: 1.5 },
    input: {
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px', color: '#e2e8f0', fontSize: '14px', outline: 'none',
        padding: '10px 14px', width: '100%', boxSizing: 'border-box',
        fontFamily: 'inherit'
    },
    btn: {
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        border: 'none', borderRadius: '12px', color: '#fff',
        cursor: 'pointer', fontSize: '14px', fontWeight: 600,
        padding: '11px 20px', transition: 'opacity 0.2s', alignSelf: 'flex-start'
    },
    resultBox: {
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', padding: '14px', maxHeight: '280px', overflowY: 'auto'
    },
    pre: {
        color: '#cbd5e1', fontSize: '13px', margin: 0,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit'
    },
    noResult: { color: '#64748b', textAlign: 'center', fontSize: '13px', margin: 0 },
    searchResult: {
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '8px 0', display: 'flex', gap: '8px', alignItems: 'flex-start'
    },
    searchFrom: { color: '#a78bfa', fontWeight: 600, fontSize: '12px', minWidth: '60px', paddingTop: '1px' },
    searchMsg: { color: '#cbd5e1', fontSize: '13px' },
    imgResult: { display: 'flex', justifyContent: 'center', marginTop: '4px' },
    img: { maxWidth: '100%', maxHeight: '280px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' },
    taskCard: {
        background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
        padding: '10px 12px', marginBottom: '8px',
        border: '1px solid rgba(255,255,255,0.06)'
    },
    taskTitle: { color: '#e2e8f0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' },
    taskMeta: { color: '#64748b', fontSize: '12px', marginTop: '4px' },
    badge: {
        borderRadius: '6px', color: '#fff', fontSize: '10px',
        fontWeight: 700, padding: '2px 6px', textTransform: 'uppercase'
    },
    agentGoal: {
        color: '#a78bfa', fontWeight: 600, fontSize: '14px',
        marginBottom: '12px', paddingBottom: '8px',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
    },
    agentTask: {
        background: 'rgba(99,102,241,0.08)', borderRadius: '10px',
        padding: '10px 12px', marginBottom: '10px',
        border: '1px solid rgba(99,102,241,0.2)'
    },
    agentTaskLabel: {
        color: '#c4b5fd', fontWeight: 600, fontSize: '13px', marginBottom: '8px'
    }
};
