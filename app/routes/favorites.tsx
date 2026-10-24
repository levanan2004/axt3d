import {useLoaderData,type LoaderFunctionArgs} from 'react-router';
import {useCart} from '../components/cart-context';
import {StoreLayout,ProductGrid,EmptyState,Breadcrumb} from '../components/store';
import {getEnv,listProducts} from '../lib/db.server';
import {shopConfig} from '../lib/config';
export async function loader({context}:LoaderFunctionArgs){return listProducts(getEnv(context).DB);}
export function meta(){return [{title:`Yêu thích | ${shopConfig.shop.name}`},{name:'robots',content:'noindex,follow'}];}
export default function Favorites(){const {products}=useLoaderData<typeof loader>(),{favorites}=useCart();const saved=products.filter(p=>favorites.includes(p.slug));return <StoreLayout><Breadcrumb items={[{label:'Yêu thích'}]}/><h1>Những món đồ bạn thích</h1><p className="muted page-intro">Được lưu trên trình duyệt này để bạn dễ tìm lại.</p>{saved.length?<ProductGrid products={saved}/>:<EmptyState title="Lưu lại một chút cảm hứng" description="Chạm vào trái tim trên sản phẩm để lưu vào đây."/>}</StoreLayout>;}
