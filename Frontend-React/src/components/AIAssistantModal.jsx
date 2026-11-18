import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    chatWithAI,
    fetchAIHistory,
    generateImage,
    editImage,
    uploadRAGDocument,
    queryRAGDocument,
    fetchRAGDocumentStatus,
    clearRAGDocument,
    queryChatRAG,
    performSemanticSearch,
    extractTasks
} from '../services/api';

export default function AIAssistantModal({ isOpen, onClose, selectedUser, socket }) {
    const { token, user } = useAuth();
    const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'image' | 'doc_rag' | 'chat_rag' | 'search'

    // Feature 1: AI Chat State
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [chatError, setChatError] = useState('');
    const [lastFailedMessage, setLastFailedMessage] = useState('');
    const chatScrollRef = useRef(null);

    // Feature 2: Image Gen State
    const [imagePrompt, setImagePrompt] = useState('');
    const [imageLoading, setImageLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [imageError, setImageError] = useState('');
    const [sendChatSuccess, setSendChatSuccess] = useState('');
    const [textSendSuccess, setTextSendSuccess] = useState('');

    // Feature 3: Document RAG State
    const [docStatus, setDocStatus] = useState(null);
    const [docLoading, setDocLoading] = useState(false);
    const [docError, setDocError] = useState('');
    const [docQuery, setDocQuery] = useState('');
    const [docAnswer, setDocAnswer] = useState(null);
    const fileInputRef = useRef(null);

    // Feature 4: Chat RAG State
    const [chatRagQuery, setChatRagQuery] = useState('');
    const [chatRagScope, setChatRagScope] = useState(selectedUser ? 'current' : 'all');
    const [chatRagLoading, setChatRagLoading] = useState(false);
    const [chatRagAnswer, setChatRagAnswer] = useState(null);
    const [chatRagError, setChatRagError] = useState('');

    // Feature 5: Semantic Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchScope, setSearchScope] = useState(selectedUser ? 'current' : 'all');
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState(null);
    const [searchError, setSearchError] = useState('');

    // Feature 6: Extract Tasks State
    const [tasksScope, setTasksScope] = useState(selectedUser ? 'current' : 'all');
    const [tasksSource, setTasksSource] = useState('chat'); // 'chat' | 'document'
    const [tasksLoading, setTasksLoading] = useState(false);
    const [tasksResult, setTasksResult] = useState(null);
    const [tasksError, setTasksError] = useState('');

    // Feature 7: Edit Image State (two-step: base prompt -> edit prompt)
    const [editBasePrompt, setEditBasePrompt] = useState('');
    const [editPrompt, setEditPrompt] = useState('');
    const [editBaseImage, setEditBaseImage] = useState(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editResult, setEditResult] = useState(null);
    const [editError, setEditError] = useState('');
    const [editTrail, setEditTrail] = useState([]); // applied edit prompts
    const [editSendSuccess, setEditSendSuccess] = useState('');

    // Load initial chat history and doc status when modal opens
    useEffect(() => {
        if (!isOpen) return;

        // Fetch AI conversation history
        const loadHistory = async () => {
            try {
                const res = await fetchAIHistory(token);
                if (res.success && Array.isArray(res.messages)) {
                    setChatMessages(res.messages);
                }
            } catch (e) {
                // Ignore history load fail
            }
        };

        // Fetch Document RAG status
        const loadDocStatus = async () => {
            try {
                const res = await fetchRAGDocumentStatus(token);
                if (res.success) {
                    setDocStatus(res.status);
                }
            } catch (e) {
                // Ignore doc status fail
            }
        };

        loadHistory();
        loadDocStatus();
    }, [isOpen, token]);

    // Scroll chat to bottom on new message
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chatMessages, chatLoading]);

    if (!isOpen) return null;

    // ==========================================
    // 1. CHAT ASSISTANT HANDLERS
    // ==========================================
    const handleSendChat = async (messageToSend = null) => {
        const text = (messageToSend || chatInput).trim();
        if (!text || chatLoading) return;

        setChatError('');
        setLastFailedMessage('');
        const userMsg = {
            id: 'temp_' + Date.now(),
            from: user?.email || 'me',
            message: text,
            createdAt: new Date(),
            isAI: false
        };

        setChatMessages(prev => [...prev, userMsg]);
        setChatInput('');
        setChatLoading(true);

        try {
            const data = await chatWithAI(text);
            if (data.success && data.reply) {
                setChatMessages(prev => [
                    ...prev,
                    {
                        id: 'ai_' + Date.now(),
                        from: 'ai@chatapp.com',
                        message: data.reply,
                        createdAt: new Date(),
                        isAI: true
                    }
                ]);
            } else {
                setLastFailedMessage(text);
                setChatError(data.message || 'AI service did not return a response.');
            }
        } catch (err) {
            setLastFailedMessage(text);
            setChatError(err.message || 'Failed to connect to AI service.');
        } finally {
            setChatLoading(false);
        }
    };

    const handleRetryChat = () => {
        // Re-send the last failed message (input was already cleared)
        if (lastFailedMessage) {
            handleSendChat(lastFailedMessage);
        } else {
            handleSendChat();
        }
    };

    // ==========================================
    // 2. IMAGE GENERATION HANDLERS
    // ==========================================
    const handleGenerateImage = async (promptOverride = null) => {
        const prompt = (promptOverride || imagePrompt).trim();
        if (!prompt || imageLoading) return;

        setImageLoading(true);
        setImageError('');
        setSendChatSuccess('');

        try {
            const res = await generateImage(prompt);
            if (res.success && (res.imageUrl || res.base64Url)) {
                setGeneratedImage({
                    url: res.imageUrl || res.base64Url,
                    prompt
                });
            } else {
                setImageError(res.message || 'Image generation failed');
            }
        } catch (err) {
            setImageError(err.message || 'Failed to generate image. Please try again.');
        } finally {
            setImageLoading(false);
        }
    };

    const handleSendImageToChat = () => {
        if (!generatedImage || !selectedUser || !socket) return;

        const clientMessageId = 'ai_img_' + Date.now();
        const mediaUrl = generatedImage.url;

        if (selectedUser.isGroup) {
            socket.emit('groupMessage', {
                groupId: selectedUser._id,
                message: '',
                messageType: 'image',
                mediaUrl,
                clientMessageId
            });
        } else {
            socket.emit('privateMessage', {
                to: "ai@chatapp.com",
                message: '',
                messageType: 'image',
                mediaUrl,
                clientMessageId
            });
        }

        setSendChatSuccess(`Sent image to ${selectedUser.name}!`);
        setTimeout(() => setSendChatSuccess(''), 4000);
    };

    const sendTextResultToChat = (message) => {
        if (!message?.trim() || !selectedUser || !socket) return;

        const clientMessageId = 'ai_result_' + Date.now();
        if (selectedUser.isGroup) {
            socket.emit('groupMessage', {
                groupId: selectedUser._id,
                message: message.trim(),
                messageType: 'text',
                clientMessageId
            });
        } else {
            socket.emit('privateMessage', {
                to: selectedUser.email,
                message: message.trim(),
                messageType: 'text',
                clientMessageId
            });
        }

        setTextSendSuccess(`Sent result to ${selectedUser.name}!`);
        setTimeout(() => setTextSendSuccess(''), 4000);
    };

    const handleSendDocumentAnswer = () => {
        if (!docAnswer) return;
        sendTextResultToChat(
            `Document RAG answer for "${docQuery}":\n\n${docAnswer.answer}`
        );
    };

    const handleSendChatRagAnswer = () => {
        if (!chatRagAnswer) return;
        sendTextResultToChat(
            `Chat RAG answer for "${chatRagQuery}":\n\n${chatRagAnswer.answer}`
        );
    };

    const handleSendSearchResults = () => {
        if (!searchResults?.length) return;
        const results = searchResults
            .map((result, index) => `${index + 1}. ${result.text}`)
            .join('\n');
        sendTextResultToChat(`Semantic search results for "${searchQuery}":\n\n${results}`);
    };

    const handleSendTasks = () => {
        if (!tasksResult?.tasks?.length) return;
        const tasks = tasksResult.tasks
            .map((task, index) => `${index + 1}. ${task.task} | Priority: ${task.priority} | Owner: ${task.owner} | Due: ${task.due}`)
            .join('\n');
        sendTextResultToChat(`Extracted tasks:\n\n${tasks}`);
    };

    // ==========================================
    // 3. DOCUMENT RAG HANDLERS
    // ==========================================
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        // Reset input so selecting the same file again re-triggers onChange
        e.target.value = '';
        if (!file) return;

        // Validate file size client-side (8MB)
        if (file.size > 8 * 1024 * 1024) {
            setDocError('File is too large. Maximum size is 8MB.');
            return;
        }

        setDocLoading(true);
        setDocError('');
        setDocAnswer(null);

        try {
            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
            });

            const res = await uploadRAGDocument(token, {
                fileData: base64Data,
                filename: file.name
            });

            if (res.success && res.document) {
                setDocStatus({
                    indexed: true,
                    filename: res.document.filename,
                    totalChunks: res.document.totalChunks,
                    preview: res.document.preview
                });
            } else {
                setDocError(res.message || 'Failed to process document');
            }
        } catch (err) {
            setDocError(err.message || 'Error uploading file');
        } finally {
            setDocLoading(false);
        }
    };

    const handleAskDocument = async () => {
        if (!docQuery.trim() || docLoading) return;
        setDocLoading(true);
        setDocError('');

        try {
            const res = await queryRAGDocument(token, docQuery.trim());
            if (res.success) {
                setDocAnswer(res);
            } else {
                setDocError(res.message || 'Failed to query document');
            }
        } catch (err) {
            setDocError(err.message || 'Error processing document query');
        } finally {
            setDocLoading(false);
        }
    };

    const handleClearDocument = async () => {
        try {
            await clearRAGDocument(token);
            setDocStatus({ indexed: false });
            setDocAnswer(null);
            setDocQuery('');
        } catch (e) {
            // ignore
        }
    };

    // ==========================================
    // 4. CHAT RAG HANDLERS
    // ==========================================
    const handleChatRAG = async () => {
        if (!chatRagQuery.trim() || chatRagLoading) return;
        setChatRagLoading(true);
        setChatRagError('');

        try {
            const payload = {
                query: chatRagQuery.trim(),
                scope: chatRagScope,
                targetEmail: selectedUser && !selectedUser.isGroup ? selectedUser.email : '',
                groupId: selectedUser && selectedUser.isGroup ? selectedUser._id : ''
            };
            const res = await queryChatRAG(token, payload);
            if (res.success) {
                setChatRagAnswer(res);
            } else {
                setChatRagError(res.message || 'Failed to analyze chat history');
            }
        } catch (err) {
            setChatRagError(err.message || 'Error querying chat history');
        } finally {
            setChatRagLoading(false);
        }
    };

    // ==========================================
    // 5. SEMANTIC SEARCH HANDLERS
    // ==========================================
    const handleSemanticSearch = async () => {
        if (!searchQuery.trim() || searchLoading) return;
        setSearchLoading(true);
        setSearchError('');

        try {
            const payload = {
                query: searchQuery.trim(),
                scope: searchScope,
                targetEmail: selectedUser && !selectedUser.isGroup ? selectedUser.email : '',
                groupId: selectedUser && selectedUser.isGroup ? selectedUser._id : ''
            };
            const res = await performSemanticSearch(token, payload);
            if (res.success) {
                setSearchResults(res.results || []);
            } else {
                setSearchError(res.message || 'Search failed');
            }
        } catch (err) {
            setSearchError(err.message || 'Error executing semantic search');
        } finally {
            setSearchLoading(false);
        }
    };

    // ==========================================
    // 6. EXTRACT TASKS HANDLERS
    // ==========================================
    const handleExtractTasks = async () => {
        if (tasksLoading) return;
        setTasksLoading(true);
        setTasksError('');

        try {
            const payload = {
                scope: tasksSource === 'document' ? 'all' : tasksScope,
                source: tasksSource,
                targetEmail: selectedUser && !selectedUser.isGroup ? selectedUser.email : '',
                groupId: selectedUser && selectedUser.isGroup ? selectedUser._id : ''
            };
            const res = await extractTasks(token, payload);
            if (res.success) {
                setTasksResult(res);
            } else {
                setTasksError(res.message || 'Failed to extract tasks');
            }
        } catch (err) {
            setTasksError(err.message || 'Error extracting tasks');
        } finally {
            setTasksLoading(false);
        }
    };

    // ==========================================
    // 7. EDIT IMAGE HANDLERS (two-step flow)
    // ==========================================
    const handleGenerateBaseImage = async () => {
        const prompt = editBasePrompt.trim();
        if (!prompt || editLoading) return;
        setEditLoading(true);
        setEditError('');
        setEditResult(null);
        setEditTrail([]);

        try {
            const res = await generateImage(prompt);
            if (res.success && (res.imageUrl || res.base64Url)) {
                setEditBaseImage({
                    url: res.imageUrl || res.base64Url,
                    prompt
                });
            } else {
                setEditError(res.message || 'Failed to generate base image');
            }
        } catch (err) {
            setEditError(err.message || 'Failed to generate base image. Please try again.');
        } finally {
            setEditLoading(false);
        }
    };

    const handleEditImage = async (editOverride = null) => {
        const edit = (editOverride || editPrompt).trim();
        if (!edit || !editBaseImage || editLoading) return;
        setEditLoading(true);
        setEditError('');

        try {
            // Chain all previous edits into the base prompt so each edit
            // builds on the previous result
            const fullBasePrompt = editTrail.length > 0
                ? `${editBaseImage.prompt}. ${editTrail.join('. ')}`
                : editBaseImage.prompt;

            const res = await editImage(token, {
                basePrompt: fullBasePrompt,
                editPrompt: edit
            });
            if (res.success && (res.imageUrl || res.base64Url)) {
                setEditResult({
                    url: res.imageUrl || res.base64Url,
                    editPrompt: edit
                });
                // Only append to the trail when this is a new edit instruction
                if (!editOverride) {
                    setEditTrail(prev => [...prev, edit]);
                    setEditPrompt('');
                }
            } else {
                setEditError(res.message || 'Failed to edit image');
            }
        } catch (err) {
            setEditError(err.message || 'Failed to edit image. Please try again.');
        } finally {
            setEditLoading(false);
        }
    };

    const handleSendEditedImageToChat = () => {
        if (!editResult || !selectedUser || !socket) return;

        const clientMessageId = 'ai_edit_' + Date.now();
        const mediaUrl = editResult.url;

        if (selectedUser.isGroup) {
            socket.emit('groupMessage', {
                groupId: selectedUser._id,
                message: '',
                messageType: 'image',
                mediaUrl,
                clientMessageId
            });
        } else {
            socket.emit('privateMessage', {
                to: "ai@chatapp.com",
                message: '',
                messageType: 'image',
                mediaUrl,
                clientMessageId
            });
        }

        setEditSendSuccess(`Sent image to ${selectedUser.name}!`);
        setTimeout(() => setEditSendSuccess(''), 4000);
    };

    // Common styling tokens
    const isDark = true;
    const bgSurface = '#1e1f22';
    const bgCard = '#2b2d31';
    const borderColor = 'rgba(255, 255, 255, 0.08)';
    const accentBlue = '#3b82f6';

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '16px'
            }}
            onClick={e => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '880px',
                    height: '88vh',
                    maxHeight: '740px',
                    background: bgSurface,
                    color: '#ffffff',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                }}
            >
                {/* 1. MODAL HEADER */}
                <div
                    style={{
                        padding: '16px 22px',
                        borderBottom: `1px solid ${borderColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(0,0,0,0.2)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
                            }}
                        >
                            ✨
                        </div>
                        <div>
                            <div style={{ fontSize: '17px', fontWeight: '700', letterSpacing: '-0.2px' }}>
                                AI Assistant Workspace
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {selectedUser ? (
                                    <>
                                        <span>Context:</span>
                                        <span
                                            style={{
                                                background: 'rgba(59, 130, 246, 0.18)',
                                                color: '#60a5fa',
                                                padding: '1px 8px',
                                                borderRadius: '12px',
                                                fontWeight: '600'
                                            }}
                                        >
                                            {selectedUser.isGroup ? '👥 ' : '👤 '}
                                            {selectedUser.name}
                                        </span>
                                    </>
                                ) : (
                                    <span style={{ color: '#9ca3af' }}>🌐 Global Workspace Mode</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: 'none',
                            color: '#9ca3af',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            fontSize: '16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: '0.2s'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
                    >
                        ✕
                    </button>
                </div>

                {/* 2. FIVE FEATURE NAVIGATION TABS */}
                <div
                    style={{
                        display: 'flex',
                        background: 'rgba(0,0,0,0.15)',
                        borderBottom: `1px solid ${borderColor}`,
                        padding: '6px 16px',
                        gap: '6px',
                        overflowX: 'auto'
                    }}
                >
                    {[
                        { id: 'chat', label: 'AI Chat', icon: '💬' },
                        { id: 'image', label: 'Image Gen', icon: '🎨' },
                        { id: 'image_edit', label: 'Edit Image', icon: '🖌️' },
                        { id: 'doc_rag', label: 'Document RAG', icon: '📄' },
                        { id: 'chat_rag', label: 'Chat RAG', icon: '🔍' },
                        { id: 'search', label: 'Semantic Search', icon: '⚡' },
                        { id: 'tasks', label: 'Extract Tasks', icon: '📋' }
                    ].map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                    color: isActive ? '#60a5fa' : '#9ca3af',
                                    fontWeight: isActive ? '600' : '500',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease-in-out',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {textSendSuccess && (
                    <div style={{ padding: '10px 16px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '13px', fontWeight: '600' }}>
                        ✅ {textSendSuccess}
                    </div>
                )}

                {/* 3. MAIN WORKSPACE CONTENT */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* ========================================================= */}
                    {/* FEATURE 1: AI CHAT ASSISTANT                              */}
                    {/* ========================================================= */}
                    {activeTab === 'chat' && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            {/* Chat Messages Log */}
                            <div
                                ref={chatScrollRef}
                                style={{
                                    flex: 1,
                                    padding: '18px',
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }}
                            >
                                {chatMessages.length === 0 ? (
                                    <div style={{ textAlign: 'center', margin: 'auto', maxWidth: '420px', padding: '20px' }}>
                                        <div style={{ fontSize: '36px', marginBottom: '10px' }}>🤖</div>
                                        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>
                                            Chat with Groq AI
                                        </div>
                                        <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '16px', lineHeight: '1.4' }}>
                                            Ask questions, get help writing messages, brainstorm ideas, or summarize information.
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {[
                                                'Draft a polite message to reschedule a meeting',
                                                'Explain how WebRTC audio/video calling works in simple terms',
                                                'Give me 3 creative conversation starters for our group'
                                            ].map((quick, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleSendChat(quick)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        borderRadius: '8px',
                                                        background: bgCard,
                                                        border: `1px solid ${borderColor}`,
                                                        color: '#e5e7eb',
                                                        fontSize: '12px',
                                                        textAlign: 'left',
                                                        cursor: 'pointer',
                                                        transition: '0.15s'
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.borderColor = accentBlue)}
                                                    onMouseLeave={e => (e.currentTarget.style.borderColor = borderColor)}
                                                >
                                                    💡 {quick}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    chatMessages.map((msg, idx) => {
                                        const isAI = msg.isAI || msg.from === 'ai@chatapp.com';
                                        return (
                                            <div
                                                key={idx}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: isAI ? 'flex-start' : 'flex-end'
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        maxWidth: '82%',
                                                        padding: '10px 14px',
                                                        borderRadius: isAI ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                                                        background: isAI ? bgCard : accentBlue,
                                                        color: '#ffffff',
                                                        fontSize: '13.5px',
                                                        lineHeight: '1.5',
                                                        border: isAI ? `1px solid ${borderColor}` : 'none',
                                                        whiteSpace: 'pre-wrap',
                                                        wordBreak: 'break-word'
                                                    }}
                                                >
                                                    {isAI && (
                                                        <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: '600', marginBottom: '4px' }}>
                                                            ✨ Groq AI Assistant
                                                        </div>
                                                    )}
                                                    {msg.message}
                                                </div>
                                                {isAI && selectedUser && (
                                                    <button
                                                        onClick={() => sendTextResultToChat(msg.message)}
                                                        style={{
                                                            marginTop: '5px',
                                                            padding: '4px 9px',
                                                            borderRadius: '6px',
                                                            background: 'rgba(59, 130, 246, 0.18)',
                                                            border: `1px solid ${borderColor}`,
                                                            color: '#93c5fd',
                                                            fontSize: '11px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        📤 Send to {selectedUser.name}
                                                    </button>
                                                )}
                                                <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px', padding: '0 4px' }}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}

                                {chatLoading && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '13px', padding: '6px' }}>
                                        <div className="dot-container" style={{ display: 'flex', gap: '4px' }}>
                                            <span style={{ animation: 'bounce 1s infinite' }}>✨</span>
                                        </div>
                                        <span>AI is thinking...</span>
                                    </div>
                                )}

                                {chatError && (
                                    <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '13px' }}>
                                        ⚠️ {chatError}
                                        <button
                                            onClick={handleRetryChat}
                                            style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', textDecoration: 'underline' }}
                                        >
                                            Retry
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Chat Input Bar */}
                            <div
                                style={{
                                    padding: '12px 18px',
                                    borderTop: `1px solid ${borderColor}`,
                                    display: 'flex',
                                    gap: '10px',
                                    background: 'rgba(0,0,0,0.2)'
                                }}
                            >
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleSendChat();
                                    }}
                                    placeholder="Message the AI Assistant..."
                                    style={{
                                        flex: 1,
                                        background: bgCard,
                                        border: `1px solid ${borderColor}`,
                                        borderRadius: '10px',
                                        padding: '10px 14px',
                                        color: '#ffffff',
                                        fontSize: '13.5px',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    onClick={() => handleSendChat()}
                                    disabled={!chatInput.trim() || chatLoading}
                                    style={{
                                        background: accentBlue,
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px 18px',
                                        color: '#ffffff',
                                        fontWeight: '600',
                                        fontSize: '13.5px',
                                        cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'not-allowed',
                                        opacity: chatInput.trim() && !chatLoading ? 1 : 0.6
                                    }}
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* FEATURE 2: AI IMAGE GENERATION                            */}
                    {/* ========================================================= */}
                    {activeTab === 'image' && (
                        <div style={{ flex: 1, padding: '22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                                    🎨 AI Image Generation
                                </div>
                                <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                                    Generate rich images from natural language prompts using FLUX.1 & Pollinations AI.
                                </p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <textarea
                                    rows={3}
                                    value={imagePrompt}
                                    onChange={e => setImagePrompt(e.target.value)}
                                    placeholder="Describe the image you want to generate (e.g., 'A cyberpunk neon city street at night in rain with reflections')..."
                                    style={{
                                        width: '100%',
                                        background: bgCard,
                                        border: `1px solid ${borderColor}`,
                                        borderRadius: '10px',
                                        padding: '12px 14px',
                                        color: '#ffffff',
                                        fontSize: '13.5px',
                                        outline: 'none',
                                        resize: 'vertical'
                                    }}
                                />

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {[
                                        'Cyberpunk glowing hacker desk',
                                        'Cozy coffee shop on a snowy evening',
                                        'Minimalist futuristic gradient logo',
                                        'Astronaut exploring alien crystal cave'
                                    ].map((promptChip, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setImagePrompt(promptChip);
                                                handleGenerateImage(promptChip);
                                            }}
                                            style={{
                                                fontSize: '11.5px',
                                                padding: '4px 10px',
                                                borderRadius: '14px',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: `1px solid ${borderColor}`,
                                                color: '#d1d5db',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            + {promptChip}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => handleGenerateImage()}
                                    disabled={!imagePrompt.trim() || imageLoading}
                                    style={{
                                        alignSelf: 'flex-start',
                                        background: accentBlue,
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px 22px',
                                        color: '#ffffff',
                                        fontWeight: '600',
                                        fontSize: '13.5px',
                                        cursor: imagePrompt.trim() && !imageLoading ? 'pointer' : 'not-allowed',
                                        opacity: imagePrompt.trim() && !imageLoading ? 1 : 0.6
                                    }}
                                >
                                    {imageLoading ? '🎨 Generating image...' : 'Generate Image'}
                                </button>
                            </div>

                            {imageError && (
                                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '13px' }}>
                                    ⚠️ {imageError}
                                </div>
                            )}

                            {sendChatSuccess && (
                                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '13px', fontWeight: '500' }}>
                                    ✅ {sendChatSuccess}
                                </div>
                            )}

                            {generatedImage && (
                                <div
                                    style={{
                                        background: bgCard,
                                        borderRadius: '12px',
                                        padding: '16px',
                                        border: `1px solid ${borderColor}`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px',
                                        maxWidth: '480px'
                                    }}
                                >
                                    <img
                                        src={generatedImage.url}
                                        alt={generatedImage.prompt}
                                        style={{
                                            width: '100%',
                                            maxHeight: '340px',
                                            objectFit: 'cover',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <div style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
                                        "{generatedImage.prompt}"
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <a
                                            href={generatedImage.url}
                                            download={`ai_image_${Date.now()}.png`}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{
                                                flex: 1,
                                                textAlign: 'center',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                background: 'rgba(255, 255, 255, 0.08)',
                                                color: '#ffffff',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                textDecoration: 'none'
                                            }}
                                        >
                                            💾 Download
                                        </a>
                                        {selectedUser && (
                                            <button
                                                onClick={handleSendImageToChat}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    borderRadius: '8px',
                                                    background: accentBlue,
                                                    border: 'none',
                                                    color: '#ffffff',
                                                    fontSize: '13px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                📤 Send to {selectedUser.name}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* FEATURE 3: DOCUMENT RAG                                   */}
                    {/* ========================================================= */}
                    {activeTab === 'doc_rag' && (
                        <div style={{ flex: 1, padding: '22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                                    📄 Document RAG (Retrieval-Augmented Generation)
                                </div>
                                <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                                    Upload a PDF or document to index text chunks into your personal vector store and ask questions with source citations.
                                </p>
                            </div>

                            {/* Document status or Upload Box */}
                            {docStatus?.indexed ? (
                                <div
                                    style={{
                                        background: bgCard,
                                        padding: '16px',
                                        borderRadius: '10px',
                                        border: `1px solid ${borderColor}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '28px' }}>📑</span>
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '14px' }}>{docStatus.filename}</div>
                                            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                                {docStatus.totalChunks} semantic chunks indexed • Ready for questions
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleClearDocument}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.15)',
                                            border: 'none',
                                            color: '#f87171',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Remove Document
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        border: `2px dashed ${borderColor}`,
                                        borderRadius: '12px',
                                        padding: '30px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        background: 'rgba(0,0,0,0.1)',
                                        transition: '0.2s'
                                    }}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,.txt,.md,.json,.csv"
                                        style={{ display: 'none' }}
                                        onChange={handleFileUpload}
                                    />
                                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📤</div>
                                    <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                                        Click or drop document to index
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                        Supports PDF, TXT, Markdown, JSON (up to 8MB)
                                    </div>
                                </div>
                            )}

                            {docLoading && (
                                <div style={{ color: '#60a5fa', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>⏳ Processing document and embeddings...</span>
                                </div>
                            )}

                            {docError && (
                                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '13px' }}>
                                    ⚠️ {docError}
                                </div>
                            )}

                            {/* Ask Question Box */}
                            {docStatus?.indexed && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            type="text"
                                            value={docQuery}
                                            onChange={e => setDocQuery(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleAskDocument();
                                            }}
                                            placeholder="Ask anything about this document..."
                                            style={{
                                                flex: 1,
                                                background: bgCard,
                                                border: `1px solid ${borderColor}`,
                                                borderRadius: '10px',
                                                padding: '10px 14px',
                                                color: '#ffffff',
                                                fontSize: '13.5px',
                                                outline: 'none'
                                            }}
                                        />
                                        <button
                                            onClick={handleAskDocument}
                                            disabled={!docQuery.trim() || docLoading}
                                            style={{
                                                background: accentBlue,
                                                border: 'none',
                                                borderRadius: '10px',
                                                padding: '10px 20px',
                                                color: '#ffffff',
                                                fontWeight: '600',
                                                fontSize: '13.5px',
                                                cursor: docQuery.trim() && !docLoading ? 'pointer' : 'not-allowed',
                                                opacity: docQuery.trim() && !docLoading ? 1 : 0.6
                                            }}
                                        >
                                            Ask
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Document Answer & Citations */}
                            {docAnswer && (
                                <div style={{ background: bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${borderColor}` }}>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#60a5fa', marginBottom: '8px' }}>
                                        🤖 AI Answer:
                                    </div>
                                    <div style={{ fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap', marginBottom: '14px' }}>
                                        {docAnswer.answer}
                                    </div>
                                    {selectedUser && (
                                        <button
                                            onClick={handleSendDocumentAnswer}
                                            style={{ background: accentBlue, border: 'none', borderRadius: '8px', padding: '8px 14px', color: '#ffffff', fontWeight: '600', cursor: 'pointer', marginBottom: '14px' }}
                                        >
                                            📤 Send to {selectedUser.name}
                                        </button>
                                    )}

                                    {docAnswer.chunks && docAnswer.chunks.length > 0 && (
                                        <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '12px' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af', marginBottom: '8px' }}>
                                                📚 Retrieved Sources & Relevance:
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {docAnswer.chunks.map((chk, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            background: 'rgba(0,0,0,0.2)',
                                                            padding: '8px 12px',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            color: '#d1d5db'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                            <span style={{ fontWeight: '600', color: '#93c5fd' }}>
                                                                Chunk #{i + 1} ({chk.filename})
                                                            </span>
                                                            <span style={{ color: '#34d399', fontWeight: '500' }}>
                                                                {Math.round(chk.similarity * 100)}% match
                                                            </span>
                                                        </div>
                                                        <div style={{ fontStyle: 'italic', color: '#9ca3af' }}>
                                                            "{chk.text.slice(0, 180)}..."
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* FEATURE 4: CHAT RAG (Chat History QA)                     */}
                    {/* ========================================================= */}
                    {activeTab === 'chat_rag' && (
                        <div style={{ flex: 1, padding: '22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                                    🔍 Chat RAG (Conversation Intelligence)
                                </div>
                                <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                                    Ask natural questions about your chat logs. The AI searches authorized message history and synthesizes answers with source citations.
                                </p>
                            </div>

                            {/* Scope Selector */}
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', color: '#9ca3af' }}>Scope:</span>
                                {selectedUser && (
                                    <button
                                        onClick={() => setChatRagScope('current')}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            background: chatRagScope === 'current' ? 'rgba(59, 130, 246, 0.2)' : bgCard,
                                            border: `1px solid ${chatRagScope === 'current' ? accentBlue : borderColor}`,
                                            color: chatRagScope === 'current' ? '#60a5fa' : '#9ca3af',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Current Chat ({selectedUser.name})
                                    </button>
                                )}
                                <button
                                    onClick={() => setChatRagScope('all')}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        background: chatRagScope === 'all' ? 'rgba(59, 130, 246, 0.2)' : bgCard,
                                        border: `1px solid ${chatRagScope === 'all' ? accentBlue : borderColor}`,
                                        color: chatRagScope === 'all' ? '#60a5fa' : '#9ca3af',
                                        cursor: 'pointer'
                                    }}
                                >
                                    All My Conversations
                                </button>
                            </div>

                            {/* Question Input */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    value={chatRagQuery}
                                    onChange={e => setChatRagQuery(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleChatRAG();
                                    }}
                                    placeholder="e.g. What deadlines did we agree on? Summarize our last meeting."
                                    style={{
                                        flex: 1,
                                        background: bgCard,
                                        border: `1px solid ${borderColor}`,
                                        borderRadius: '10px',
                                        padding: '10px 14px',
                                        color: '#ffffff',
                                        fontSize: '13.5px',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    onClick={handleChatRAG}
                                    disabled={!chatRagQuery.trim() || chatRagLoading}
                                    style={{
                                        background: accentBlue,
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px 20px',
                                        color: '#ffffff',
                                        fontWeight: '600',
                                        fontSize: '13.5px',
                                        cursor: chatRagQuery.trim() && !chatRagLoading ? 'pointer' : 'not-allowed',
                                        opacity: chatRagQuery.trim() && !chatRagLoading ? 1 : 0.6
                                    }}
                                >
                                    {chatRagLoading ? 'Analyzing...' : 'Ask History'}
                                </button>
                            </div>

                            {chatRagError && (
                                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '13px' }}>
                                    ⚠️ {chatRagError}
                                </div>
                            )}

                            {chatRagAnswer && (
                                <div style={{ background: bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${borderColor}` }}>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#60a5fa', marginBottom: '8px' }}>
                                        🤖 Analysis from Chat History:
                                    </div>
                                    <div style={{ fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap', marginBottom: '16px' }}>
                                        {chatRagAnswer.answer}
                                    </div>

                                    {chatRagAnswer.sources && chatRagAnswer.sources.length > 0 && (
                                        <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '12px' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af', marginBottom: '8px' }}>
                                                💬 Quoted Message Citations:
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {chatRagAnswer.sources.map((src, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            background: 'rgba(0,0,0,0.2)',
                                                            padding: '8px 12px',
                                                            borderRadius: '6px',
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                                            <span style={{ fontWeight: '600', color: '#93c5fd' }}>{src.from}</span>
                                                            <span style={{ color: '#6b7280', fontSize: '11px' }}>
                                                                {new Date(src.createdAt).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div style={{ color: '#e5e7eb' }}>"{src.text}"</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {selectedUser && (
                                        <button
                                            onClick={handleSendChatRagAnswer}
                                            style={{ background: accentBlue, border: 'none', borderRadius: '8px', padding: '8px 14px', color: '#ffffff', fontWeight: '600', cursor: 'pointer', marginTop: '14px' }}
                                        >
                                            📤 Send to {selectedUser.name}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* FEATURE 5: SEMANTIC SEARCH                                */}
                    {/* ========================================================= */}
                    {activeTab === 'search' && (
                        <div style={{ flex: 1, padding: '22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                                    ⚡ Semantic Search
                                </div>
                                <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                                    Search conversations and documents by meaning and concept, not just exact keyword matches.
                                </p>
                            </div>

                            {/* Scope Selector */}
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', color: '#9ca3af' }}>Search in:</span>
                                {selectedUser && (
                                    <button
                                        onClick={() => setSearchScope('current')}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            background: searchScope === 'current' ? 'rgba(59, 130, 246, 0.2)' : bgCard,
                                            border: `1px solid ${searchScope === 'current' ? accentBlue : borderColor}`,
                                            color: searchScope === 'current' ? '#60a5fa' : '#9ca3af',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Current Chat ({selectedUser.name})
                                    </button>
                                )}
                                <button
                                    onClick={() => setSearchScope('all')}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        background: searchScope === 'all' ? 'rgba(59, 130, 246, 0.2)' : bgCard,
                                        border: `1px solid ${searchScope === 'all' ? accentBlue : borderColor}`,
                                        color: searchScope === 'all' ? '#60a5fa' : '#9ca3af',
                                        cursor: 'pointer'
                                    }}
                                >
                                    All Chats & Documents
                                </button>
                            </div>

                            {/* Search Input */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleSemanticSearch();
                                    }}
                                    placeholder="Search by concept (e.g. 'flight details', 'restaurant recommendations', 'error in project')..."
                                    style={{
                                        flex: 1,
                                        background: bgCard,
                                        border: `1px solid ${borderColor}`,
                                        borderRadius: '10px',
                                        padding: '10px 14px',
                                        color: '#ffffff',
                                        fontSize: '13.5px',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    onClick={handleSemanticSearch}
                                    disabled={!searchQuery.trim() || searchLoading}
                                    style={{
                                        background: accentBlue,
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px 22px',
                                        color: '#ffffff',
                                        fontWeight: '600',
                                        fontSize: '13.5px',
                                        cursor: searchQuery.trim() && !searchLoading ? 'pointer' : 'not-allowed',
                                        opacity: searchQuery.trim() && !searchLoading ? 1 : 0.6
                                    }}
                                >
                                    {searchLoading ? 'Searching...' : 'Search'}
                                </button>
                            </div>

                            {searchError && (
                                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '13px' }}>
                                    ⚠️ {searchError}
                                </div>
                            )}

                            {/* Search Results */}
                            {searchResults !== null && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                        Found {searchResults.length} semantic matches
                                    </div>
                                    {selectedUser && searchResults.length > 0 && (
                                        <button
                                            onClick={handleSendSearchResults}
                                            style={{ alignSelf: 'flex-start', background: accentBlue, border: 'none', borderRadius: '8px', padding: '8px 14px', color: '#ffffff', fontWeight: '600', cursor: 'pointer' }}
                                        >
                                            📤 Send Results to {selectedUser.name}
                                        </button>
                                    )}

                                    {searchResults.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af', fontSize: '13px' }}>
                                            No semantic matches found for "{searchQuery}".
                                        </div>
                                    ) : (
                                        searchResults.map((res, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    background: bgCard,
                                                    borderRadius: '10px',
                                                    padding: '14px',
                                                    border: `1px solid ${borderColor}`,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '6px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: '600', fontSize: '13px', color: '#60a5fa' }}>
                                                        {res.isDocument ? res.from : `👤 ${res.from}`}
                                                    </span>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <span
                                                            style={{
                                                                background: 'rgba(16, 185, 129, 0.15)',
                                                                color: '#34d399',
                                                                padding: '2px 8px',
                                                                borderRadius: '10px',
                                                                fontSize: '11.5px',
                                                                fontWeight: '600'
                                                            }}
                                                        >
                                                            {res.score}% relevance
                                                        </span>
                                                        <span style={{ fontSize: '11px', color: '#6b7280' }}>
                                                            {new Date(res.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '13.5px', color: '#e5e7eb', lineHeight: '1.4' }}>
                                                    {res.text}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* FEATURE 6: EXTRACT TASKS                                   */}
                    {/* ========================================================= */}
                    {activeTab === 'tasks' && (
                        <div style={{ flex: 1, padding: '22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                                    📋 Extract Tasks
                                </div>
                                <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                                    Scan a conversation or your indexed document and pull out action items, commitments, and deadlines as a structured task list.
                                </p>
                            </div>

                            {/* Source Selector */}
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '13px', color: '#9ca3af' }}>Source:</span>
                                {selectedUser && (
                                    <button
                                        onClick={() => { setTasksSource('chat'); setTasksScope('current'); }}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            background: tasksSource === 'chat' && tasksScope === 'current' ? 'rgba(59, 130, 246, 0.2)' : bgCard,
                                            border: `1px solid ${tasksSource === 'chat' && tasksScope === 'current' ? accentBlue : borderColor}`,
                                            color: tasksSource === 'chat' && tasksScope === 'current' ? '#60a5fa' : '#9ca3af',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Current Chat ({selectedUser.name})
                                    </button>
                                )}
                                <button
                                    onClick={() => { setTasksSource('chat'); setTasksScope('all'); }}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        background: tasksSource === 'chat' && tasksScope === 'all' ? 'rgba(59, 130, 246, 0.2)' : bgCard,
                                        border: `1px solid ${tasksSource === 'chat' && tasksScope === 'all' ? accentBlue : borderColor}`,
                                        color: tasksSource === 'chat' && tasksScope === 'all' ? '#60a5fa' : '#9ca3af',
                                        cursor: 'pointer'
                                    }}
                                >
                                    All My Conversations
                                </button>
                                <button
                                    onClick={() => setTasksSource('document')}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        background: tasksSource === 'document' ? 'rgba(59, 130, 246, 0.2)' : bgCard,
                                        border: `1px solid ${tasksSource === 'document' ? accentBlue : borderColor}`,
                                        color: tasksSource === 'document' ? '#60a5fa' : '#9ca3af',
                                        cursor: 'pointer',
                                        opacity: docStatus?.indexed ? 1 : 0.5
                                    }}
                                    title={docStatus?.indexed ? 'Extract tasks from your indexed document' : 'Upload a document in the Document RAG tab first'}
                                >
                                    📄 My Document {docStatus?.indexed ? '' : '(not indexed)'}
                                </button>
                            </div>

                            {/* Extract Button */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={handleExtractTasks}
                                    disabled={tasksLoading || (tasksSource === 'document' && !docStatus?.indexed)}
                                    style={{
                                        alignSelf: 'flex-start',
                                        background: accentBlue,
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px 22px',
                                        color: '#ffffff',
                                        fontWeight: '600',
                                        fontSize: '13.5px',
                                        cursor: !tasksLoading && !(tasksSource === 'document' && !docStatus?.indexed) ? 'pointer' : 'not-allowed',
                                        opacity: !tasksLoading && !(tasksSource === 'document' && !docStatus?.indexed) ? 1 : 0.6
                                    }}
                                >
                                    {tasksLoading ? '⏳ Extracting tasks...' : 'Extract Tasks'}
                                </button>
                            </div>

                            {tasksError && (
                                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '13px' }}>
                                    ⚠️ {tasksError}
                                </div>
                            )}

                            {/* Task Results */}
                            {tasksResult && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {tasksResult.note && (
                                        <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.12)', color: '#fbbf24', fontSize: '13px' }}>
                                            ℹ️ {tasksResult.note}
                                        </div>
                                    )}

                                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                        Found {tasksResult.tasks?.length || 0} task{(tasksResult.tasks?.length || 0) === 1 ? '' : 's'}
                                    </div>

                                    {(tasksResult.tasks?.length || 0) === 0 && !tasksResult.note && (
                                        <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af', fontSize: '13px' }}>
                                            No tasks or action items found in this source.
                                        </div>
                                    )}

                                    {(tasksResult.tasks || []).map((task, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                background: bgCard,
                                                borderRadius: '10px',
                                                padding: '14px',
                                                border: `1px solid ${borderColor}`,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                    <span style={{ fontSize: '16px', lineHeight: 1 }}>☑️</span>
                                                    <div style={{ fontSize: '13.5px', color: '#e5e7eb', lineHeight: '1.4', fontWeight: '500' }}>
                                                        {task.task}
                                                    </div>
                                                </div>
                                                <span
                                                    style={{
                                                        padding: '2px 8px',
                                                        borderRadius: '10px',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        whiteSpace: 'nowrap',
                                                        background: task.priority === 'High' ? 'rgba(239, 68, 68, 0.18)' : task.priority === 'Low' ? 'rgba(107, 114, 128, 0.25)' : 'rgba(234, 179, 8, 0.18)',
                                                        color: task.priority === 'High' ? '#f87171' : task.priority === 'Low' ? '#9ca3af' : '#fbbf24'
                                                    }}
                                                >
                                                    {task.priority}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12px', color: '#9ca3af' }}>
                                                <span style={{ background: 'rgba(59, 130, 246, 0.14)', color: '#60a5fa', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
                                                    👤 {task.owner}
                                                </span>
                                                <span style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '2px 8px', borderRadius: '10px' }}>
                                                    📅 {task.due}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedUser && (tasksResult.tasks?.length || 0) > 0 && (
                                        <button
                                            onClick={handleSendTasks}
                                            style={{ alignSelf: 'flex-start', background: accentBlue, border: 'none', borderRadius: '8px', padding: '8px 14px', color: '#ffffff', fontWeight: '600', cursor: 'pointer' }}
                                        >
                                            📤 Send Tasks to {selectedUser.name}
                                        </button>
                                    )}

                                    {/* Source references */}
                                    {tasksResult.sources && tasksResult.sources.length > 0 && (
                                        <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '12px' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af', marginBottom: '8px' }}>
                                                💬 Latest messages analyzed:
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {tasksResult.sources.map((src, i) => (
                                                    <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}>
                                                        <span style={{ fontWeight: '600', color: '#93c5fd' }}>{src.from || src.filename}</span>
                                                        <span style={{ color: '#6b7280' }}> — "{String(src.text).slice(0, 100)}..."</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* FEATURE 7: EDIT IMAGE (two-step prompt flow)                */}
                    {/* ========================================================= */}
                    {activeTab === 'image_edit' && (
                        <div style={{ flex: 1, padding: '22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                                    🖌️ AI Image Editing
                                </div>
                                <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                                    Two steps: first describe the image you want (base image), then describe the change to apply.
                                </p>
                            </div>

                            {/* STEP 1: Base image */}
                            <div style={{ background: bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#60a5fa' }}>
                                    Step 1 — Describe the base image
                                </div>
                                <textarea
                                    rows={3}
                                    value={editBasePrompt}
                                    onChange={e => setEditBasePrompt(e.target.value)}
                                    placeholder="e.g., A golden retriever puppy sitting on a beach at sunset..."
                                    style={{
                                        width: '100%',
                                        background: 'rgba(0,0,0,0.25)',
                                        border: `1px solid ${borderColor}`,
                                        borderRadius: '10px',
                                        padding: '10px 14px',
                                        color: '#ffffff',
                                        fontSize: '13.5px',
                                        outline: 'none',
                                        resize: 'vertical',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <button
                                    onClick={handleGenerateBaseImage}
                                    disabled={!editBasePrompt.trim() || editLoading}
                                    style={{
                                        alignSelf: 'flex-start',
                                        background: editBaseImage ? 'rgba(255, 255, 255, 0.08)' : accentBlue,
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '9px 20px',
                                        color: '#ffffff',
                                        fontWeight: '600',
                                        fontSize: '13.5px',
                                        cursor: editBasePrompt.trim() && !editLoading ? 'pointer' : 'not-allowed',
                                        opacity: editBasePrompt.trim() && !editLoading ? 1 : 0.6
                                    }}
                                >
                                    {editLoading && !editBaseImage ? '🎨 Creating base image...' : editBaseImage ? '🔄 Regenerate Base' : '🎨 Create Base Image'}
                                </button>

                                {editBaseImage && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <img
                                            src={editBaseImage.url}
                                            alt="Base image"
                                            style={{ width: '84px', height: '84px', objectFit: 'cover', borderRadius: '8px', border: `1px solid ${borderColor}` }}
                                        />
                                        <div style={{ fontSize: '12px', color: '#34d399', fontWeight: '600' }}>
                                            ✅ Base image ready — now describe your edit below
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* STEP 2: Edit prompt */}
                            <div style={{ background: bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', gap: '10px', opacity: editBaseImage ? 1 : 0.55 }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#60a5fa' }}>
                                    Step 2 — Describe the edit
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        value={editPrompt}
                                        onChange={e => setEditPrompt(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleEditImage();
                                        }}
                                        placeholder={editBaseImage ? "e.g., make the puppy wear a red scarf..." : 'Create your base image first (Step 1)'}
                                        disabled={!editBaseImage}
                                        style={{
                                            flex: 1,
                                            background: 'rgba(0,0,0,0.25)',
                                            border: `1px solid ${borderColor}`,
                                            borderRadius: '10px',
                                            padding: '10px 14px',
                                            color: '#ffffff',
                                            fontSize: '13.5px',
                                            outline: 'none'
                                        }}
                                    />
                                    <button
                                        onClick={handleEditImage}
                                        disabled={!editPrompt.trim() || !editBaseImage || editLoading}
                                        style={{
                                            background: accentBlue,
                                            border: 'none',
                                            borderRadius: '10px',
                                            padding: '10px 20px',
                                            color: '#ffffff',
                                            fontWeight: '600',
                                            fontSize: '13.5px',
                                            cursor: editPrompt.trim() && editBaseImage && !editLoading ? 'pointer' : 'not-allowed',
                                            opacity: editPrompt.trim() && editBaseImage && !editLoading ? 1 : 0.6
                                        }}
                                    >
                                        {editLoading ? '🖌️ Editing...' : 'Apply Edit'}
                                    </button>
                                </div>

                                {/* Applied edits trail */}
                                {editTrail.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {editTrail.map((t, i) => (
                                            <span
                                                key={i}
                                                style={{
                                                    fontSize: '11.5px',
                                                    padding: '3px 10px',
                                                    borderRadius: '12px',
                                                    background: 'rgba(59, 130, 246, 0.12)',
                                                    border: `1px solid ${borderColor}`,
                                                    color: '#93c5fd'
                                                }}
                                            >
                                                ✏️ {t}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {editError && (
                                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '13px' }}>
                                    ⚠️ {editError}
                                </div>
                            )}

                            {editSendSuccess && (
                                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '13px', fontWeight: '500' }}>
                                    ✅ {editSendSuccess}
                                </div>
                            )}

                            {/* Edited result */}
                            {editResult && (
                                <div
                                    style={{
                                        background: bgCard,
                                        borderRadius: '12px',
                                        padding: '16px',
                                        border: `1px solid ${borderColor}`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px',
                                        maxWidth: '480px'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#9ca3af' }}>
                                        <img
                                            src={editBaseImage?.url}
                                            alt="Base"
                                            style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '6px', border: `1px solid ${borderColor}` }}
                                        />
                                        <span style={{ fontSize: '16px' }}>➡️</span>
                                        <span style={{ color: '#60a5fa', fontWeight: '600', flex: 1 }}>Edited result ({editResult.editPrompt})</span>
                                    </div>
                                    <img
                                        src={editResult.url}
                                        alt={editResult.editPrompt}
                                        style={{
                                            width: '100%',
                                            maxHeight: '340px',
                                            objectFit: 'cover',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <a
                                            href={editResult.url}
                                            download={`ai_edited_${Date.now()}.png`}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{
                                                flex: 1,
                                                textAlign: 'center',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                background: 'rgba(255, 255, 255, 0.08)',
                                                color: '#ffffff',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                textDecoration: 'none'
                                            }}
                                        >
                                            💾 Download
                                        </a>
                                        {selectedUser && (
                                            <button
                                                onClick={handleSendEditedImageToChat}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    borderRadius: '8px',
                                                    background: accentBlue,
                                                    border: 'none',
                                                    color: '#ffffff',
                                                    fontSize: '13px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                📤 Send to {selectedUser.name}
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <button
                                            onClick={handleEditImage}
                                            disabled={editLoading}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.08)',
                                                border: `1px solid ${borderColor}`,
                                                borderRadius: '8px',
                                                padding: '6px 12px',
                                                color: '#e5e7eb',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                cursor: editLoading ? 'not-allowed' : 'pointer'
                                            }}
                                            title="Re-apply the same edit prompt (generates a new variation)"
                                        >
                                            🔁 Retry Same Edit
                                        </button>
                                        <span style={{ fontSize: '11px', color: '#6b7280' }}>
                                            Or type a new edit above to keep building on this image
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
