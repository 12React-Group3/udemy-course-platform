import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');

    if (!token) {
        // No token, redirect to login
        return <Navigate to="/login" replace />;
    }

    // Token exists, render the protected page
    return children;
};

export default ProtectedRoute;
