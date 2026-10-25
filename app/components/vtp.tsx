import {useEffect,useState} from 'react';
import {useFetcher} from 'react-router';
import {Truck,Copy,LoaderCircle,ExternalLink,Check} from 'lucide-react';
import {money} from '../lib/money';
import {shippingCard,vtpTrackingUrl,type ShippingCardOrder} from '../lib/vtp-order';

export type VtpPreview={weightGram:number;codAmount:number;warehouse:string};
type ActionReply={vtp?:{ok:boolean;trackingNumber?:string;error?:string;unknown?:boolean}};

function useCopy(){const [toast,setToast]=useState('');useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),2500);return()=>clearTimeout(t);},[toast]);return {toast,copy:async(text:string)=>{try{await navigator.clipboard.writeText(text);setToast('Đã sao chép mã vận đơn');}catch{setToast('Không sao chép được, hãy chọn và sao chép thủ công.');}}};}

/** Admin: tracking number after creation (monospace navy + copy + VTP link). */
export function VtpTracking({trackingNumber}:{trackingNumber:string}){const {toast,copy}=useCopy();return <span className="vtp-tracking"><code>{trackingNumber}</code><button type="button" className="vtp-icon-button" aria-label="Sao chép mã vận đơn" onClick={()=>copy(trackingNumber)}><Copy size={16}/></button><a href={vtpTrackingUrl(trackingNumber)} target="_blank" rel="noopener noreferrer">Xem trên Viettel Post <ExternalLink size={13}/></a>{toast&&<span className="vtp-toast" role="status">{toast}</span>}</span>;}

/** Admin: "Tạo đơn Viettel Post" for da_coc orders. Posts to the order detail action, which is idempotent server-side. */
export function VtpCreateButton({code,status,trackingNumber,preview,lastError}:{code:string;status:string;trackingNumber:string|null;preview:VtpPreview|null;lastError?:string|null}){
 const fetcher=useFetcher<ActionReply>(),[open,setOpen]=useState(false);
 const busy=fetcher.state!=='idle',reply=fetcher.data?.vtp;
 const number=reply?.ok?reply.trackingNumber!:trackingNumber;
 if(number)return <VtpTracking trackingNumber={number}/>;
 if(status!=='da_coc'||!preview)return null;
 const error=reply&&!reply.ok?reply.error:lastError||null,unknown=reply?.unknown||false;
 const send=(confirmUnknown=false)=>{fetcher.submit({intent:'vtp_create',confirmUnknown:confirmUnknown?'1':''},{method:'post',action:`/admin/don-hang/${code}`});setOpen(false);};
 return <div className="vtp-create">
  <button type="button" className="vtp-primary" disabled={busy} onClick={()=>setOpen(true)}>{busy?<LoaderCircle className="spin" size={18}/>:<Truck size={18}/>}{busy?'Đang tạo…':'Tạo đơn Viettel Post'}</button>
  {error&&!busy&&<div className="vtp-error" role="alert"><span>{error}</span><button type="button" onClick={()=>unknown?send(window.confirm('Bạn đã kiểm tra trên Viettel Post và chắc chắn chưa có đơn này?')):setOpen(true)}>Thử lại</button></div>}
  {open&&<div className="vtp-dialog-backdrop" onClick={()=>setOpen(false)}><div className="vtp-dialog" role="dialog" aria-modal="true" aria-labelledby={`vtp-title-${code}`} onClick={e=>e.stopPropagation()}>
   <h2 id={`vtp-title-${code}`}>Tạo đơn Viettel Post #{code}</h2>
   <dl><div><dt>Kho lấy hàng</dt><dd>{preview.warehouse}</dd></div><div><dt>Tiền thu hộ (COD)</dt><dd>{money(preview.codAmount)}</dd></div><div><dt>Khối lượng</dt><dd>{preview.weightGram.toLocaleString('vi-VN')} g</dd></div></dl>
   <div className="vtp-dialog-actions"><button type="button" className="vtp-secondary" onClick={()=>setOpen(false)}>Huỷ</button><button type="button" className="vtp-primary" disabled={busy} onClick={()=>send(false)}>{busy?<LoaderCircle className="spin" size={18}/>:<Truck size={18}/>}{busy?'Đang tạo…':'Tạo đơn'}</button></div>
  </div></div>}
 </div>;
}

const steps=['Đã cọc','Đang giao','Hoàn thành'];
/** Customer: "Vận chuyển" card under the order status. */
export function ShippingCard({order}:{order:ShippingCardOrder}){
 const card=shippingCard(order),{toast,copy}=useCopy();
 if(!card)return null;
 return <section className="shipping-card" aria-labelledby="shipping-card-title">
  <h2 id="shipping-card-title">Vận chuyển</h2>
  <ol className="shipping-progress">{steps.map((label,i)=><li key={label} className={i<card.step?'done':''}><span>{i<card.step?<Check size={12}/>:null}</span>{label}</li>)}</ol>
  <h3>{card.title}</h3>
  <p>{card.description}</p>
  <p className="shipping-carrier">Viettel Post</p>
  <p className="shipping-code-line">Mã vận đơn Viettel Post: <strong className="shipping-code">{card.trackingNumber}</strong><button type="button" className="vtp-icon-button" aria-label="Sao chép mã vận đơn" onClick={()=>copy(card.trackingNumber)}><Copy size={16}/></button></p>
  {card.codAmount!==null&&<p>Cần thanh toán khi nhận hàng: <strong>{money(card.codAmount)}</strong></p>}
  {card.inspectionNote&&<p className="shipping-note">{card.inspectionNote}</p>}
  <a className="shipping-track" href={card.trackingUrl} target="_blank" rel="noopener noreferrer">Theo dõi đơn hàng</a>
  {toast&&<span className="vtp-toast" role="status">{toast}</span>}
 </section>;
}
