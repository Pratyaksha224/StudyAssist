import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const SubjectDetails = () => {
    const { subjectId } = useParams();
    const { token, user } = useAuth();
    const [subject, setSubject] = useState(null);
    const [notes, setNotes] = useState([]);
    const [pyqs, setPyqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('notes');

    // ===== CHAT STATE =====
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState([]);
    const [chatLoading, setChatLoading] = useState(false);

    // ===== FETCH DATA =====
    const fetchSubjectData = async () => {
        try {
            const subjectRes = await axios.get(
                `http://localhost:5000/api/subjects/${subjectId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSubject(subjectRes.data);

            const notesRes = await axios.get(
                `http://localhost:5000/api/admin/upload/notes/${subjectId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNotes(notesRes.data);

            const pyqsRes = await axios.get(
                `http://localhost:5000/api/admin/upload/pyqs/${subjectId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setPyqs(pyqsRes.data);

            setLoading(false);
        } catch (err) {
            console.error('Error fetching subject data:', err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubjectData();
    }, [subjectId, token]);

    // ===== DELETE HANDLER =====
    const handleDelete = async (id, type) => {
        if (!window.confirm(`Delete this ${type}? This action cannot be undone.`)) return;

        try {
            const endpoint = type === 'note' 
                ? `http://localhost:5000/api/admin/upload/note/${id}`
                : `http://localhost:5000/api/admin/upload/pyq/${id}`;

            await axios.delete(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });

            fetchSubjectData();
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete. Please try again.');
        }
    };

    // ===== CHAT HANDLER =====
    const handleAskQuestion = async (e) => {
        e.preventDefault();
        if (!question.trim()) return;

        setMessages([...messages, { role: 'user', content: question }]);
        setQuestion('');
        setChatLoading(true);

        try {
            const response = await axios.post(
                'http://localhost:5000/api/chat/ask',
                {
                    subjectId: subjectId,
                    question: question,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: response.data.answer },
            ]);
        } catch (err) {
            console.error('Chat error:', err);
            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: '❌ ' + (err.response?.data?.error || 'Failed to get answer') },
            ]);
        }

        setChatLoading(false);
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="container">
                    <p>Loading subject details...</p>
                </div>
            </>
        );
    }

    if (!subject) {
        return (
            <>
                <Navbar />
                <div className="container">
                    <p>Subject not found</p>
                    <Link to="/subjects">Back to Subjects</Link>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="subject-details">
                    <Link to="/subjects" className="back-link">← Back to Subjects</Link>

                    <div className="subject-header">
                        <h1>{subject.name}</h1>
                        <p className="subject-meta">
                            {subject.code} | Semester {subject.semester} | {subject.branch?.code || subject.branch?.name || 'No branch'}
                        </p>
                    </div>

                    {/* Tab Navigation */}
                    <div className="tab-nav">
                        <button
                            className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
                            onClick={() => setActiveTab('notes')}
                        >
                            📄 Notes ({notes.length})
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'pyqs' ? 'active' : ''}`}
                            onClick={() => setActiveTab('pyqs')}
                        >
                            📝 PYQs ({pyqs.length})
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                            onClick={() => setActiveTab('chat')}
                        >
                            🤖 AI Chat
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="tab-content">
                        {/* ===== NOTES TAB ===== */}
                        {activeTab === 'notes' && (
                            <div className="materials-list">
                                {notes.length === 0 ? (
                                    <p className="empty-message">No notes uploaded for this subject yet.</p>
                                ) : (
                                    notes.map((note) => (
                                        <div key={note._id} className="material-item">
                                            <div className="material-icon">📄</div>
                                            <div className="material-info">
                                                <h4>{note.title}</h4>
                                                <p className="material-meta">
                                                    {note.module && `Module: ${note.module} • `}
                                                    {(note.fileSize / 1024 / 1024).toFixed(2)} MB
                                                    {note.uploadedBy && ` • Uploaded by ${note.uploadedBy.name}`}
                                                </p>
                                                {note.description && (
                                                    <p className="material-desc">{note.description}</p>
                                                )}
                                            </div>
                                            <div className="material-actions">
                                                <button
                                                    className="view-btn"
                                                    onClick={() => window.open(`http://localhost:5000/api/upload/note/${note._id}?token=${token}`, '_blank')}
                                                >
                                                    📄 View PDF
                                                </button>
                                                {user?.role === 'admin' && (
                                                    <button
                                                        className="delete-btn"
                                                        onClick={() => handleDelete(note._id, 'note')}
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* ===== PYQS TAB ===== */}
                        {activeTab === 'pyqs' && (
                            <div className="materials-list">
                                {pyqs.length === 0 ? (
                                    <p className="empty-message">No PYQs uploaded for this subject yet.</p>
                                ) : (
                                    pyqs.map((pyq) => (
                                        <div key={pyq._id} className="material-item">
                                            <div className="material-icon">📝</div>
                                            <div className="material-info">
                                                <h4>{pyq.title}</h4>
                                                <p className="material-meta">
                                                    Year: {pyq.year} • {pyq.examType}
                                                    {pyq.uploadedBy && ` • Uploaded by ${pyq.uploadedBy.name}`}
                                                </p>
                                                {pyq.description && (
                                                    <p className="material-desc">{pyq.description}</p>
                                                )}
                                            </div>
                                            <div className="material-actions">
                                                <button
                                                    className="view-btn"
                                                    onClick={() => window.open(`http://localhost:5000/api/upload/pyq/${pyq._id}?token=${token}`, '_blank')}
                                                >
                                                    📄 View PDF
                                                </button>
                                                {user?.role === 'admin' && (
                                                    <button
                                                        className="delete-btn"
                                                        onClick={() => handleDelete(pyq._id, 'pyq')}
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* ===== CHAT TAB ===== */}
                        {activeTab === 'chat' && (
                            <div className="chat-container">
                                {messages.length === 0 ? (
                                    <div className="chat-welcome">
                                        <p>🤖 Ask me anything about {subject.name}!</p>
                                        <p className="chat-hint">
                                            I'll answer based on the uploaded notes and PYQs for this subject.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="chat-messages">
                                        {messages.map((msg, idx) => (
                                            <div
                                                key={idx}
                                                className={`chat-message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}
                                            >
                                                <span className="chat-role">
                                                    {msg.role === 'user' ? '👤 You' : '🤖 AI'}
                                                </span>
                                                {msg.role === 'user' ? (
                                                    <p>{msg.content}</p>
                                                ) : (
                                                    <div className="markdown-content">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm, remarkMath]}
                                                        rehypePlugins={[rehypeKatex]}
                                                        components={{
                                                            table: ({ children }) => (
                                                                <div className="table-wrapper">
                                                                    <table className="markdown-table">{children}</table>
                                                                </div>
                                                            ),
                                                            thead: ({ children }) => <thead>{children}</thead>,
                                                            tbody: ({ children }) => <tbody>{children}</tbody>,
                                                            tr: ({ children }) => <tr>{children}</tr>,
                                                            th: ({ children }) => <th>{children}</th>,
                                                            td: ({ children }) => <td>{children}</td>,
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>
                                                )}
                                            </div>
                                        ))}
                                        {chatLoading && (
                                            <div className="chat-message assistant-message">
                                                <span className="chat-role">🤖 AI</span>
                                                <p>Thinking...</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <form onSubmit={handleAskQuestion} className="chat-form">
                                    <input
                                        type="text"
                                        value={question}
                                        onChange={(e) => setQuestion(e.target.value)}
                                        placeholder={`Ask about ${subject.name}...`}
                                        disabled={chatLoading}
                                    />
                                    <button type="submit" disabled={chatLoading}>
                                        {chatLoading ? '⏳' : '➤'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default SubjectDetails;