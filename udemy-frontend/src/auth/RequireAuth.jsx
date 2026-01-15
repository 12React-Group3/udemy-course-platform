import { Navigate, useLocation } from "react-router-dom";
import { getAuth } from "./authStore";

export default function RequireAuth({ children }) {
    const location = useLocation();
    const auth = getAuth();

    // Treat missing token as logged out
    if (!auth?.token) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location }}
            />
        );
    }

    return children;
}
