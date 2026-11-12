import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useAuth();

    return (
        <nav className="bg-gray-800 text-white p-4 shadow-lg">
            <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-4">
                <Link to="/" className="text-xl font-bold tracking-wider hover:text-gray-300">
                    DocVerify<span className="text-blue-400">Chain</span>
                </Link>

                <div className="flex flex-wrap items-center gap-4 md:gap-6">
                    <Link to="/verifier" className="hover:text-blue-300 transition text-sm md:text-base">Verify</Link>

                    {user ? (
                        <>
                            {user.role === 'uploader' && <Link to="/uploader" className="hover:text-blue-300 text-sm md:text-base">Dashboard</Link>}
                            {user.role === 'admin' && <Link to="/admin" className="hover:text-blue-300 text-sm md:text-base">Admin</Link>}

                            <div className="flex items-center gap-2 md:gap-4 ml-2 md:ml-4 pl-2 md:pl-4 border-l border-gray-600">
                                <span className="hidden md:inline text-sm text-gray-400">Hi, {user.name || "User"}</span>
                                <button
                                    onClick={logout}
                                    className="bg-red-600 px-3 py-1 md:px-4 md:py-1.5 rounded text-xs md:text-sm hover:bg-red-700 transition"
                                >
                                    Logout
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 md:gap-4">
                            <Link to="/login" className="px-3 py-1.5 md:px-4 md:py-2 text-sm md:text-base hover:bg-gray-700 rounded transition">Login</Link>
                            <Link to="/signup" className="bg-blue-600 px-3 py-1.5 md:px-4 md:py-2 text-sm md:text-base rounded hover:bg-blue-700 transition">Sign Up</Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
