import { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from "jwt-decode";
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Check expiry
                if (decoded.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    // If we want detailed user info (like institution_id updates), 
                    // we might need to fetch from /auth/me or store more in token.
                    // For now, rely on decoded token + initial login response.
                    // Better: Verify token with backend? Or just trust it.
                    setUser(decoded);
                }
            } catch (e) {
                logout();
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const res = await api.post('/auth/login', { email, password });
            const { token, user } = res.data;
            localStorage.setItem('token', token);
            setUser(user);

            // Redirect based on role
            if (user.role === 'admin') navigate('/admin');
            else if (user.role === 'uploader') navigate('/uploader');
            else navigate('/verifier');

            return { success: true };
        } catch (err) {
            return { success: false, message: err.response?.data?.message || 'Login failed' };
        }
    };

    const register = async (data) => {
        try {
            const res = await api.post('/auth/register', data);
            const { token, user } = res.data;
            localStorage.setItem('token', token);
            setUser(user);

            if (user.role === 'admin') navigate('/admin');
            else if (user.role === 'uploader') navigate('/uploader');
            else navigate('/verifier');

            return { success: true };
        } catch (err) {
            return { success: false, message: err.response?.data?.message || 'Signup failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
