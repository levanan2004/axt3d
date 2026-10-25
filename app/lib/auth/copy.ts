// Customer-account copy (Nhất) and the time constants it quotes. Client-safe: no secrets here.
import {shopConfig} from '../config';
export const RESET_MINUTES=30;          // reset + create-password links
export const VERIFY_HOURS=24;           // email verification links
export const SESSION_DAYS=30;
export const RESEND_SECONDS=60;
export const PASSWORD_MIN=8;
export const TEN_SHOP=shopConfig.shop.name;
const fill=(s:string,v:Record<string,string|number>)=>s.replace(/\{(\w+)\}/g,(m,k)=>k in v?String(v[k]):m);
export const authCopy={
 google:'Tiếp tục với Google',
 or:'hoặc',
 login:{title:'Đăng nhập',button:'Đăng nhập',forgot:'Quên mật khẩu?',noAccount:'Chưa có tài khoản?',create:'Tạo tài khoản',
  wrong:'Email hoặc mật khẩu chưa đúng.',locked:(phut:number)=>fill('Bạn nhập sai nhiều lần quá. Thử lại sau {phut} phút nhé.',{phut}),
  unverified:'Bạn cần xác nhận email trước khi đăng nhập. Kiểm tra hộp thư (cả mục Spam) nhé.',
  googleLinkBlocked:'Email này đã có tài khoản chưa xác nhận. Bạn dùng "Quên mật khẩu?" để lấy lại tài khoản, rồi đăng nhập bằng Google lại nhé.',
  googleFailed:'Chưa đăng nhập được bằng Google. Bạn thử lại nhé.'},
 signup:{title:'Tạo tài khoản',name:'Họ tên',email:'Email',password:'Mật khẩu',confirm:'Nhập lại',button:'Tạo tài khoản',hint:`Ít nhất ${PASSWORD_MIN} ký tự.`,
  mismatch:'Hai mật khẩu chưa khớp.',haveAccount:'Đã có tài khoản?',
  terms:{before:'Khi tạo tài khoản, bạn đồng ý với ',terms:'Điều khoản',and:' và ',privacy:'Chính sách bảo mật',after:` của ${TEN_SHOP}.`},
  checkEmail:(email:string)=>fill('Kiểm tra email nhé! Chúng tôi vừa gửi thư tới {email}.',{email}),
  resend:'Gửi lại',resendIn:(s:number)=>`Gửi lại (${s}s)`,changeEmail:'Đổi email',
  checks:{length:`Ít nhất ${PASSWORD_MIN} ký tự`,mixed:'Có cả chữ và số',strong:'Từ 12 ký tự hoặc có ký tự đặc biệt'}},
 forgot:{title:'Quên mật khẩu',sub:'Nhập email bạn đã đăng ký, chúng tôi gửi link đặt lại mật khẩu.',button:'Gửi link',
  after:'Nếu email này có tài khoản, link đặt lại mật khẩu sẽ tới trong vài phút. Nhớ xem cả mục Spam nhé.'},
 reset:{title:'Đặt mật khẩu mới',password:'Mật khẩu mới',confirm:'Nhập lại',button:'Lưu mật khẩu',success:'Đã đổi mật khẩu. Bạn đăng nhập lại nhé.',
  expired:'Link này đã hết hạn hoặc đã dùng rồi. Bạn yêu cầu link mới nhé.',newLink:'Gửi link mới'},
 verify:{ok:'Đã xác nhận email. Bạn đăng nhập nhé.',expired:'Link này đã hết hạn hoặc đã dùng rồi. Bạn yêu cầu link mới nhé.'},
 change:{current:'Mật khẩu hiện tại',password:'Mật khẩu mới',confirm:'Nhập lại',button:'Đổi mật khẩu',success:'Đã đổi mật khẩu.',wrongCurrent:'Mật khẩu hiện tại chưa đúng.'},
 create:{button:'Tạo mật khẩu',explain:(email:string)=>fill('Để bảo vệ tài khoản, chúng tôi gửi link tạo mật khẩu tới {email}.',{email}),send:'Gửi link',
  sent:(email:string)=>`Đã gửi link tới ${email}. Link dùng được trong ${RESET_MINUTES} phút.`},
 del:{open:'Xoá tài khoản',title:'Xoá tài khoản?',body:'Tài khoản và các địa chỉ đã lưu sẽ bị xoá vĩnh viễn. Các đơn đã đặt vẫn được giữ để đối soát.',cancel:'Huỷ',confirm:'Xoá tài khoản'},
 account:{tabs:{orders:'Đơn hàng',addresses:'Địa chỉ',security:'Bảo mật'},logout:'Đăng xuất',
  empty:'Bạn chưa có đơn nào. Ghé xem các mẫu in 3D của shop nhé!',browse:'Xem sản phẩm',defaultBadge:'Mặc định',addAddress:'+ Thêm địa chỉ'},
 checkoutStrip:{text:'Đã có tài khoản?',link:'Đăng nhập để điền nhanh'},
 tooFast:'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
 turnstile:'Chưa xác minh được bạn không phải robot. Bạn thử lại nhé.',
};
export const emailCopy={
 verify:{subject:fill('Xác nhận email của bạn tại {TEN_SHOP}',{TEN_SHOP}),
  body:(ten:string)=>fill('Chào {ten}, cảm ơn bạn đã tạo tài khoản. Bấm nút dưới đây để xác nhận email (link dùng được trong {gio} giờ).',{ten,gio:VERIFY_HOURS}),
  button:'Xác nhận email',after:'Nếu bạn không tạo tài khoản này, cứ bỏ qua email này nhé.'},
 reset:{subject:fill('Đặt lại mật khẩu {TEN_SHOP}',{TEN_SHOP}),
  body:(ten:string)=>fill('Chào {ten}, có người vừa yêu cầu đặt lại mật khẩu cho tài khoản này. Bấm nút dưới đây để đặt mật khẩu mới (link dùng được trong {phut} phút và chỉ dùng một lần).',{ten,phut:RESET_MINUTES}),
  button:'Đặt lại mật khẩu',after:'Nếu bạn không yêu cầu, cứ bỏ qua email này, mật khẩu cũ vẫn giữ nguyên.'},
 existing:{subject:fill('Bạn đã có tài khoản tại {TEN_SHOP}',{TEN_SHOP}),
  body:()=> 'Chào bạn, vừa có người dùng email này để tạo tài khoản mới, nhưng email này đã có tài khoản rồi. Bạn đăng nhập bằng mật khẩu hoặc bằng Google như mọi khi. Quên mật khẩu thì bấm nút dưới đây.',
  button:'Đặt lại mật khẩu',after:'Nếu không phải bạn, cứ bỏ qua email này, tài khoản của bạn vẫn an toàn.'},
 create:{subject:fill('Tạo mật khẩu cho tài khoản {TEN_SHOP}',{TEN_SHOP}),
  body:(ten:string)=>fill('Chào {ten}, bấm nút dưới đây để tạo mật khẩu, sau đó bạn đăng nhập được bằng cả Google lẫn email (link dùng được trong {phut} phút và chỉ dùng một lần).',{ten,phut:RESET_MINUTES}),
  button:'Tạo mật khẩu',after:'Nếu bạn không yêu cầu, cứ bỏ qua email này.'},
 footer:fill('{TEN_SHOP} · Cần hỗ trợ, bạn nhắn Zalo cho shop.',{TEN_SHOP}),
};
export function passwordStrength(p:string){const checks={length:p.length>=PASSWORD_MIN,mixed:/[a-zA-Z\u00C0-\u1EF9]/.test(p)&&/\d/.test(p),strong:p.length>=12||/[^a-zA-Z0-9\s]/.test(p)};
 const level=!p?0:!checks.length?1:(checks.mixed&&checks.strong)?3:checks.mixed||checks.strong?2:1;return {checks,level};}
