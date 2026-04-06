import { Navigate } from "react-router-dom";
import { authService } from "@/services/auth.service";

const AdminRoute = ({ children }) => {
    const user = authService.getCurrentUser();

    if (!authService.isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    if (user?.role !== "admin") {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default AdminRoute;
