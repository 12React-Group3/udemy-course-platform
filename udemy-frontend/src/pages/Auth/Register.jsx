//  this is the page for registering a new user
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AuthFooter from './AuthFooter';

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
        <div className='min-h-screen flex items-center justify-center min-w-screen bg-gray-50 relative overflow-hidden'>
            {/* Sparse noise dots background */}
            <div
                className="absolute inset-0 opacity-40"
                style={{
                    backgroundImage: `
                        radial-gradient(circle at 20% 30%, #007bff 1px, transparent 1px),
                        radial-gradient(circle at 80% 20%, #007bff 1.5px, transparent 1.5px),
                        radial-gradient(circle at 40% 70%, #60a5fa 1px, transparent 1px),
                        radial-gradient(circle at 90% 80%, #007bff 1px, transparent 1px),
                        radial-gradient(circle at 10% 90%, #60a5fa 1.5px, transparent 1.5px),
                        radial-gradient(circle at 60% 10%, #007bff 1px, transparent 1px),
                        radial-gradient(circle at 30% 50%, #60a5fa 1px, transparent 1px),
                        radial-gradient(circle at 70% 60%, #007bff 1.5px, transparent 1.5px),
                        radial-gradient(circle at 50% 90%, #60a5fa 1px, transparent 1px),
                        radial-gradient(circle at 15% 15%, #007bff 1px, transparent 1px)
                    `,
                    backgroundSize: '100px 100px',
                }}
            />
            <div className="register-container m-4 w-full sm:max-w-lg rounded-2xl p-12 shadow-lg bg-white/90 backdrop-blur-sm relative z-10">
                <h2 className="font-bold text-2xl">Create Account</h2>
                <h3 className="text-gray-600 mb-6">Join us and start your learning journey</h3>
                {error && <p className="text-red-500 mb-4">{error}</p>}
                <form onSubmit={handleSubmit} encType="multipart/form-data">
                    {/* Username field */}
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-1">Username</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                </svg>
                            </span>
                            <input
                                className="border border-gray-300 rounded-lg py-2 pl-10 pr-3 w-full focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                                type="text"
                                placeholder="Enter your username"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Email field */}
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-1">Email</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                                </svg>
                            </span>
                            <input
                                className="border border-gray-300 rounded-lg py-2 pl-10 pr-3 w-full focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Password field */}
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                </svg>
                            </span>
                            <input
                                className="border border-gray-300 rounded-lg py-2 pl-10 pr-3 w-full focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Role field - Toggle */}
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">Role</label>
                        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setRole('learner')}
                                className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                                    role === 'learner'
                                        ? '!bg-brand text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                Learner
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('tutor')}
                                className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                                    role === 'tutor'
                                        ? '!bg-brand text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                Tutor
                            </button>
                        </div>
                    </div>

                    {/* Avatar field */}
                    <div className="mb-6">
                        <label className="block text-gray-700 mb-1">Avatar</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                </svg>
                            </span>
                            <input
                                className="border border-gray-300 rounded-lg py-2 pl-10 pr-3 w-full focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-brand file:text-white file:cursor-pointer"
                                type="file"
                                accept="image/*"
                                onChange={(e) => setAvatar(e.target.files[0])}
                            />
                        </div>
                    </div>

                    <button className='border rounded-lg p-2 w-full mb-4 !bg-brand text-white hover:opacity-90 transition-opacity' type="submit">Register</button>
                    <h3 className="text-center">Already have an account? <a href="/login" className="text-brand! hover:underline">Login here</a></h3>
                </form>
            </div>
            <AuthFooter />
        </div>
    );
};
export default Register;
