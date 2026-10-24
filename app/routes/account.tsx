import {StoreLayout,EmptyState} from '../components/store';
import {shopConfig} from '../lib/config';
export function meta(){return [{title:`Đơn hàng của bạn | ${shopConfig.shop.name}`},{name:'robots',content:'noindex,follow'}];}
export default function Account(){return <StoreLayout><EmptyState title="Đơn hàng của bạn" description="Bạn có thể mua hàng không cần tài khoản. Dùng mã đơn và số điện thoại để xem tiến độ." action="Tra cứu đơn hàng" to="/theo-doi-don"/></StoreLayout>;}
