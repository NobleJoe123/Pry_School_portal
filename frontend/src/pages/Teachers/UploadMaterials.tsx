import { useState, useEffect } from 'react';
import { 
    UploadCloud, BookOpen, Layers, Calendar, 
    FileText, CheckCircle, Clock, FileDown, Plus, Trash2, Edit3, X, HelpCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, endpoints } from '../../utils/api';
import type { SchoolClass, Subject } from '../../types';
import FilterDropdown from '../../components/ui/FilterDropdown';

interface Material {
    id: string;
    subject: string;
    subjectName: string;
    classId: string;
    className: string;
    week: string;
    topic: string;
    objectives: string;
    fileName: string;
    fileSize?: string;
    activities: string;
    evaluation: string;
    status: 'draft' | 'submitted' | 'approved';
    created_at: string;
}

const getList = <T,>(value: any): T[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (Array.isArray(value.results)) return value.results;
    return [];
};

export default function UploadMaterials() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    
    // Materials State
    const [materials, setMaterials] = useState<Material[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<Material | null>(null);

    // Form Fields
    const [subjectId, setSubjectId] = useState('');
    const [classId, setClassId] = useState('');
    const [week, setWeek] = useState('1');
    const [topic, setTopic] = useState('');
    const [objectives, setObjectives] = useState('');
    const [activities, setActivities] = useState('');
    const [evaluation, setEvaluation] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileNamePlaceholder, setFileNamePlaceholder] = useState('');

    // Load initial metadata
    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.get<any>(endpoints.academics.classes),
            api.get<any>(endpoints.academics.subjects),
        ]).then(([classesRes, subjectsRes]) => {
            let classList = getList<SchoolClass>(classesRes);
            if (user?.role === 'teacher') {
                classList = classList.filter(
                    (c: any) => c.teacher === user?.id || c.teacher_name === user?.full_name
                );
            }
            const subjectList = getList<Subject>(subjectsRes);
            setClasses(classList);
            setSubjects(subjectList);
            
            if (classList.length > 0) setClassId(classList[0].id);
            if (subjectList.length > 0) setSubjectId(subjectList[0].id);
        }).catch(err => {
            console.error("Failed to load metadata", err);
        }).finally(() => {
            setLoading(false);
        });

        // Load materials from localStorage
        const stored = localStorage.getItem('teacher_materials');
        if (stored) {
            setMaterials(JSON.parse(stored));
        } else {
            setMaterials([]);
            localStorage.setItem('teacher_materials', JSON.stringify([]));
        }
    }, [user]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setFileNamePlaceholder(file.name);
        }
    };

    const handleSave = (e: React.FormEvent, statusType: 'draft' | 'submitted') => {
        e.preventDefault();
        
        const currentClass = classes.find(c => c.id === classId);
        const currentSubject = subjects.find(s => s.id === subjectId);
        
        const newMaterial: Material = {
            id: editingItem ? editingItem.id : Math.random().toString(36).substr(2, 9),
            subject: currentSubject?.name || 'General',
            subjectName: currentSubject?.name || 'General',
            classId: classId,
            className: currentClass?.name || 'General Class',
            week: `Week ${week}`,
            topic,
            objectives,
            fileName: selectedFile ? selectedFile.name : (editingItem ? editingItem.fileName : 'lesson_note_document.docx'),
            fileSize: selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB` : (editingItem ? editingItem.fileSize : '25 KB'),
            activities,
            evaluation,
            status: statusType,
            created_at: editingItem ? editingItem.created_at : new Date().toLocaleDateString()
        };

        let updated: Material[];
        if (editingItem) {
            updated = materials.map(m => m.id === editingItem.id ? newMaterial : m);
        } else {
            updated = [newMaterial, ...materials];
        }

        setMaterials(updated);
        localStorage.setItem('teacher_materials', JSON.stringify(updated));
        
        // Reset form
        setShowForm(false);
        setEditingItem(null);
        setTopic('');
        setObjectives('');
        setActivities('');
        setEvaluation('');
        setSelectedFile(null);
        setFileNamePlaceholder('');
    };

    const handleEdit = (item: Material) => {
        setEditingItem(item);
        setTopic(item.topic);
        setObjectives(item.objectives);
        setActivities(item.activities);
        setEvaluation(item.evaluation);
        setWeek(item.week.replace('Week ', ''));
        setClassId(item.classId);
        // Find subject id matching name
        const matchSubj = subjects.find(s => s.name === item.subject);
        if (matchSubj) setSubjectId(matchSubj.id);
        
        setFileNamePlaceholder(item.fileName);
        setShowForm(true);
    };

    const handleDelete = (id: string) => {
        if (!confirm('Are you sure you want to delete this lesson note?')) return;
        const updated = materials.filter(m => m.id !== id);
        setMaterials(updated);
        localStorage.setItem('teacher_materials', JSON.stringify(updated));
    };

    const getStatusStyle = (status: 'draft' | 'submitted' | 'approved') => {
        switch (status) {
            case 'approved':
                return { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle size={12} /> };
            case 'submitted':
                return { text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: <Clock size={12} /> };
            default:
                return { text: 'text-slate-400', bg: 'bg-white/5 border-white/10', icon: <FileText size={12} /> };
        }
    };

    return (
        <div className="space-y-6 max-w-screen-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif">Upload Lesson Notes & Materials</h1>
                    <p className="text-slate-500 text-sm">Submit your curriculum objectives and download teaching materials</p>
                </div>
                {!showForm && (
                    <button 
                        onClick={() => setShowForm(true)}
                        className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 font-black text-sm text-slate-950 shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
                    >
                        <Plus size={16} /> Create Lesson Note
                    </button>
                )}
            </div>

            {showForm ? (
                <form onSubmit={(e) => handleSave(e, 'submitted')} className="bg-white/5 border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h2 className="text-white font-bold text-lg">{editingItem ? 'Edit Lesson Note' : 'New Lesson Note'}</h2>
                        <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); }} className="text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <FilterDropdown
                                label="Class"
                                fullWidth
                                value={classId}
                                options={classes.map(c => ({ id: c.id, label: c.name }))}
                                onChange={setClassId}
                                placeholder="Select Class"
                            />
                        </div>
                        <div>
                            <FilterDropdown
                                label="Subject"
                                fullWidth
                                value={subjectId}
                                options={subjects.map(s => ({ id: s.id, label: s.name }))}
                                onChange={setSubjectId}
                                placeholder="Select Subject"
                            />
                        </div>
                        <div>
                            <FilterDropdown
                                label="Week"
                                fullWidth
                                value={week}
                                options={Array.from({ length: 12 }).map((_, i) => ({ id: String(i + 1), label: `Week ${i + 1}` }))}
                                onChange={setWeek}
                                placeholder="Select Week"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Topic</label>
                        <input 
                            type="text" required value={topic} onChange={e => setTopic(e.target.value)}
                            placeholder="e.g. Simple Additions, Photosynthesis, Reading and Alphabets..."
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Lesson Objectives</label>
                            <textarea 
                                required rows={4} value={objectives} onChange={e => setObjectives(e.target.value)}
                                placeholder="What should the pupils be able to do by the end of the class?"
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Activities</label>
                            <textarea 
                                required rows={4} value={activities} onChange={e => setActivities(e.target.value)}
                                placeholder="Step-by-step description of lesson delivery activities..."
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 resize-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Evaluation / Assessment Method</label>
                        <textarea 
                            required rows={3} value={evaluation} onChange={e => setEvaluation(e.target.value)}
                            placeholder="How will you check if pupils understood the topic?"
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 resize-none"
                        />
                    </div>

                    {/* File Upload Area */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Lesson Note Document / Materials</label>
                        <div className="border border-dashed border-white/10 rounded-2xl p-6 text-center hover:bg-white/[0.01] transition-colors relative">
                            <input 
                                type="file" onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center justify-center space-y-2">
                                <UploadCloud size={32} className="text-slate-500" />
                                <p className="text-sm font-semibold text-slate-300">
                                    {fileNamePlaceholder || 'Drag & drop or click to choose lesson note file'}
                                </p>
                                <p className="text-xs text-slate-600">Supports PDF, DOCX, PPTX (Max 10MB)</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <button 
                            type="button" 
                            onClick={(e) => handleSave(e, 'draft')}
                            className="px-6 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 text-sm font-semibold transition-all"
                        >
                            Save as Draft
                        </button>
                        <button 
                            type="submit"
                            className="px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-black shadow-xl shadow-amber-500/10 active:scale-95 transition-all"
                        >
                            Submit for Approval
                        </button>
                    </div>
                </form>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {materials.map(item => {
                        const style = getStatusStyle(item.status);
                        return (
                            <div key={item.id} className="bg-white/5 border border-white/5 rounded-3xl p-5 flex flex-col justify-between hover:border-white/10 transition-all">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold capitalize ${style.bg} ${style.text}`}>
                                            {style.icon} {item.status}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono">{item.created_at}</span>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                                            <BookOpen size={10} />
                                            <span>{item.subject}</span>
                                            <span className="text-slate-700">•</span>
                                            <Layers size={10} />
                                            <span>{item.className}</span>
                                        </div>
                                        <h3 className="text-white text-base font-bold mt-1 leading-tight">{item.topic}</h3>
                                    </div>

                                    <div className="space-y-1.5 text-xs text-slate-400">
                                        <p className="line-clamp-2"><span className="font-bold text-slate-300">Obj:</span> {item.objectives}</p>
                                    </div>

                                    {item.fileName && (
                                        <div className="p-3 bg-slate-950/60 border border-white/5 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileText size={16} className="text-amber-500 shrink-0" />
                                                <p className="text-xs text-slate-300 truncate font-mono">{item.fileName}</p>
                                            </div>
                                            <span className="text-[9px] text-slate-500 shrink-0 font-mono pl-2">{item.fileSize || '25 KB'}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-5">
                                    <div className="flex gap-2">
                                        {item.status !== 'approved' && (
                                            <>
                                                <button onClick={() => handleEdit(item)} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors" title="Edit">
                                                    <Edit3 size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => alert(`Downloading: ${item.fileName}`)}
                                        className="flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 bg-amber-500/15 border border-amber-500/20 px-3 py-1.5 rounded-xl transition-all"
                                    >
                                        <FileDown size={12} /> Download
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {materials.length === 0 && (
                        <div className="col-span-full py-20 text-center">
                            <HelpCircle size={40} className="mx-auto text-slate-700 mb-3" />
                            <p className="text-slate-500 text-sm">No lesson notes uploaded yet.</p>
                            <button onClick={() => setShowForm(true)} className="mt-4 text-xs font-bold text-amber-400 hover:underline">
                                Create your first note now
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
