import { Form, redirect, useActionData, useNavigation, type ActionFunctionArgs } from 'react-router';
import { useMemo, useState } from 'react';
import { LoaderCircle, Upload } from 'lucide-react';
import { z } from 'zod';
import { StoreLayout, Breadcrumb } from '../components/store';
import { Button } from '../components/ui/button';
import { shopConfig } from '../lib/config';
import { pageMeta } from '../lib/copy';
import { getEnv } from '../lib/db.server';
import { money } from '../lib/money';
import { validateModelFile } from '../lib/model-file';
import { calcQuote, quoteLimits } from '../lib/quote';
import { createQuote } from '../lib/quotes.server';
import { assertSameOrigin, rateLimit } from '../lib/security.server';
import { normalizePhone } from '../lib/orders.server';

const limits = quoteLimits();
const extLabel = limits.allowedExt.map(ext => ext.toUpperCase()).join(', ');
export function meta() { return pageMeta('dat-in', 'Đặt in 3D theo yêu cầu', `Gửi file ${extLabel} để ${shopConfig.shop.name} báo giá.`, '/dat-in-3d', 'http://localhost:5173'); }
export async function loader() { return null; }

export async function action({ request, context }: ActionFunctionArgs) {
  assertSameOrigin(request);
  const env = getEnv(context);
  await rateLimit(request, env, 'quote', 8);
  const form = await request.formData();
  try {
    const phone = normalizePhone(String(form.get('phone') || ''));
    const parsed = z.object({
      name: z.string().trim().min(2).max(100),
      phone: z.string().regex(/^0[35789]\d{8}$/),
      note: z.string().trim().max(500),
      materialId: z.string(),
      colorId: z.string(),
      finishId: z.string(),
      quantity: z.coerce.number().int(),
    }).parse({ name: form.get('name'), phone, note: form.get('note') || '', materialId: form.get('materialId'), colorId: form.get('colorId'), finishId: form.get('finishId'), quantity: form.get('quantity') });
    const selection = { ...parsed, designHelp: form.get('designHelp') === 'on', rush: form.get('rush') === 'on' };
    calcQuote(selection);
    const uploads = form.getAll('files').filter((item): item is File => item instanceof File && item.size > 0);
    if (uploads.length < 1 || uploads.length > limits.maxFiles) throw new Error('Số file không hợp lệ.');
    const files = [];
    for (const file of uploads) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      validateModelFile(file.name, bytes, limits);
      files.push({ filename: file.name, bytes });
    }
    const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
    const quote = await createQuote(env, selection, files, token.slice(0, 64));
    const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
    return redirect(`/bao-gia/${quote.code}`, { headers: { 'Set-Cookie': `quote_${quote.code}=${token.slice(0, 64)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secure}` } });
  } catch (error) {
    const message = error instanceof z.ZodError ? 'Vui lòng kiểm tra họ tên và số điện thoại.' : error instanceof Error ? error.message : 'Chưa gửi được yêu cầu.';
    return { error: message };
  }
}

