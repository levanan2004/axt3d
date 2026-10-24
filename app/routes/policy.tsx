import {useLoaderData,type LoaderFunctionArgs} from 'react-router';
import {StoreLayout,Breadcrumb} from '../components/store';
import {shopConfig} from '../lib/config';
import {getEnv} from '../lib/db.server';
import {seo} from '../lib/seo';
const policies:Record<string,{title:string;key:'terms'|'privacy'|'returns'|'shipping'}>={'dieu-khoan':{title:'Điều khoản sử dụng',key:'terms'},'bao-mat':{title:'Chính sách bảo mật',key:'privacy'},'doi-tra':{title:'Đổi trả & hoàn tiền',key:'returns'},'van-chuyen':{title:'Chính sách vận chuyển',key:'shipping'}};
export function loader({params,context}:LoaderFunctionArgs){const policy=policies[params.slug||''];if(!policy)throw new Response('Không tìm thấy chính sách.',{status:404});return {...policy,content:shopConfig.policies[policy.key],slug:params.slug,base:getEnv(context).SITE_URL};}
export function meta({data}:{data?:ReturnType<typeof loader>}){return data?seo(data.title,`${data.title} của ${shopConfig.shop.name}`,`/chinh-sach/${data.slug}`,data.base):[];}
export default function Policy(){const {title,content}=useLoaderData<typeof loader>();return <StoreLayout><Breadcrumb items={[{label:title}]}/><article className="panel prose"><h1>{title}</h1>{content?<p style={{whiteSpace:'pre-wrap'}}>{content}</p>:<p>Nội dung đang được cửa hàng cập nhật. Vui lòng liên hệ cửa hàng để biết thông tin trước khi mua hàng.</p>}</article></StoreLayout>;}
