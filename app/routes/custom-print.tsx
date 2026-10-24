import { Form, redirect, useActionData, useNavigation, type ActionFunctionArgs } from 'react-router';
import { useState } from 'react';
import { LoaderCircle, Upload } from 'lucide-react';
import { z } from 'zod';
import { StoreLayout, Breadcrumb } from '../components/store';
import { Button } from '../components/ui/button';
import { shopConfig } from '../lib/config';
import { pageMeta, renderTokens } from '../lib/copy';
import { getEnv } from '../lib/db.server';
import { money } from '../lib/money';
import { validateModelFile } from '../lib/model-file';
import { materialIds, postProcessLabels, quoteLimits, uploadHint } from '../lib/quote';
import { createQuote } from '../lib/quotes.server';
import { assertSameOrigin, rateLimit } from '../lib/security.server';
import { normalizePhone } from '../lib/orders.server';

const limits = quoteLimits();
const materials = materialIds();

export function meta() {
  return pageMeta('dat-in', 'In 3D theo yêu cầu', uploadHint(), '/dat-in', 'http://localhost:5173');
}
export async function loader() { return null; }

export async function action({ request, context }: ActionFunctionArgs) {
  assertSameOrigin(request);
  const env = getEnv(context);
  await rateLimit(request, env, 'quote', 8);
  const form = await request.formData();
  try {
    if (form.get('rights') !== 'on' || form.get('banned') !== 'on') throw new Error('Bạn cần đánh dấu hai cam kết trước khi gửi.');
    const phone = normalizePhone(String(form.get('phone') || ''));
    const parsed = z.object({
      project: z.string().trim().min(2).max(120),
      name: z.string().trim().min(2).max(100),
      phone: z.string().regex(/^0[35789]\d{8}$/),
      email: z.string().trim().max(120),
      note: z.string().trim().max(2000),
      materialId: z.string(),
      colorName: z.string(),
      postProcess: z.string(),
      quantity: z.coerce.number().int(),
    }).parse({
      project: form.get('project'), name: form.get('name'), phone, email: form.get('email') || '', note: form.get('note') || '',
      materialId: form.get('materialId'), colorName: form.get('colorName'), postProcess: form.get('postProcess'), quantity: form.get('quantity'),
    });
    if (parsed.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.email)) throw new Error('Email chưa đúng định dạng.');
    const uploads = form.getAll('files').filter((item): item is File => item instanceof File && item.size > 0);
    if (uploads.length < 1 || uploads.length > limits.maxFiles) throw new Error(`Tối đa ${limits.maxFiles} file.`);
    const files = [];
    for (const file of uploads) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      validateModelFile(file.name, bytes, limits);
      files.push({ filename: file.name, bytes });
    }
    const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
    const quote = await createQuote(env, parsed, files, token.slice(0, 64));
    const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
    return redirect(`/bao-gia/${quote.code}`, { headers: { 'Set-Cookie': `quote_${quote.code}=${token.slice(0, 64)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secure}` } });
  } catch (error) {
    const message = error instanceof z.ZodError ? 'Vui lòng kiểm tra họ tên, tên sản phẩm và số điện thoại.' : error instanceof Error ? error.message : 'Chưa gửi được yêu cầu.';
    return { error: message };
  }
}

