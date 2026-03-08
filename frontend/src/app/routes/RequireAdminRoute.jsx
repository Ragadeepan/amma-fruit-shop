import { Navigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth.js";
import { routes } from "../../shared/constants/routes.js";

export const RequireAdminRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate replace to={routes.adminLogin} />;
  }

  return children;
};
