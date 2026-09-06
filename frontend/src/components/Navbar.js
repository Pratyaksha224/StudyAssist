import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/dashboard" className="navbar-brand">
                    📚 StudyAssist
                </Link>
                <div className="navbar-menu">
                    {user && (
                        <>
                            <span className="navbar-user">
                                👋 {user.name} ({user.role})
                            </span>
                            {user.role === 'admin' && (
                                <Link to="/admin" className="navbar-link">
                                    Admin Panel
                                </Link>
                            )}
                            <button onClick={handleLogout} className="navbar-logout">
                                Logout
                            </button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;