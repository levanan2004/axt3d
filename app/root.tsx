import { Links,Meta,Outlet,Scripts,ScrollRestoration,isRouteErrorResponse,useRouteError,Link } from 'react-router';
import type { ReactNode } from 'react';
import { CartProvider } from './components/cart-context';
import './app.css';
export function Layout({children}:{children:ReactNode}) {return <html lang="vi"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="theme-color" content="#F06D19"/><Meta/><Links/><link rel="icon" href="/favicon.svg" type="image/svg+xml"/></head><body><a className="skip-link" href="#main-content">Đến nội dung chính</a>{children}<ScrollRestoration/><Scripts/></body></html>;}
export default function App(){return <CartProvider><Outlet/></CartProvider>;}
export function ErrorBoundary(){const error=useRouteError();const status=isRouteErrorResponse(error)?error.status:500;return <main className="empty-state"><h1>{status===404?'Không tìm thấy trang':status===403||status===401?'Cần xác thực truy cập':'Chưa thể xử lý yêu cầu'}</h1><p>{isRouteErrorResponse(error)&&typeof error.data==='string'?error.data:'Vui lòng thử lại sau. Nếu bạn vừa đặt hàng, hãy tra cứu trước khi tạo đơn mới.'}</p><Link className="button button-primary" to="/">Về trang chủ</Link><Link className="button button-outline" to="/theo-doi-don">Tra cứu đơn</Link></main>;}
