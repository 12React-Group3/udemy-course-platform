//  this is the login jsx file for login page
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AuthFooter from './AuthFooter';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
            console.log('Login successful:', response.data);
            // Save token to localStorage
            localStorage.setItem('token', response.data.data.token);
            // Redirect to dashboard or home page
            navigate('/dashboard');
        } catch (err) {
            console.error('Login error:', err.response ? err.response.data : err.message);
            setError(err.response && err.response.data ? err.response.data.error : 'Login failed. Please try again.');
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
            <div className="login-container m-4 display-grid w-full sm:max-w-lg rounded-2xl p-16 shadow-lg bg-white/90 backdrop-blur-sm relative z-10">
                <h2 className="font-bold text-2xl ">Welcome Back</h2>
                <h3 className="text-gray-600 mb-6">Login to your account, kick off your today learning</h3>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-1">Email</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
  <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
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
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
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
                    <button className='border rounded-lg p-2 w-full mb-4 bg-brand! text-white' type="submit">Login</button>
                    <h3> Forgot password?  <a href="/forgot-password" className="text-brand! hover:underline">Click here</a> </h3>
                    <h3> Don't have an account? <a href="/register" className="text-brand! hover:underline">Register here</a> </h3>
                </form>
            </div>
            <AuthFooter />
        </div>
    );
};
export default Login;
