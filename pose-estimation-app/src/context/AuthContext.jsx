import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

const isTokenExpired = (token) => {
    if (!token) return true;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp < Date.now() / 1000) {
            return true;
        }
        return false;
    } catch (e) {
        return true;
    }
};

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => {
        const savedToken = localStorage.getItem('token');
        if (savedToken && isTokenExpired(savedToken)) {
            localStorage.removeItem('token');
            return null;
        }
        return savedToken || null;
    });
    const [isAuthenticated, setIsAuthenticated] = useState(!!token);

    useEffect(() => {
        if (token) {
            if (isTokenExpired(token)) {
                setToken(null);
            } else {
                localStorage.setItem('token', token);
                setIsAuthenticated(true);
            }
        } else {
            localStorage.removeItem('token');
            setIsAuthenticated(false);
        }
    }, [token]);

    const login = (newToken) => {
        setToken(newToken);
    };

    const logout = () => {
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ token, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
