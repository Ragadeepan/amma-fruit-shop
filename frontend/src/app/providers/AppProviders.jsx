import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../../features/auth/context/AuthProvider.jsx";
import { CartProvider } from "../../features/cart/context/CartProvider.jsx";
import { ThemeProvider } from "../../shared/theme/ThemeProvider.jsx";

export const AppProviders = ({ children }) => (
  <ThemeProvider>
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </CartProvider>
    </AuthProvider>
  </ThemeProvider>
);
