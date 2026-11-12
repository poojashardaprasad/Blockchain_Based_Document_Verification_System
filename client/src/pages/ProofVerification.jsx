import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, CheckCircle2, XCircle, Loader2, FileText, ExternalLink, Download, AlertTriangle } from 'lucide-react';
import api from '../api/axios';

export default function ProofVerification() {
    const { proofHash } = useParams();
    const navigate = useNavigate();
    const [proofData, setProofData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (proofHash) {
            verifyProof();
        }
    }, [proofHash]);

    const verifyProof = async () => {
        try {
            setLoading(true);
            setError('');
            const res = await api.get(`/certificates/verify/${proofHash}`);
            setProofData(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed');
            setProofData(err.response?.data || null);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
                    <p className="text-slate-600 font-medium">Verifying cryptographic proof...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="inline-flex p-4 bg-white rounded-2xl shadow-lg mb-4">
                        <ShieldCheck className={`w-12 h-12 ${proofData?.valid ? 'text-emerald-600' : 'text-red-600'}`} />
                    </div>
                    <h1 className="text-4xl font-black text-slate-800 mb-2">
                        Certificate Verification
                    </h1>
                    <p className="text-slate-500">
                        Independent validation of verification certificate
                    </p>
                </motion.div>

                {/* Main Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-[2.5rem] shadow-2xl overflow-hidden"
                >
                    {/* Status Banner */}
                    <div className={`p-6 ${(!proofData?.valid || proofData?.is_expired) ? 'bg-red-500' : 'bg-emerald-500'} text-white`}>
                        <div className="flex items-center justify-center gap-3">
                            {!proofData?.valid ? (
                                <>
                                    <XCircle className="w-8 h-8" />
                                    <span className="text-2xl font-black uppercase tracking-tight">
                                        Invalid or Not Found
                                    </span>
                                </>
                            ) : proofData?.is_expired ? (
                                <>
                                    <XCircle className="w-8 h-8" />
                                    <span className="text-2xl font-black uppercase tracking-tight">
                                        Invalid / Expired
                                    </span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-8 h-8" />
                                    <span className="text-2xl font-black uppercase tracking-tight">
                                        Certificate Valid
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Details Section */}
                    {proofData?.valid ? (
                        <div className="p-8 space-y-6">
                            {/* Security Alert if tampered */}
                            {proofData.security_alert && (
                                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3">
                                    <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-bold text-red-800 mb-1">Security Alert</h4>
                                        <p className="text-red-700 text-sm">{proofData.message}</p>
                                    </div>
                                </div>
                            )}

                            {/* Proof Information */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                        Issuing Institution
                                    </p>
                                    <p className="font-bold text-slate-800 text-lg">
                                        {proofData.proof.institution_name}
                                    </p>
                                </div>

                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                        Verification Status
                                    </p>
                                    <p className="font-bold text-emerald-600 text-lg uppercase">
                                        {proofData.proof.verification_result}
                                    </p>
                                </div>

                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                        Verified Date
                                    </p>
                                    <p className="font-medium text-slate-700">
                                        {new Date(proofData.proof.verified_at).toLocaleString('en-US', {
                                            dateStyle: 'full',
                                            timeStyle: 'short'
                                        })}
                                    </p>
                                </div>

                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                        Verifier Type
                                    </p>
                                    <p className="font-medium text-slate-700 capitalize">
                                        {proofData.proof.verifier_type}
                                    </p>
                                </div>

                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                        Expires On
                                    </p>
                                    <p className={`font-medium ${proofData.is_expired ? 'text-red-600 font-bold' : 'text-slate-700'}`}>
                                        {proofData.proof.expiry_date
                                            ? new Date(proofData.proof.expiry_date).toLocaleDateString('en-US', {
                                                dateStyle: 'full'
                                            })
                                            : 'No Expiry'}
                                    </p>
                                </div>
                            </div>

                            {/* Blockchain Information */}
                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-200">
                                <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-indigo-600" />
                                    Blockchain Proof
                                </h3>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-600 font-medium">Transaction Hash:</span>
                                        <a
                                            href={`https://etherscan.io/tx/${proofData.proof.blockchain_tx}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-mono text-xs"
                                        >
                                            {proofData.proof.blockchain_tx.substring(0, 10)}...
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-600 font-medium">Block Number:</span>
                                        <span className="font-mono text-sm font-bold text-slate-800">
                                            #{proofData.proof.block_number}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-600 font-medium">System Version:</span>
                                        <span className="text-sm font-medium text-slate-700">
                                            {proofData.proof.system_version}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Proof Hash */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Cryptographic Proof Hash
                                </p>
                                <p className="font-mono text-xs text-emerald-700 break-all bg-emerald-50 p-3 rounded-xl">
                                    {proofData.proof_hash}
                                </p>
                                <p className="text-xs text-slate-500 mt-2 italic">
                                    This hash uniquely identifies and ensures the integrity of this certificate
                                </p>
                            </div>

                            {/* Download Options */}
                            <div className="flex gap-3">
                                <a
                                    href={`http://${window.location.hostname}:5001/api/certificates/download/${proofHash}`}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                                    download
                                >
                                    <Download className="w-5 h-5" />
                                    Download PDF Certificate
                                </a>

                                <a
                                    href={`http://${window.location.hostname}:5001/api/certificates/json/${proofHash}`}
                                    className="px-6 py-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                                    download
                                >
                                    <Download className="w-5 h-5" />
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <div className="inline-block p-4 bg-red-100 text-red-600 rounded-2xl mb-4">
                                <XCircle className="w-12 h-12" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">
                                {error || 'Certificate Not Found'}
                            </h3>
                            <p className="text-slate-600 max-w-md mx-auto mb-6">
                                The provided proof hash is invalid, does not exist, or the certificate data has been tampered with.
                            </p>
                            <button
                                onClick={() => navigate('/')}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all"
                            >
                                Return to Home
                            </button>
                        </div>
                    )}
                </motion.div>

                {/* Footer Info */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8 text-center"
                >
                    <p className="text-xs text-slate-500">
                        This is a zero-trust verification system. No login required.
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