export default function CustomPrint() {
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const [materialId, setMaterialId] = useState(shopConfig.customPrint.materials[0].id);
  const [colorId, setColorId] = useState(limits.colors[0].id);
  const [finishId, setFinishId] = useState(shopConfig.customPrint.finishes[0].id);
  const [quantity, setQuantity] = useState(1);
  const [designHelp, setDesignHelp] = useState(false);
  const [rush, setRush] = useState(false);
  const estimate = useMemo(() => { try { return calcQuote({ materialId, colorId, finishId, quantity, designHelp, rush }); } catch { return null; } }, [materialId, colorId, finishId, quantity, designHelp, rush]);
  const busy = navigation.state === 'submitting';
  return <StoreLayout><Breadcrumb items={[{ label: 'Đặt in 3D' }]}/><Form id="print-form" method="post" encType="multipart/form-data"><div className="two-column"><div><section className="panel form-section"><h2><Upload size={20}/> File thiết kế</h2><p className="help-text">{extLabel}. Tối đa {limits.maxFiles} file, mỗi file {limits.maxFileMB} MB. Ảnh minh họa bên dưới không phải sản phẩm của bạn.</p><input name="files" type="file" accept={limits.allowedExt.map(ext => `.${ext}`).join(',')} multiple required/><div className="print-placeholder" aria-hidden="true">Ảnh minh họa — chưa có ảnh mẫu in theo yêu cầu</div></section><section className="panel form-section"><h2>Thông tin người đặt</h2><div className="form-grid"><label className="field">Họ và tên<input name="name" required minLength={2} maxLength={100}/></label><label className="field">Số điện thoại<input name="phone" required inputMode="tel"/></label><label className="field field-wide">Ghi chú<input name="note" maxLength={500}/></label></div></section><section className="panel form-section"><h2>Lựa chọn in</h2><div className="choice-list">{shopConfig.customPrint.materials.map(item => <label key={item.id} className={materialId === item.id ? 'choice selected' : 'choice'}><input type="radio" name="materialId" value={item.id} checked={materialId === item.id} onChange={() => setMaterialId(item.id)}/><span><strong>{item.name}</strong><small>{item.leadTime} · giá cơ bản {money(item.basePrice)}</small></span></label>)}</div><div className="variant-group"><strong>Màu <span>{limits.colors.find(item => item.id === colorId)?.name}</span></strong><div className="swatches">{limits.colors.map(color => <button type="button" key={color.id} className={colorId === color.id ? 'swatch selected' : 'swatch'} aria-label={color.name} aria-pressed={colorId === color.id} onClick={() => setColorId(color.id)}><span style={{ background: color.hex }}>{color.name.slice(0, 1)}</span></button>)}</div><input type="hidden" name="colorId" value={colorId}/></div><label className="field" style={{ marginTop: 16 }}>Hoàn thiện<select name="finishId" value={finishId} onChange={event => setFinishId(event.target.value)}>{shopConfig.customPrint.finishes.map(item => <option key={item.id} value={item.id}>{item.name} · {money(item.fee)}</option>)}</select></label><div className="quantity-row"><strong>Số lượng</strong><div className="quantity"><button type="button" aria-label="Giảm số lượng" onClick={() => setQuantity(value => Math.max(1, value - 1))}>−</button><input name="quantity" inputMode="numeric" value={quantity} onChange={event => setQuantity(Math.max(1, Math.min(limits.maxQty, Number(event.target.value) || 1)))}/><button type="button" aria-label="Tăng số lượng" onClick={() => setQuantity(value => Math.min(limits.maxQty, value + 1))}>+</button></div></div><label className="check-row"><input type="checkbox" name="designHelp" checked={designHelp} onChange={event => setDesignHelp(event.target.checked)}/> Nhờ cửa hàng hỗ trợ thiết kế ({money(shopConfig.customPrint.designFee)})</label><label className="check-row"><input type="checkbox" name="rush" checked={rush} onChange={event => setRush(event.target.checked)}/> Làm gấp (phụ phí theo cấu hình)</label></section></div><aside className="summary-panel panel"><h2>Ước tính</h2><p className="help-text">Tính bằng công thức trong cấu hình. Cửa hàng sẽ chốt trước khi bạn cọc. Các số tiền đang là placeholder.</p>{estimate && <div className="price-summary"><div><span>Giá cơ bản</span><strong>{money(estimate.variables.basePrice)}</strong></div><div><span>Phí vật liệu</span><strong>{money(estimate.variables.materialFee * estimate.variables.quantity)}</strong></div><div><span>Hoàn thiện</span><strong>{money(estimate.variables.finishFee)}</strong></div><div><span>Thiết kế</span><strong>{money(estimate.variables.designFee * estimate.variables.designHelp)}</strong></div><div className="summary-total"><span>Ước tính</span><strong>{money(estimate.amount)}</strong></div></div>}{result?.error && <p className="error-message" role="alert">{result.error}</p>}<Button type="submit" className="full-width" disabled={busy}>{busy && <LoaderCircle className="spin" size={16}/>} Gửi yêu cầu báo giá</Button></aside></div><div className="sticky-action checkout-sticky"><div><strong>{estimate ? money(estimate.amount) : 'Ước tính'}</strong><small>Chưa phải giá chốt</small></div><Button type="submit" disabled={busy}>Gửi yêu cầu</Button></div></Form></StoreLayout>;
}
