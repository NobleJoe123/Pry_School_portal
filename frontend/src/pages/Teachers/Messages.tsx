import { useState, useEffect } from 'react';
import { 
    MessageSquare, Send, Bell, MailOpen, User, 
    ChevronRight, CheckCircle, RefreshCw, X, ArrowLeftRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, endpoints } from '../../utils/api';

interface Announcement {
    id: string;
    title: string;
    message: string;
    category: string;
    sender: string;
    created_at: string;
    is_read: boolean;
}

interface ParentMessage {
    id: string;
    parentName: string;
    parentEmail: string;
    pupilName: string;
    subject: string;
    lastMessage: string;
    unread: boolean;
    updated_at: string;
    thread: {
        sender: 'parent' | 'teacher';
        message: string;
        timestamp: string;
    }[];
}

interface SentMessage {
    id: string;
    recipientName: string;
    recipientRole: string;
    subject: string;
    message: string;
    created_at: string;
}

const getList = <T,>(value: any): T[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (Array.isArray(value.results)) return value.results;
    return [];
};

export default function TeacherMessages() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'announcements' | 'parent_messages' | 'sent_messages'>('announcements');
    const [loading, setLoading] = useState(false);

    // Data States
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [parentMessages, setParentMessages] = useState<ParentMessage[]>([]);
    const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);

    // Form/Interactive States
    const [showCompose, setShowCompose] = useState(false);
    const [activeChat, setActiveChat] = useState<ParentMessage | null>(null);

    // Compose Form
    const [parentsList, setParentsList] = useState<{ id: string; full_name: string; email: string }[]>([]);
    const [selectedParentId, setSelectedParentId] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');

    // Chat Form
    const [replyBody, setReplyBody] = useState('');

    // Load initial metadata and messages
    useEffect(() => {
        setLoading(true);
        // Load announcements from API
        api.get<any>(endpoints.auth.notifications)
            .then(res => {
                const notifications = getList<any>(res);
                const mapped: Announcement[] = notifications.map(n => ({
                    id: n.id,
                    title: n.title,
                    message: n.message,
                    category: n.category,
                    sender: n.sender_name || 'Administrator',
                    created_at: new Date(n.created_at).toLocaleString(),
                    is_read: n.is_read
                }));
                setAnnouncements(mapped);
            })
            .catch(err => console.error("Error loading announcements", err))
            .finally(() => setLoading(false));

        // Load parents list
        api.get<any>(endpoints.parents.list)
            .then(res => {
                const list = getList<any>(res);
                setParentsList(list);
                if (list.length > 0) setSelectedParentId(list[0].id);
            });

        // Load parent messages and sent messages from localStorage
        const storedParentMessages = localStorage.getItem('parent_messages');
        const storedSentMessages = localStorage.getItem('sent_messages');

        if (storedParentMessages) {
            setParentMessages(JSON.parse(storedParentMessages));
        } else {
            const initialParentMessages: ParentMessage[] = [
                {
                    id: '1',
                    parentName: 'Mr. Joseph Noble',
                    parentEmail: 'noblejoe@email.com',
                    pupilName: 'Joshua Noble',
                    subject: 'Joshua\'s Homework Progress',
                    lastMessage: 'Hello, please is Joshua keeping up with the new math topics?',
                    unread: true,
                    updated_at: new Date(Date.now() - 3600000 * 2).toLocaleString(),
                    thread: [
                        {
                            sender: 'parent',
                            message: 'Hello, please is Joshua keeping up with the new math topics?',
                            timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }
                    ]
                },
                {
                    id: '2',
                    parentName: 'Mrs. Janet Adams',
                    parentEmail: 'janet@email.com',
                    pupilName: 'Evelyn Adams',
                    subject: 'Absence Notice',
                    lastMessage: 'Thank you for updating me on this, Evelyn is fine now.',
                    unread: false,
                    updated_at: new Date(Date.now() - 86400000).toLocaleString(),
                    thread: [
                        {
                            sender: 'parent',
                            message: 'Evelyn won\'t make it to class today due to mild fever.',
                            timestamp: new Date(Date.now() - 86400000 * 1.2).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        },
                        {
                            sender: 'teacher',
                            message: 'Oh, sorry to hear that. Please keep her warm and updated. Hope she recovers quickly!',
                            timestamp: new Date(Date.now() - 86400000 * 1.1).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        },
                        {
                            sender: 'parent',
                            message: 'Thank you for updating me on this, Evelyn is fine now.',
                            timestamp: new Date(Date.now() - 86400000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }
                    ]
                }
            ];
            setParentMessages(initialParentMessages);
            localStorage.setItem('parent_messages', JSON.stringify(initialParentMessages));
        }

        if (storedSentMessages) {
            setSentMessages(JSON.parse(storedSentMessages));
        } else {
            const initialSentMessages: SentMessage[] = [
                {
                    id: '1',
                    recipientName: 'Mr. Joseph Noble',
                    recipientRole: 'Parent',
                    subject: 'Joshua\'s Class Participation',
                    message: 'Joshua participated excellently during our spelling bee session today.',
                    created_at: new Date(Date.now() - 86400000 * 3).toLocaleString()
                }
            ];
            setSentMessages(initialSentMessages);
            localStorage.setItem('sent_messages', JSON.stringify(initialSentMessages));
        }
    }, []);

    const markNoticeRead = async (id: string) => {
        try {
            await api.post(`${endpoints.auth.notifications}${id}/mark_read/`, {});
            setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
        } catch (err) {
            console.error(err);
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        
        const parent = parentsList.find(p => p.id === selectedParentId);
        if (!parent) return;

        const newSent: SentMessage = {
            id: Math.random().toString(36).substr(2, 9),
            recipientName: parent.full_name,
            recipientRole: 'Parent',
            subject: composeSubject,
            message: composeBody,
            created_at: new Date().toLocaleString()
        };

        const updatedSent = [newSent, ...sentMessages];
        setSentMessages(updatedSent);
        localStorage.setItem('sent_messages', JSON.stringify(updatedSent));

        // Also add or start a chat thread
        const existingChatIdx = parentMessages.findIndex(c => c.parentEmail === parent.email);
        let updatedChats = [...parentMessages];

        if (existingChatIdx > -1) {
            const currentChat = updatedChats[existingChatIdx];
            currentChat.thread.push({
                sender: 'teacher',
                message: composeBody,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            currentChat.lastMessage = composeBody;
            currentChat.unread = false;
            currentChat.updated_at = new Date().toLocaleString();
        } else {
            updatedChats.unshift({
                id: Math.random().toString(36).substr(2, 9),
                parentName: parent.full_name,
                parentEmail: parent.email,
                pupilName: 'Pupil',
                subject: composeSubject,
                lastMessage: composeBody,
                unread: false,
                updated_at: new Date().toLocaleString(),
                thread: [
                    {
                        sender: 'teacher',
                        message: composeBody,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                ]
            });
        }

        setParentMessages(updatedChats);
        localStorage.setItem('parent_messages', JSON.stringify(updatedChats));

        // Reset
        setShowCompose(false);
        setComposeSubject('');
        setComposeBody('');
        alert('Message sent successfully!');
    };

    const handleReply = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeChat || !replyBody.trim()) return;

        const updatedChats = parentMessages.map(chat => {
            if (chat.id === activeChat.id) {
                const thread = [
                    ...chat.thread,
                    {
                        sender: 'teacher' as const,
                        message: replyBody,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                ];
                return {
                    ...chat,
                    thread,
                    lastMessage: replyBody,
                    unread: false,
                    updated_at: new Date().toLocaleString()
                };
            }
            return chat;
        });

        setParentMessages(updatedChats);
        localStorage.setItem('parent_messages', JSON.stringify(updatedChats));
        
        const freshActive = updatedChats.find(c => c.id === activeChat.id);
        if (freshActive) setActiveChat(freshActive);

        setReplyBody('');
    };

    const handleSelectChat = (chat: ParentMessage) => {
        setActiveChat(chat);
        // Mark as read
        const updated = parentMessages.map(c => c.id === chat.id ? { ...c, unread: false } : c);
        setParentMessages(updated);
        localStorage.setItem('parent_messages', JSON.stringify(updated));
    };

    return (
        <div className="space-y-6 max-w-screen-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif">Communications Center</h1>
                    <p className="text-slate-500 text-sm">Send messages to parents and check school notices</p>
                </div>
                {!showCompose && (
                    <button 
                        onClick={() => { setShowCompose(true); setActiveChat(null); }}
                        className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 font-black text-sm text-slate-950 shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
                    >
                        <Send size={16} /> Send Parent Message
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 max-w-md">
                {[
                    { key: 'announcements', label: 'Announcements', icon: <Bell size={14} /> },
                    { key: 'parent_messages', label: 'Parent Chats', icon: <MessageSquare size={14} /> },
                    { key: 'sent_messages', label: 'Sent History', icon: <ArrowLeftRight size={14} /> }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { 
                            setActiveTab(tab.key as any); 
                            setShowCompose(false); 
                            setActiveChat(null); 
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            activeTab === tab.key
                                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {showCompose && (
                <form onSubmit={handleSendMessage} className="bg-white/5 border border-white/5 rounded-3xl p-6 max-w-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <h3 className="text-white font-bold text-sm">Compose Message</h3>
                        <button type="button" onClick={() => setShowCompose(false)} className="text-slate-400 hover:text-white">
                            <X size={18} />
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Select Parent</label>
                        <select 
                            value={selectedParentId}
                            onChange={e => setSelectedParentId(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                        >
                            {parentsList.map(p => (
                                <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
                            ))}
                            {parentsList.length === 0 && <option>No parents available</option>}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Subject</label>
                        <input 
                            type="text" required value={composeSubject} onChange={e => setComposeSubject(e.target.value)}
                            placeholder="e.g. Pupil Academic Improvement, Conduct Notice..."
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Message Body</label>
                        <textarea 
                            required rows={5} value={composeBody} onChange={e => setComposeBody(e.target.value)}
                            placeholder="Write message contents here..."
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 resize-none"
                        />
                    </div>

                    <button 
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm transition-all shadow-lg"
                    >
                        <Send size={14} /> Send Message
                    </button>
                </form>
            )}

            {!showCompose && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Announcement list */}
                    {activeTab === 'announcements' && (
                        <div className="lg:col-span-3 rounded-3xl border border-white/5 overflow-hidden bg-white/5 divide-y divide-white/5">
                            {announcements.map(item => (
                                <div key={item.id} className={`p-5 flex gap-4 ${item.is_read ? 'opacity-65' : 'bg-amber-500/[0.02]'}`}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.is_read ? 'bg-white/5 text-slate-500' : 'bg-amber-500/10 text-amber-400'}`}>
                                        {item.is_read ? <MailOpen size={18} /> : <Bell size={18} />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <h3 className="text-white text-sm font-bold">{item.title}</h3>
                                            <span className="text-[9px] font-bold uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">{item.category}</span>
                                        </div>
                                        <p className="text-slate-400 text-xs leading-relaxed max-w-3xl mt-1">{item.message}</p>
                                        <p className="text-slate-600 text-[10px] mt-2">
                                            From: <span className="font-bold text-slate-500">{item.sender}</span> • {item.created_at}
                                        </p>
                                    </div>
                                    {!item.is_read && (
                                        <button onClick={() => markNoticeRead(item.id)} className="self-start px-3 py-1.5 rounded-xl text-[10px] font-bold bg-white/5 text-slate-300 hover:text-white hover:bg-white/10">
                                            Mark as read
                                        </button>
                                    )}
                                </div>
                            ))}

                            {announcements.length === 0 && (
                                <div className="p-16 text-center text-slate-500">
                                    <Bell size={32} className="mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">No announcements received.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Parent messages thread layout */}
                    {activeTab === 'parent_messages' && (
                        <>
                            {/* Conversations list */}
                            <div className="lg:col-span-1 rounded-3xl border border-white/5 overflow-hidden bg-white/5 divide-y divide-white/5 h-fit">
                                <div className="p-4 border-b border-white/5">
                                    <p className="text-white font-bold text-xs">Conversations</p>
                                </div>
                                {parentMessages.map(chat => (
                                    <button
                                        key={chat.id}
                                        onClick={() => handleSelectChat(chat)}
                                        className={`w-full p-4 text-left transition-all hover:bg-white/3 flex items-start gap-3 ${
                                            activeChat?.id === chat.id ? 'bg-white/5 border-l-2 border-amber-500' : ''
                                        }`}
                                    >
                                        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">
                                            {chat.parentName[0]}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <p className="text-white text-xs font-bold truncate">{chat.parentName}</p>
                                                {chat.unread && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                                            </div>
                                            <p className="text-[10px] text-amber-500/70 font-semibold mb-1">Pupil: {chat.pupilName}</p>
                                            <p className="text-slate-400 text-[11px] truncate leading-tight">{chat.lastMessage}</p>
                                        </div>
                                    </button>
                                ))}

                                {parentMessages.length === 0 && (
                                    <div className="p-8 text-center text-slate-600 text-xs">No active chats.</div>
                                )}
                            </div>

                            {/* Conversation thread details */}
                            <div className="lg:col-span-2 rounded-3xl border border-white/5 overflow-hidden bg-white/5 flex flex-col justify-between min-h-[400px]">
                                {activeChat ? (
                                    <>
                                        {/* Chat header */}
                                        <div className="p-4 border-b border-white/5 bg-white/[0.01] flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold">
                                                {activeChat.parentName[0]}
                                            </div>
                                            <div>
                                                <h4 className="text-white text-xs font-bold">{activeChat.parentName}</h4>
                                                <p className="text-[10px] text-slate-500">Subject: {activeChat.subject}</p>
                                            </div>
                                        </div>

                                        {/* Message thread body */}
                                        <div className="p-4 space-y-4 flex-1 overflow-y-auto max-h-[350px]">
                                            {activeChat.thread.map((msg, i) => {
                                                const isTeacher = msg.sender === 'teacher';
                                                return (
                                                    <div key={i} className={`flex ${isTeacher ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[75%] rounded-2xl p-3.5 ${
                                                            isTeacher 
                                                                ? 'bg-amber-500 text-slate-950 rounded-tr-none' 
                                                                : 'bg-white/5 border border-white/5 text-white rounded-tl-none'
                                                        }`}>
                                                            <p className="text-xs leading-relaxed">{msg.message}</p>
                                                            <p className={`text-[8px] text-right mt-1.5 ${isTeacher ? 'text-slate-800' : 'text-slate-500'}`}>
                                                                {msg.timestamp}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Reply input */}
                                        <form onSubmit={handleReply} className="p-4 border-t border-white/5 flex gap-2">
                                            <input 
                                                type="text" value={replyBody} onChange={e => setReplyBody(e.target.value)}
                                                placeholder="Write a reply..."
                                                className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                                            />
                                            <button 
                                                type="submit" disabled={!replyBody.trim()}
                                                className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 transition-all shrink-0"
                                            >
                                                <Send size={14} />
                                            </button>
                                        </form>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center flex-1 text-slate-500 p-8">
                                        <MessageSquare size={36} className="opacity-20 mb-2" />
                                        <p className="text-xs">Select a parent chat to view history and reply.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Sent messages history list */}
                    {activeTab === 'sent_messages' && (
                        <div className="lg:col-span-3 rounded-3xl border border-white/5 overflow-hidden bg-white/5 divide-y divide-white/5">
                            {sentMessages.map(item => (
                                <div key={item.id} className="p-5 flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 text-slate-400 flex items-center justify-center shrink-0">
                                        <User size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 justify-between">
                                            <h4 className="text-white text-xs font-bold">To: {item.recipientName} ({item.recipientRole})</h4>
                                            <span className="text-[10px] text-slate-600 font-mono">{item.created_at}</span>
                                        </div>
                                        <p className="text-white font-bold text-xs mt-1">Subject: {item.subject}</p>
                                        <p className="text-slate-400 text-xs mt-1 leading-relaxed">{item.message}</p>
                                    </div>
                                </div>
                            ))}

                            {sentMessages.length === 0 && (
                                <div className="p-16 text-center text-slate-500">
                                    <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">No sent messages recorded.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
