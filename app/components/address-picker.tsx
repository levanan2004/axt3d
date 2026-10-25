import {useEffect,useMemo,useRef,useState} from 'react';
import {ChevronDown,Search,X} from 'lucide-react';
import {money} from '../lib/money';
import {shopConfig} from '../lib/config';

export type Place={id:number;name:string};
export type AddressValue={provinceId:number;provinceName:string;wardId:number;wardName:string;street:string};
export type FeeState={status:'idle'|'loading'|'done';fee:number|null;fallback:boolean;days:number|null};
export const emptyAddress:AddressValue={provinceId:0,provinceName:'',wardId:0,wardName:'',street:''};
const STORAGE_KEY='axt3d.address';
const fold=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();

export function loadSavedContact():{name?:string;phone?:string;address?:AddressValue}{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');}catch{return {};}}
export function saveContact(contact:{name?:string;phone?:string;address:AddressValue}){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(contact));}catch{}}
export const addressComplete=(a:AddressValue)=>a.provinceId>0&&a.wardId>0&&a.street.trim().length>=3;

function SearchSelect({label,placeholder,options,value,onSelect,disabled,loading,error}:{label:string;placeholder:string;options:Place[];value:Place|null;onSelect:(p:Place)=>void;disabled?:boolean;loading?:boolean;error?:string}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState('');const input=useRef<HTMLInputElement>(null),root=useRef<HTMLDivElement>(null);
 const filtered=useMemo(()=>{const q=fold(query.trim());return q?options.filter(o=>fold(o.name).includes(q)):options;},[query,options]);
 useEffect(()=>{if(!open)return;setQuery('');const t=setTimeout(()=>input.current?.focus(),30);const close=(e:MouseEvent)=>{if(root.current&&!root.current.contains(e.target as Node))setOpen(false);};const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};document.addEventListener('mousedown',close);document.addEventListener('keydown',esc);return()=>{clearTimeout(t);document.removeEventListener('mousedown',close);document.removeEventListener('keydown',esc);};},[open]);
 return <div className="field search-select" ref={root}><span>{label}</span>
  <button type="button" className="search-select-trigger" aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={()=>setOpen(o=>!o)}><span className={value?'':'muted'}>{loading?'Đang tải...':value?.name||placeholder}</span><ChevronDown size={16}/></button>
  {error&&<small className="error-message">{error}</small>}
  {open&&<><div className="search-select-backdrop" onClick={()=>setOpen(false)}/><div className="search-select-panel" role="dialog" aria-label={label}>
   <div className="search-select-head"><strong>{label}</strong><button type="button" className="icon-button" aria-label="Đóng" onClick={()=>setOpen(false)}><X size={18}/></button></div>
   <label className="search-select-search"><Search size={15}/><input ref={input} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm nhanh..." aria-label={`Tìm ${label.toLowerCase()}`}/></label>
   <ul role="listbox">{filtered.map(o=><li key={o.id} role="option" aria-selected={value?.id===o.id}><button type="button" className={value?.id===o.id?'active':''} onClick={()=>{onSelect(o);setOpen(false);}}>{o.name}</button></li>)}{!filtered.length&&<li className="muted search-select-empty">Không tìm thấy kết quả</li>}</ul>
  </div></>}
 </div>;
}

