import { useState } from 'react';
import api from '../api/axios';
import {
    ShieldCheck,
    Upload,
    CheckCircle2,
    AlertCircle,
    History,
    Search,
    FileText,
    ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Verifier = () => {
    const [file, setFile] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setError('');
        setResult(null);

        const formData = new FormData();
        formData.append('document', file);

        try {
            const res = await api.post('/documents/verify', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(res.data);
        } catch (err) {
            setError('Verification failed or server error');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen p-4 md:p-8 flex items-center justify-center animate-fade-in">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass p-8 md:p-12 rounded-[2.5rem] shadow-2xl max-w-2xl w-full border-t-8 border-indigo-600"
            >
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 bg-indigo-100 text-indigo-600 rounded-2xl mb-4">
                        <ShieldCheck className="w-10 h-10" />
                    </div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight">
                        Instant Verification
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        Validate document authenticity against the public ledger
                    </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-8">
                    <div className="group relative border-2 border-dashed border-slate-200 p-12 text-center rounded-3xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all">
                        <input
                            type="file"
                            onChange={e => setFile(e.target.files[0])}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-white shadow-sm text-slate-400 group-hover:text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
                                <Upload className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-slate-700">
                                    {file ? file.name : "Drop document to verify"}
                                </p>
                                <p className="text-sm text-slate-400 mt-1 uppercase tracking-widest font-black">
                                    Supports Hash Matching
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !file}
                        className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:bg-black hover:-translate-y-1 transition-all disabled:grayscale disabled:opacity-50 disabled:translate-y-0 text-lg flex items-center justify-center gap-3"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                Validating Entropy...
                            </>
                        ) : (
                            <>
                                <Search className="w-6 h-6" />
                                Verify Authenticity
                            </>
                        )}
                    </button>
                </form>

                <AnimatePresence>
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mt-10 overflow-hidden rounded-[2rem] border-2 ${(result.result === 'valid' && !result.isExpired)
                                ? 'bg-emerald-50 border-emerald-100 shadow-emerald-100'
                                : 'bg-red-50 border-red-100 shadow-red-100'
                                } shadow-xl`}
                        >
                            <div className={`p-6 flex items-center justify-center gap-3 text-2xl font-black uppercase tracking-tighter ${(result.result === 'valid' && !result.isExpired) ? 'text-emerald-700' : 'text-red-700'
                                }`}>
                                {(result.result === 'valid' && !result.isExpired) ? (
                                    <>
                                        <CheckCircle2 className="w-8 h-8" />
                                        Legitimate Document
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-8 h-8" />
                                        {result.isExpired ? 'Expired / Invalid' : 'Tampered / Invalid'}
                                    </>
                                )}
                            </div>

                            {result.result === 'valid' && (
                                <div className="p-8 bg-white/50 backdrop-blur-sm space-y-6 border-t border-emerald-100">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 bg-white rounded-2xl shadow-sm">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Origin Institution</p>
                                            <p className="font-bold text-slate-800">{result.institution}</p>
                                        </div>
                                        <div className="p-4 bg-white rounded-2xl shadow-sm">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time Anchored</p>
                                            <p className="font-bold text-slate-800">{new Date(result.timestamp).toLocaleDateString()}</p>
                                        </div>
                                        <div className="p-4 bg-white rounded-2xl shadow-sm">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Expires On</p>
                                            <p className={`font-bold ${result.isExpired ? 'text-red-600' : 'text-slate-800'}`}>
                                                {result.expiryDate ? new Date(result.expiryDate).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-white rounded-2xl shadow-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Network Transaction</p>
                                        <div className="flex items-center justify-between">
                                            {result.txHash === 'RECOVERED_FROM_BLOCKCHAIN' ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                        Recovered
                                                    </span>
                                                    <span className="text-xs text-slate-500 italic">Verified via History</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="font-mono text-[10px] text-indigo-600 truncate mr-4">{result.txHash}</p>
                                                    <a href={`https://etherscan.io/tx/${result.txHash}`} target="_blank" rel="noreferrer" className="p-2 hover:bg-indigo-50 rounded-xl transition-colors">
                                                        <ExternalLink className="w-4 h-4 text-indigo-600" />
                                                    </a>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* NEW: Cryptographic Verification Certificate Section */}
                                    {result.certificate && (
                                        <div className="mt-6 pt-6 border-t-2 border-emerald-200">
                                            <div className="flex items-center gap-2 mb-4">
                                                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                                                    Verification Certificate
                                                </h3>
                                            </div>

                                            <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 p-4 rounded-2xl border border-emerald-200">
                                                <p className="text-xs text-slate-600 mb-3">
                                                    Download your tamper-proof verification certificate
                                                </p>

                                                {/* Proof Hash Display */}
                                                <div className="bg-white p-3 rounded-xl mb-4 border border-emerald-100">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                        Cryptographic Proof Hash
                                                    </p>
                                                    <p className="font-mono text-[10px] text-emerald-700 break-all">
                                                        {result.certificate.proofHash}
                                                    </p>
                                                </div>

                                                {/* Download Options */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <a
                                                        href={`http://${window.location.hostname}:5001${result.certificate.downloadPDF}`}
                                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                                                        download
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                        <span className="text-sm">PDF</span>
                                                    </a>

                                                    <a
                                                        href={`http://${window.location.hostname}:5001${result.certificate.downloadJSON}`}
                                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                                                        download
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                        <span className="text-sm">JSON</span>
                                                    </a>
                                                </div>

                                                {/* Verify Online Button */}
                                                <a
                                                    href={result.certificate.verifyOnline}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-3 flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-gray-50 text-emerald-700 font-bold rounded-xl border-2 border-emerald-200 hover:border-emerald-300 transition-all"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                    <span className="text-sm">Verify Certificate Online</span>
                                                </a>

                                                {/* Info Text */}
                                                <p className="mt-3 text-[10px] text-slate-500 text-center italic">
                                                    This certificate is independently verifiable and tamper-evident
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {result.result !== 'valid' && (
                                <div className="p-8 bg-white/50 backdrop-blur-sm text-center border-t border-red-100">
                                    <p className="text-red-600 font-bold mb-2">Verification Error Details</p>
                                    <p className="text-slate-600 text-sm leading-relaxed max-w-xs mx-auto italic">
                                        "{result.reason || 'The provided document digital fingerprint does not match any anchored record on the blockchain.'}"
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {
                    error && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-6 text-red-600 text-center font-bold bg-red-50 p-4 rounded-2xl"
                        >
                            {error}
                        </motion.p>
                    )
                }

                <div className="mt-12 pt-8 border-t border-slate-100 text-center">
                    <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mb-4">Secured by decentralized protocol</p>
                    <div className="flex justify-center gap-8 opacity-40 grayscale group-hover:grayscale-0 transition-all">
                        <FileText className="w-6 h-6" />
                        <ShieldCheck className="w-6 h-6" />
                        <History className="w-6 h-6" />
                    </div>
                </div>
            </motion.div >
        </div >
    );
};

export default Verifier;
