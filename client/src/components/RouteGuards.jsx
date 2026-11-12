import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const RequireAuth = () => {
    const { user } = useAuth();
    return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export const RequireRole = ({ roles }) => {
    const { user } = useAuth();
    return user && roles.includes(user.role) ? <Outlet /> : <Navigate to="/login" replace />; // Or forbidden page
};
