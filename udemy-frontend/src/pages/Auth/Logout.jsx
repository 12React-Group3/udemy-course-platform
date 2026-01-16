import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../api/auth';

const Logout = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Clear token
        logout();
        // Redirect to login
        navigate('/login');
    }, [navigate]);

    return null;
};

export default Logout;
