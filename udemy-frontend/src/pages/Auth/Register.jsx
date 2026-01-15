//  this is the page for registering a new user
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Register = () => {
    const [userName, setUserName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('learner');
    const [avatar, setAvatar] = useState(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const formData = new FormData();
            formData.append('userName', userName);
            formData.append('email', email);
            formData.append('password', password);
            formData.append('role', role);
            if (avatar) {
                formData.append('avatar', avatar);
            }
            const response = await axios.post('http://localhost:5000/api/auth/register', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            console.log('Registration successful:', response.data);
            // Save token to localStorage
            localStorage.setItem('token', response.data.data.token);
            // Redirect to dashboard or home page
            navigate('/dashboard');
        } catch (err) {
            console.error('Registration error:', err.response ? err.response.data : err.message);
            setError(err.response && err.response.data ? err.response.data.error : 'Registration failed. Please try again.');
        }
    };
    return (
        <div className="register-container">
            <h2>Register</h2>
            {error && <p className="error-message">{error}</p>}
            <form onSubmit={handleSubmit} encType="multipart/form-data">

                <div>
                    <label>Username:</label>
                    <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Email:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div>   
                    <label>Password:</label>
                    <input

                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Role:</label>
                    <select value={role} onChange={(e) => setRole(e.target.value)}>
                        <option value="learner">Learner</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div>
                    <label>Avatar:</label>
                    <input

                        type="file"
                        accept="image/*"
                        onChange={(e) => setAvatar(e.target.files[0])}
                    />
                </div>
                <button type="submit">Register</button>
            </form>
        </div>
    );
};
export default Register;