export default function CustomPrint() {
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const [colorName, setColorName] = useState(limits.colors[0].name);
  const [quantity, setQuantity] = useState(1);
  const busy = navigation.state === 'submitting';
  const hours = shopConfig.customPrint.quoteValidHours;
  return <StoreLayout>
    <Breadcrumb items={[{ label: 'Đặt in' }]}/>
    <h1>In 3D theo yêu cầu</h1>
    <p className="help-text">{renderTokens('Gửi file, chọn nhựa và màu. Shop kiểm tra file rồi gửi báo giá chính thức. Báo giá có hiệu lực {config.customPrint.quoteValidHours} giờ sau khi gửi. Giá tạm tính chỉ hiện khi shop đã đo khối lượng và thời gian in.')}</p>
    <Form method="post" encType="multipart/form-data">
      <div className="two-column">
        <div>
          <section className="panel form-section">
            <h2>1. Thông tin yêu cầu</h2>
            <div className="form-grid">
              <label className="field field-wide">Tên sản phẩm/dự án<input name="project" required minLength={2} maxLength={120}/></label>
              <label className="field">Họ và tên<input name="name" required minLength={2} maxLength={100}/></label>
              <label className="field">Số điện thoại<input name="phone" required inputMode="tel"/></label>
              <label className="field">Email (không bắt buộc)<input name="email" type="email" maxLength={120}/></label>
              <label className="field field-wide">Mô tả<textarea name="note" maxLength={2000} rows={4}/></label>
            </div>
          </section>
          <section className="panel form-section">
            <h2><Upload size={20}/> 2. File và thông số</h2>
            <p className="help-text">{uploadHint()} Ảnh minh họa bên dưới không phải sản phẩm của bạn.</p>
            <input name="files" type="file" accept={limits.allowedExt.map(ext => `.${ext}`).join(',')} multiple required/>
            <div className="print-placeholder" aria-hidden="true">Ảnh minh họa — chưa có ảnh mẫu in theo yêu cầu</div>
            <label className="field">Chất liệu
              <select name="materialId" defaultValue={materials[0]}>{materials.map(id => <option key={id} value={id}>{id} · {money(shopConfig.customPrint.materials[id].pricePerGram)}/g</option>)}</select>
            </label>
            <div className="variant-group"><strong>Màu <span>{colorName}</span></strong>
              <div className="swatches">{limits.colors.map(color => <button type="button" key={color.name} className={colorName === color.name ? 'swatch selected' : 'swatch'} aria-label={color.name} aria-pressed={colorName === color.name} onClick={() => setColorName(color.name)}><span style={{ background: color.hex }}>{color.name.slice(0, 1)}</span></button>)}</div>
              <input type="hidden" name="colorName" value={colorName}/>
            </div>
            <div className="quantity-row"><strong>Số lượng</strong><div className="quantity"><button type="button" aria-label="Giảm số lượng" onClick={() => setQuantity(value => Math.max(1, value - 1))}>−</button><input name="quantity" inputMode="numeric" value={quantity} onChange={event => setQuantity(Math.max(1, Math.min(limits.maxQty, Number(event.target.value) || 1)))}/><button type="button" aria-label="Tăng số lượng" onClick={() => setQuantity(value => Math.min(limits.maxQty, value + 1))}>+</button></div></div>
            <fieldset className="choice-list"><legend>Hậu kỳ</legend>{Object.entries(shopConfig.customPrint.postProcessFee).map(([id, fee]) => <label key={id} className="choice"><input type="radio" name="postProcess" value={id} defaultChecked={id === 'none'}/><span><strong>{postProcessLabels[id] || id}</strong><small>{money(fee)}</small></span></label>)}</fieldset>
          </section>
          <section className="panel form-section">
            <h2>3. Báo giá</h2>
            <ol>
              <li>Duyệt thiết kế</li>
              <li>Xác nhận giá và thời gian</li>
              <li>Đặt cọc 50%</li>
              <li>In và giao Viettel Post</li>
            </ol>
            <p className="notice">Admin sẽ báo giá sau khi đo file. Báo giá có hiệu lực {hours} giờ kể từ lúc gửi.</p>
            <label className="check-row"><input type="checkbox" name="rights"/> Tôi cam kết có quyền sử dụng file này để in và file không vi phạm quyền sở hữu trí tuệ của người khác.</label>
            <label className="check-row"><input type="checkbox" name="banned"/> Tôi xác nhận file không phải vũ khí, đồ giả mạo, hoặc vật phẩm trái pháp luật.</label>
            {result?.error && <p className="error-message" role="alert">{result.error}</p>}
          </section>
        </div>
        <aside className="summary-panel panel">
          <h2>Gửi yêu cầu</h2>
          <p className="help-text">Đơn tối thiểu {money(shopConfig.customPrint.minOrder)}. Giá trên trang này không phải giá cuối.</p>
          <Button type="submit" className="full-width" disabled={busy}>{busy && <LoaderCircle className="spin" size={16}/>} Gửi yêu cầu báo giá</Button>
        </aside>
      </div>
      <div className="sticky-action checkout-sticky"><div><strong>Chưa có giá tạm</strong><small>Shop đo file rồi báo giá</small></div><Button type="submit" disabled={busy}>Gửi yêu cầu</Button></div>
    </Form>
  </StoreLayout>;
}
