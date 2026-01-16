//  this is the login jsx file for login page
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

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
        <div className='min-h-screen flex items-center justify-center bg-gray-100 min-w-screen'>
            <div className="login-container m-4 display-grid   w-full sm:max-w-lg rounded-2xl p-16 shadow-md bg-white l">
                <h2 className="font-bold text-2xl ">Welcome Back</h2>
                <h3 className="text-gray-600 mb-6">Login to your account, kick off your today learning</h3>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div>
                        <label>Email:</label>
                        <input
                          className='border rounded-lg p-2 w-full mb-4'
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label>Password:</label>
                        <input
                          className='border rounded-lg p-2 w-full mb-4'
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button className='border rounded-lg p-2 w-full mb-4 bg-brand! text-white' type="submit">Login</button>
                    <h3> Forgot password?  <a href="/forgot-password" className="text-brand hover:underline">Click here</a> </h3>
                    <h3> Don't have an account? <a href="/register" className="text-brand hover:underline">Register here</a> </h3>
                </form>
            </div>
        </div>
    );
};
export default Login;
