import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Upload,
    History,
    CheckCircle2,
    AlertCircle,
    FileText,
    ShieldCheck,
    TrendingUp,
    ExternalLink,
    Search,
    XCircle,
    Clock
} from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const UploaderDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalDocuments: 0,
        verifications: [],
        recentDocuments: [],
        allDocuments: [],
        allVerifications: [],
        validVerifications: [],
        invalidVerifications: []
    });
    const [instStatus, setInstStatus] = useState(null);
    const [instRequest, setInstRequest] = useState(null);
    const [file, setFile] = useState(null);
    const [hasExpiry, setHasExpiry] = useState(false);
    const [expiryDate, setExpiryDate] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [requestForm, setRequestForm] = useState({ name: '', address: '' });
    const [modalView, setModalView] = useState(null); // 'documents', 'verifications', 'valid', 'invalid'
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchStatus();
        fetchStats();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/institutions/my-status');
            setInstStatus(res.data.status);
            if (res.data.status !== 'none' && res.data.status !== 'approved') {
                setInstRequest(res.data.request);
            } else if (res.data.status === 'approved') {
                setInstRequest(res.data.institution);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/documents/stats');
            setStats(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleRequestSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/institutions/request', {
                institutionName: requestForm.name,
                institutionAddress: requestForm.address
            });
            fetchStatus();
            setMessage('Request submitted successfully!');
        } catch (err) {
            setMessage('Request failed');
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData();
        formData.append('document', file);
        if (hasExpiry && expiryDate) {
            formData.append('expiryDate', expiryDate);
        }

        setLoading(true);
        try {
            const res = await api.post('/documents/upload', formData);
            setMessage(`Document uploaded! TX: ${res.data.txHash}`);
            setFile(null);
            fetchStats();
        } catch (err) {
            setMessage('Upload failed: ' + (err.response?.data?.message || 'Unknown error'));
        } finally {
            setLoading(false);
            setExpiryDate('');
        }
    };

    const totalVerifications = stats.verifications.reduce((sum, v) => sum + v.count, 0);
    const validCount = stats.verifications.find(v => v.result === 'valid')?.count || 0;
    const invalidCount = stats.verifications.find(v => v.result === 'invalid')?.count || 0;

    // Modal content renderer
    const renderModalContent = () => {
        let data = [];

        switch (modalView) {
            case 'documents':
                data = (stats.allDocuments || []).filter(d =>
                    d.filename?.toLowerCase().includes(searchTerm.toLowerCase())
                );
                return (
                    <div className="space-y-2">
                        {data.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-slate-400">No documents found</p>
                            </div>
                        ) : (
                            data.map(doc => (
                                <div key={doc.id} className="p-4 bg-white rounded-xl border border-slate-100 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-50 rounded-lg">
                                                <FileText className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{doc.filename}</p>
                                                <p className="text-xs text-slate-500">
                                                    {new Date(doc.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${doc.status === 'active' ? 'bg-green-100 text-green-700' :
                                                doc.status === 'revoked' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                {doc.status}
                                            </span>
                                            {doc.tx_hash && (
                                                <a href={`https://etherscan.io/tx/${doc.tx_hash}`} target="_blank" rel="noreferrer"
                                                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1 justify-end mt-1">
                                                    View TX <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                );

            case 'verifications':
                data = (stats.allVerifications || []).filter(v =>
                    v.filename?.toLowerCase().includes(searchTerm.toLowerCase())
                );
                return (
                    <div className="space-y-2">
                        {data.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-slate-400">No verifications found</p>
                            </div>
                        ) : (
                            data.map(ver => (
                                <div key={ver.id} className="p-4 bg-white rounded-xl border border-slate-100 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-slate-800">{ver.filename}</p>
                                            <p className="text-xs text-slate-500">
                                                {ver.verifier_name || 'Anonymous'} • {new Date(ver.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${ver.result === 'valid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {ver.result}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                );

            case 'valid':
                data = (stats.validVerifications || []).filter(v =>
                    v.filename?.toLowerCase().includes(searchTerm.toLowerCase())
                );
                return (
                    <div className="space-y-2">
                        {data.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-slate-400">No valid verifications found</p>
                            </div>
                        ) : (
                            data.map(ver => (
                                <div key={ver.id} className="p-4 bg-green-50 rounded-xl border border-green-100 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-slate-800">{ver.filename}</p>
                                            <p className="text-xs text-slate-500">
                                                {ver.verifier_name || 'Anonymous'} • {new Date(ver.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    const COLORS = ['#10b981', '#ef4444'];
    const verificationData = stats.verifications.map(v => ({
        name: v.result === 'valid' ? 'Valid' : 'Invalid',
        value: v.count
    }));

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-8 animate-fade-in">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Uploader Dashboard
                    </h1>
                    <p className="text-slate-500 mt-1 flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4" />
                        {instStatus === 'approved' ? `Manager at ${instRequest?.name}` : 'Document Management'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {instStatus === 'approved' && (
                        <span className="px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-bold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Active Institution
                        </span>
                    )}
                </div>
            </header>

            {/* Stats Cards - Now Clickable */}
            {instStatus === 'approved' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setModalView('documents')}
                        className="glass p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all border-b-4 border-indigo-500 cursor-pointer hover:scale-105"
                    >
                        <div className="flex justify-between items-center">
                            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                                <FileText className="w-6 h-6" />
                            </div>
                            <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-black text-slate-800">{stats.totalDocuments}</h3>
                            <p className="text-slate-500 text-sm font-medium">Total Documents</p>
                        </div>
                        <p className="text-xs text-indigo-600 mt-2 font-semibold">Click to view all →</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        onClick={() => setModalView('verifications')}
                        className="glass p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all border-b-4 border-purple-500 cursor-pointer hover:scale-105"
                    >
                        <div className="flex justify-between items-center">
                            <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <History className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-black text-slate-800">{totalVerifications}</h3>
                            <p className="text-slate-500 text-sm font-medium">Total Verifications</p>
                        </div>
                        <p className="text-xs text-purple-600 mt-2 font-semibold">Click to view all →</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        onClick={() => setModalView('valid')}
                        className="glass p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all border-b-4 border-green-500 cursor-pointer hover:scale-105"
                    >
                        <div className="flex justify-between items-center">
                            <div className="p-3 rounded-xl bg-green-50 text-green-600">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                {totalVerifications > 0 ? Math.round((validCount / totalVerifications) * 100) : 0}%
                            </span>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-black text-slate-800">{validCount}</h3>
                            <p className="text-slate-500 text-sm font-medium">Verification Success</p>
                        </div>
                        <p className="text-xs text-green-600 mt-2 font-semibold">Click to view valid →</p>
                    </motion.div>
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {modalView && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setModalView(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">
                                        {modalView === 'documents' && 'All Documents'}
                                        {modalView === 'verifications' && 'All Verifications'}
                                        {modalView === 'valid' && 'Valid Verifications'}
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {modalView === 'documents' && `${(stats.allDocuments || []).length} total documents`}
                                        {modalView === 'verifications' && `${(stats.allVerifications || []).length} total verifications`}
                                        {modalView === 'valid' && `${(stats.validVerifications || []).length} valid verifications`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setModalView(null)}
                                    className="p-2 hover:bg-white rounded-xl transition-colors"
                                >
                                    <XCircle className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <div className="p-6">
                                <div className="mb-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div className="max-h-96 overflow-y-auto">
                                    {renderModalContent()}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Rest of the dashboard content... */}
            {instStatus === 'none' && (
                <div className="glass p-8 rounded-3xl shadow-xl">
                    <h2 className="text-2xl font-bold mb-4">Request Institution Access</h2>
                    <form onSubmit={handleRequestSubmit} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Institution Name"
                            value={requestForm.name}
                            onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })}
                            className="w-full p-3 border rounded-xl"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Institution Address"
                            value={requestForm.address}
                            onChange={(e) => setRequestForm({ ...requestForm, address: e.target.value })}
                            className="w-full p-3 border rounded-xl"
                            required
                        />
                        <button type="submit" className="w-full bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700">
                            Submit Request
                        </button>
                    </form>
                </div>
            )}

            {instStatus === 'pending' && (
                <div className="glass p-8 rounded-3xl shadow-xl text-center">
                    <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Request Pending</h2>
                    <p className="text-slate-500">Your institution request is awaiting admin approval.</p>
                </div>
            )}

            {instStatus === 'rejected' && (
                <div className="glass p-8 rounded-3xl shadow-xl text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Request Rejected</h2>
                    <p className="text-slate-500">{instRequest?.rejection_reason || 'Your request was rejected.'}</p>
                </div>
            )}

            {instStatus === 'approved' && (
                <div className="glass p-8 rounded-3xl shadow-xl">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <Upload className="w-6 h-6 text-indigo-600" />
                        Anchor New Document
                    </h2>
                    <p className="text-sm text-slate-500 mb-4">Immutable blockchain registration</p>
                    <form onSubmit={handleUpload} className="space-y-6">
                        <div className="group relative border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-10 text-center transition-all bg-slate-50 hover:bg-indigo-50/30">
                            <input
                                type="file"
                                onChange={(e) => setFile(e.target.files[0])}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                required
                            />
                            <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
                                <div className="p-4 bg-white rounded-full shadow-md group-hover:scale-110 transition-transform">
                                    <Upload className="w-8 h-8 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-slate-700">
                                        {file ? file.name : "Click or Drag to Upload"}
                                    </p>
                                    <p className="text-sm text-slate-500">PDF, DOCX or Images up to 10MB</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-bold text-slate-700">Set Expiry Date</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <AnimatePresence>
                                    {hasExpiry && (
                                        <motion.input
                                            initial={{ width: 0, opacity: 0 }}
                                            animate={{ width: '150px', opacity: 1 }}
                                            exit={{ width: 0, opacity: 0 }}
                                            type="date"
                                            value={expiryDate}
                                            onChange={(e) => setExpiryDate(e.target.value)}
                                            className="p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            required={hasExpiry}
                                        />
                                    )}
                                </AnimatePresence>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={hasExpiry}
                                        onChange={() => setHasExpiry(!hasExpiry)}
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all active:scale-[0.98] transform hover:-translate-y-0.5"
                        >
                            {loading ? (
                                <>
                                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    Anchor Document to Blockchain
                                    <ShieldCheck className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <AnimatePresence>
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className={`mt-4 p-4 rounded-xl shadow-lg flex items-center gap-3 text-sm font-medium ${message.includes('failed') ? 'bg-red-50 text-red-700 border border-red-100' :
                                        message.includes('RECOVERED') ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                            'bg-green-50 text-green-700 border border-green-100'
                                    }`}
                            >
                                {message.includes('failed') ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                                <div>
                                    {message.includes('RECOVERED') ? (
                                        <>
                                            <p className="font-bold">Check Passed (Document Recovered)</p>
                                            <p className="text-xs opacity-80 mt-1">This document was already verified on the blockchain. We restored the database record.</p>
                                        </>
                                    ) : (
                                        message
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default UploaderDashboard;