/** Province/City -> Ward/Commune (7/2025 units) from VTP via /api/shipping, then the street. */
export function AddressPicker({value,onChange}:{value:AddressValue;onChange:(v:AddressValue)=>void}){
 const [provinces,setProvinces]=useState<Place[]>([]),[wards,setWards]=useState<Place[]>([]),[loadingP,setLoadingP]=useState(true),[loadingW,setLoadingW]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let live=true;fetch('/api/shipping/provinces').then(async r=>{const p=await r.json() as {provinces?:Place[];error?:string};if(!r.ok||!p.provinces)throw new Error(p.error||'Chưa tải được tỉnh/thành.');if(live)setProvinces(p.provinces);}).catch(e=>live&&setError(e.message)).finally(()=>live&&setLoadingP(false));return()=>{live=false;};},[]);
 useEffect(()=>{if(!value.provinceId){setWards([]);return;}let live=true;setLoadingW(true);fetch(`/api/shipping/wards?provinceId=${value.provinceId}`).then(async r=>{const p=await r.json() as {wards?:Place[];error?:string};if(!r.ok||!p.wards)throw new Error(p.error||'Chưa tải được phường/xã.');if(live)setWards(p.wards);}).catch(e=>live&&setError(e.message)).finally(()=>live&&setLoadingW(false));return()=>{live=false;};},[value.provinceId]);
 return <>
  <input type="hidden" name="provinceId" value={value.provinceId||''}/><input type="hidden" name="provinceName" value={value.provinceName}/><input type="hidden" name="wardId" value={value.wardId||''}/><input type="hidden" name="wardName" value={value.wardName}/>
  <SearchSelect label="Tỉnh/Thành phố" placeholder="Chọn tỉnh/thành phố" options={provinces} loading={loadingP} value={value.provinceId?{id:value.provinceId,name:value.provinceName}:null} onSelect={p=>{if(p.id!==value.provinceId)onChange({...value,provinceId:p.id,provinceName:p.name,wardId:0,wardName:''});}} error={error}/>
  <SearchSelect label="Phường/Xã" placeholder={value.provinceId?'Chọn phường/xã':'Chọn tỉnh/thành trước'} options={wards} loading={loadingW} disabled={!value.provinceId} value={value.wardId?{id:value.wardId,name:value.wardName}:null} onSelect={w=>onChange({...value,wardId:w.id,wardName:w.name})}/>
  <label className="field field-wide">Số nhà, tên đường<input name="street" autoComplete="address-line1" placeholder="VD: 12 Nguyễn Trãi" required minLength={3} maxLength={200} value={value.street} onChange={e=>onChange({...value,street:e.target.value})}/></label>
 </>;
}

/** Live VTP fee for a complete address. The server answers within apiTimeoutMs (fallback included). */
export function useShippingFee(address:AddressValue,payload:{items?:{variantId:string;quantity:number}[];quoteCode?:string}|null){
 const [state,setState]=useState<FeeState>({status:'idle',fee:null,fallback:false,days:null});
 const key=payload&&addressComplete(address)?JSON.stringify([address.provinceId,address.wardId,payload]):'';
 useEffect(()=>{if(!key){setState({status:'idle',fee:null,fallback:false,days:null});return;}const controller=new AbortController();setState(s=>({...s,status:'loading'}));
  const fallback=()=>setState({status:'done',fee:shopConfig.shipping.fallbackFee,fallback:true,days:null});
  // Server already caps VTP at apiTimeoutMs; the client allows a little network slack on top.
  const timer=setTimeout(()=>{controller.abort();fallback();},shopConfig.shipping.apiTimeoutMs+3000);
  const [provinceId,wardId,body]=JSON.parse(key);
  fetch('/api/shipping/fee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provinceId,wardId,...body}),signal:controller.signal}).then(async r=>{const p=await r.json() as {fee?:number;fallback?:boolean;days?:number|null};if(!r.ok||typeof p.fee!=='number')throw new Error('fee');setState({status:'done',fee:p.fee,fallback:!!p.fallback,days:p.days??null});}).catch(e=>{if(e.name!=='AbortError')fallback();}).finally(()=>clearTimeout(timer));
  return()=>{clearTimeout(timer);controller.abort();};},[key]);
 return state;
}

export function ShippingFeeLine({state}:{state:FeeState}){
 if(state.status==='idle')return <p className="help-text shipping-fee-line">Chọn đủ tỉnh/thành, phường/xã và số nhà để tính phí ship.</p>;
 if(state.status==='loading')return <div className="shipping-fee-line" aria-busy="true" aria-label="Đang tính phí ship"><span className="skeleton skeleton-line"/><span className="skeleton skeleton-short"/></div>;
 if(state.fallback)return <p className="shipping-fee-line shipping-fee-fallback">Phí ship tạm tính {money(state.fee||0)}, shop sẽ báo lại nếu có chênh lệch</p>;
 return <p className="shipping-fee-line"><span>{state.days?`Viettel Post · dự kiến ${state.days} ngày`:'Viettel Post'}</span><strong>{money(state.fee||0)}</strong></p>;
}