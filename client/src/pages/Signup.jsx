import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Signup = () => {
    const { register } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'verifier', // Default
        institutionName: '',
        institutionAddress: ''
    });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await register(formData);
        if (!res.success) setError(res.message);
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100 py-10">
            <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-center">Sign Up</h2>
                {error && <p className="text-red-500 mb-4">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        placeholder="Full Name"
                        className="w-full p-2 border rounded"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        className="w-full p-2 border rounded"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full p-2 border rounded"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                    />

                    <div>
                        <label className="block mb-2 font-medium">Select Role:</label>
                        <select
                            className="w-full p-2 border rounded"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option value="verifier">Verifier (Public)</option>
                            <option value="uploader">Uploader (Institution)</option>
                            {/* Admin signup usually restricted, but allowed here for demo if needed */}
                            {/* <option value="admin">Admin</option> */}
                        </select>
                    </div>

                    {formData.role === 'uploader' && (
                        <div className="bg-blue-50 p-4 rounded border border-blue-200">
                            <h3 className="font-semibold mb-2 text-blue-800">Institution Request</h3>
                            <p className="text-xs text-blue-600 mb-3">You must request to create a new institution or be linked to one.</p>
                            <input
                                type="text"
                                placeholder="Institution Name"
                                className="w-full p-2 border rounded mb-2 text-sm"
                                value={formData.institutionName}
                                onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                                required
                            />
                            <textarea
                                placeholder="Institution Address"
                                className="w-full p-2 border rounded text-sm"
                                value={formData.institutionAddress}
                                onChange={(e) => setFormData({ ...formData, institutionAddress: e.target.value })}
                                required
                            />
                        </div>
                    )}

                    <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                        Sign Up
                    </button>
                </form>
                <p className="mt-4 text-center">
                    Already have an account? <Link to="/login" className="text-blue-500">Login</Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;
