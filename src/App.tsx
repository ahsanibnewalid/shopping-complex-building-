import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Products from './pages/Products'
import Shop from './pages/Shop'
import ProductPage from './pages/ProductPage'
import CartPage from './pages/CartPage'
import TrackOrder from './pages/TrackOrder'
import Sell from './pages/Sell'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import Login from "./pages/Login"
import NotFound from "./pages/NotFound"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/products" element={<Products />} />
      <Route path="/shops/:slug" element={<Shop />} />
      <Route path="/shops/:slug/product/:id" element={<ProductPage />} />
      <Route path="/shops/:slug/cart" element={<CartPage />} />
      <Route path="/track-order" element={<TrackOrder />} />
      <Route path="/sell" element={<Sell />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
