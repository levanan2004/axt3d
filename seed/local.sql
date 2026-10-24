-- Generated from config/shop-config.json and docs/content/mo_ta_san_pham_mau.md. Inserts skip existing rows. Names and descriptions are refreshed. Robot is not seeded.
INSERT OR IGNORE INTO products(id,slug,name,category,description,image,images,badge,created_at,updated_at) VALUES('dragon','rong-khop-dong','Rồng khớp động','mo-hinh-3d','Rồng in 3D liền khối có khớp động, uốn lượn được. Nhựa PLA nhẹ, nhiều màu và nhiều cỡ. Để bàn hoặc làm quà.

Con rồng được in liền một lần, các đốt thân nối với nhau ngay trong lúc in. Lấy ra là cử động được, không cần lắp hay dán.

Thân uốn sang hai bên, cầm lên lắc nhẹ là chuyển động như đang bơi. Hợp để trên bàn học, kệ sách, hoặc làm quà cho người thích đồ fantasy. Mẫu do shop tự thiết kế, không phải nhân vật có bản quyền.

Lưu ý: có chi tiết nhỏ, không phù hợp với trẻ dưới 3 tuổi. Đừng bẻ khớp quá góc cho phép. Vân lớp in mỏng trên bề mặt là đặc trưng của in 3D.','/images/dragon.webp','["/images/dragon.webp","/images/dragon-detail.webp"]','Yêu thích',1792861349575,1792861349575);
UPDATE products SET name='Rồng khớp động', description='Rồng in 3D liền khối có khớp động, uốn lượn được. Nhựa PLA nhẹ, nhiều màu và nhiều cỡ. Để bàn hoặc làm quà.

Con rồng được in liền một lần, các đốt thân nối với nhau ngay trong lúc in. Lấy ra là cử động được, không cần lắp hay dán.

Thân uốn sang hai bên, cầm lên lắc nhẹ là chuyển động như đang bơi. Hợp để trên bàn học, kệ sách, hoặc làm quà cho người thích đồ fantasy. Mẫu do shop tự thiết kế, không phải nhân vật có bản quyền.

Lưu ý: có chi tiết nhỏ, không phù hợp với trẻ dưới 3 tuổi. Đừng bẻ khớp quá góc cho phép. Vân lớp in mỏng trên bề mặt là đặc trưng của in 3D.' WHERE id='dragon';
INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('dragon-1','dragon','DRAGON-1','Cam đất','#d86b38','PLA',89000,24);
INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('dragon-2','dragon','DRAGON-2','Kem','#e5d6bc','PLA',89000,24);
INSERT OR IGNORE INTO products(id,slug,name,category,description,image,images,badge,created_at,updated_at) VALUES('stand','gia-do-dien-thoai','Giá đỡ điện thoại hình mèo','phu-kien','Giá đỡ điện thoại in 3D hình mèo ngồi, đứng chắc, có rãnh luồn dây sạc. Dùng khi xem video hoặc gọi video.

Giá đỡ tạo dáng một chú mèo ngồi, lưng mèo là chỗ tựa máy với góc nghiêng cố định, dễ nhìn màn hình khi ngồi bàn. Rãnh phía dưới cho dây sạc đi qua, vừa sạc vừa dùng được.

Hợp với phần lớn điện thoại, kể cả khi có ốp. Kiểm tra độ dày máy và ốp với số đo khe đỡ ở thông số trước khi mua. Mẫu mèo do shop tự thiết kế, không phải nhân vật có bản quyền.

Bản PETG chịu nhiệt tốt hơn, nên chọn nếu để gần cửa sổ nắng.','/images/stand.webp','["/images/stand.webp","/images/stand-detail.webp"]','',1792861349575,1792861349575);
UPDATE products SET name='Giá đỡ điện thoại hình mèo', description='Giá đỡ điện thoại in 3D hình mèo ngồi, đứng chắc, có rãnh luồn dây sạc. Dùng khi xem video hoặc gọi video.

Giá đỡ tạo dáng một chú mèo ngồi, lưng mèo là chỗ tựa máy với góc nghiêng cố định, dễ nhìn màn hình khi ngồi bàn. Rãnh phía dưới cho dây sạc đi qua, vừa sạc vừa dùng được.

Hợp với phần lớn điện thoại, kể cả khi có ốp. Kiểm tra độ dày máy và ốp với số đo khe đỡ ở thông số trước khi mua. Mẫu mèo do shop tự thiết kế, không phải nhân vật có bản quyền.

Bản PETG chịu nhiệt tốt hơn, nên chọn nếu để gần cửa sổ nắng.' WHERE id='stand';
INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('stand-1','stand','STAND-1','Xanh navy','#223c4b','PETG',59000,30);
INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('stand-2','stand','STAND-2','Kem','#e5d6bc','PETG',59000,30);
INSERT OR IGNORE INTO products(id,slug,name,category,description,image,images,badge,created_at,updated_at) VALUES('planter','chau-cay-duong-van','Chậu cây mini hình mèo','do-trang-tri','Chậu cây mini in 3D hình mèo cho sen đá, xương rồng. Có lỗ thoát nước và đĩa lót.

Chậu nhỏ gọn dáng đầu mèo có tai, hợp với cây để bàn. Đáy có lỗ thoát nước, đĩa lót đi kèm để không đọng nước ra bàn.

Nhựa nhẹ, không vỡ khi rơi như sứ. Màu chọn ở trang sản phẩm. Mẫu do shop tự thiết kế.

Nên để trong nhà hoặc nơi có mái che. Nắng gắt lâu ngày có thể làm bạc màu, nhất là với PLA.','/images/planter.webp','["/images/planter.webp","/images/planter-detail.webp"]','Mới',1792861349575,1792861349575);
UPDATE products SET name='Chậu cây mini hình mèo', description='Chậu cây mini in 3D hình mèo cho sen đá, xương rồng. Có lỗ thoát nước và đĩa lót.

Chậu nhỏ gọn dáng đầu mèo có tai, hợp với cây để bàn. Đáy có lỗ thoát nước, đĩa lót đi kèm để không đọng nước ra bàn.

Nhựa nhẹ, không vỡ khi rơi như sứ. Màu chọn ở trang sản phẩm. Mẫu do shop tự thiết kế.

Nên để trong nhà hoặc nơi có mái che. Nắng gắt lâu ngày có thể làm bạc màu, nhất là với PLA.' WHERE id='planter';
INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('planter-1','planter','PLANTER-1','Xanh lá','#71826a','PLA',79000,18);
INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('planter-2','planter','PLANTER-2','Kem','#e5d6bc','PLA',79000,18);
INSERT OR IGNORE INTO products(id,slug,name,category,description,image,images,badge,created_at,updated_at) VALUES('lamp','den-nam-nho','Đèn ngủ','do-trang-tri','Đèn ngủ in 3D chao xoắn, ánh sáng dịu. Dùng bóng LED, cấp nguồn qua cổng USB.

Chao đèn in mỏng dạng xoắn, ánh đèn đi qua tạo các vệt sáng mềm trên tường. Hợp để đầu giường hoặc góc làm việc buổi tối.

Đèn dùng bóng LED ít tỏa nhiệt. Thông tin cổng cấp nguồn, công tắc và màu ánh sáng ghi ở thông số.

Không dùng bóng sợi đốt hay bóng tỏa nhiệt cao thay thế. Để xa nơi ẩm ướt.','/images/lamp.webp','["/images/lamp.webp","/images/lamp-detail.webp"]','Mới',1792861349575,1792861349575);
UPDATE products SET name='Đèn ngủ', description='Đèn ngủ in 3D chao xoắn, ánh sáng dịu. Dùng bóng LED, cấp nguồn qua cổng USB.

Chao đèn in mỏng dạng xoắn, ánh đèn đi qua tạo các vệt sáng mềm trên tường. Hợp để đầu giường hoặc góc làm việc buổi tối.

Đèn dùng bóng LED ít tỏa nhiệt. Thông tin cổng cấp nguồn, công tắc và màu ánh sáng ghi ở thông số.

Không dùng bóng sợi đốt hay bóng tỏa nhiệt cao thay thế. Để xa nơi ẩm ướt.' WHERE id='lamp';
INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('lamp-1','lamp','LAMP-1','Cam đất','#d86b38','PLA',149000,12);
INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('lamp-2','lamp','LAMP-2','Kem','#e5d6bc','PLA',149000,12);
INSERT OR IGNORE INTO products(id,slug,name,category,description,image,images,badge,created_at,updated_at) VALUES('vase','binh-hoa-xoan','Bình hoa trang trí','do-trang-tri','Bình hoa/lọ trang trí in 3D dáng xoắn, cắm hoa khô hoặc để trơn làm decor kệ, bàn.

Thân bình in thành các gờ xoắn, bắt sáng đẹp khi đặt gần cửa sổ hay đèn bàn. Hợp cắm hoa khô, cành lá giả hoặc để trơn trang trí.

Muốn cắm hoa tươi, hãy đặt một ống/lọ thủy tinh nhỏ đựng nước bên trong. Bình in 3D không đảm bảo kín nước tuyệt đối.

Không đựng nước nóng. Lau bằng khăn ẩm. Vân lớp in mỏng là đặc trưng của in 3D.','/images/vase.webp','["/images/vase.webp","/images/vase-detail.webp"]','',1792861349575,1792861349575);
UPDATE products SET name='Bình hoa trang trí', description='Bình hoa/lọ trang trí in 3D dáng xoắn, cắm hoa khô hoặc để trơn làm decor kệ, bàn.

Thân bình in thành các gờ xoắn, bắt sáng đẹp khi đặt gần cửa sổ hay đèn bàn. Hợp cắm hoa khô, cành lá giả hoặc để trơn trang trí.

Muốn cắm hoa tươi, hãy đặt một ống/lọ thủy tinh nhỏ đựng nước bên trong. Bình in 3D không đảm bảo kín nước tuyệt đối.

Không đựng nước nóng. Lau bằng khăn ẩm. Vân lớp in mỏng là đặc trưng của in 3D.' WHERE id='vase';
INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('vase-1','vase','VASE-1','Kem','#e5d6bc','PLA',129000,15);
INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('vase-2','vase','VASE-2','Kem','#e5d6bc','PLA',129000,15);
INSERT OR IGNORE INTO products(id,slug,name,category,description,image,images,badge,created_at,updated_at) VALUES('tray','khay-de-do-hinh-may','Khay đựng đồ nhỏ','do-gia-dung','Khay in 3D đựng đồ nhỏ: chìa khóa, trang sức, kẹp giấy. Đáy phẳng, viền thấp, dễ lấy đồ.

Khay gom các món hay để lung tung trên bàn, kệ đầu giường hoặc cạnh cửa ra vào. Viền thấp để lấy đồ nhanh, đáy phẳng không trượt.

Chọn bản một ngăn hoặc chia ngăn ở trang sản phẩm.

Không dùng đựng thức ăn. Lau bằng khăn ẩm, không ngâm nước nóng.','/images/tray.webp','["/images/tray.webp","/images/tray-detail.webp"]','',1792861349575,1792861349575);
UPDATE products SET name='Khay đựng đồ nhỏ', description='Khay in 3D đựng đồ nhỏ: chìa khóa, trang sức, kẹp giấy. Đáy phẳng, viền thấp, dễ lấy đồ.

Khay gom các món hay để lung tung trên bàn, kệ đầu giường hoặc cạnh cửa ra vào. Viền thấp để lấy đồ nhanh, đáy phẳng không trượt.

Chọn bản một ngăn hoặc chia ngăn ở trang sản phẩm.

Không dùng đựng thức ăn. Lau bằng khăn ẩm, không ngâm nước nóng.' WHERE id='tray';
INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('tray-1','tray','TRAY-1','Kem','#e5d6bc','PETG',69000,25);
INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('tray-2','tray','TRAY-2','Kem','#e5d6bc','PETG',69000,25);
INSERT OR IGNORE INTO products(id,slug,name,category,description,image,images,badge,created_at,updated_at) VALUES('dino','khung-long-chibi','Mô hình khủng long','mo-hinh-3d','Mô hình khủng long in 3D do shop tự thiết kế, dáng tròn trịa dễ thương. Để bàn, kệ sách hoặc làm quà.

Chú khủng long đứng hai chân, đuôi dài cân bằng thân, đặt chắc trên mặt phẳng. Có thể phối thân và gai lưng hai màu.

Mẫu là thiết kế gốc của shop, không mô phỏng khủng long hay nhân vật của phim, truyện, game nào. Hợp với bàn học, góc làm việc, hoặc làm quà cho người thích khủng long.

Lưu ý: có chi tiết nhỏ, không phù hợp với trẻ dưới 3 tuổi. Vân lớp in mỏng trên bề mặt là đặc trưng của in 3D.','/images/dino.webp','["/images/dino.webp","/images/dino-detail.webp"]','',1792861349575,1792861349575);
UPDATE products SET name='Mô hình khủng long', description='Mô hình khủng long in 3D do shop tự thiết kế, dáng tròn trịa dễ thương. Để bàn, kệ sách hoặc làm quà.

Chú khủng long đứng hai chân, đuôi dài cân bằng thân, đặt chắc trên mặt phẳng. Có thể phối thân và gai lưng hai màu.

Mẫu là thiết kế gốc của shop, không mô phỏng khủng long hay nhân vật của phim, truyện, game nào. Hợp với bàn học, góc làm việc, hoặc làm quà cho người thích khủng long.

Lưu ý: có chi tiết nhỏ, không phù hợp với trẻ dưới 3 tuổi. Vân lớp in mỏng trên bề mặt là đặc trưng của in 3D.' WHERE id='dino';
INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('dino-1','dino','DINO-1','Xanh lá','#71826a','PLA',89000,16);
INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('dino-2','dino','DINO-2','Kem','#e5d6bc','PLA',89000,16);
INSERT OR IGNORE INTO products(id,slug,name,category,description,image,images,badge,created_at,updated_at) VALUES('keyring','moc-khoa-hinh-hoa','Móc khóa hình corgi','qua-tang','Móc khóa in 3D hình chú chó corgi, nhẹ, màu tươi. Có thể thêm tên ngắn ở thân. Kèm khoen kim loại.

Chú corgi được in nổi, phối màu lông và màu nền theo lựa chọn. Dùng gắn chìa khóa, balo, hoặc làm quà cho người mê chó.

Nếu chọn bản có tên, bạn nhập tên hoặc chữ ngắn khi đặt hàng, shop in chữ nổi trên thân corgi. Hãy kiểm tra kỹ chính tả và dấu; chữ đã in xong thì không đổi được. Số ký tự tối đa hiện ở ô nhập.

Có chi tiết nhỏ, không phù hợp với trẻ dưới 3 tuổi.','/images/keyring.webp','["/images/keyring.webp","/images/keyring-detail.webp"]','',1792861349575,1792861349575);
UPDATE products SET name='Móc khóa hình corgi', description='Móc khóa in 3D hình chú chó corgi, nhẹ, màu tươi. Có thể thêm tên ngắn ở thân. Kèm khoen kim loại.

Chú corgi được in nổi, phối màu lông và màu nền theo lựa chọn. Dùng gắn chìa khóa, balo, hoặc làm quà cho người mê chó.

Nếu chọn bản có tên, bạn nhập tên hoặc chữ ngắn khi đặt hàng, shop in chữ nổi trên thân corgi. Hãy kiểm tra kỹ chính tả và dấu; chữ đã in xong thì không đổi được. Số ký tự tối đa hiện ở ô nhập.

Có chi tiết nhỏ, không phù hợp với trẻ dưới 3 tuổi.' WHERE id='keyring';
INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('keyring-1','keyring','KEYRING-1','Cam đất','#d86b38','PLA',39000,40);
INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('keyring-2','keyring','KEYRING-2','Kem','#e5d6bc','PLA',39000,40);
INSERT OR IGNORE INTO products(id,slug,name,category,description,image,images,badge,created_at,updated_at) VALUES('organizer','hop-but-to-ong','Hộp đựng bút','phu-kien','Hộp đựng bút in 3D chia ngăn, giữ bút, thước, kéo đứng gọn trên bàn.

Hộp có nhiều ngăn cao thấp khác nhau. Đồ dài để ngăn sau, đồ ngắn để ngăn trước, nhìn là thấy.

Đáy dày và rộng để hộp không lật khi rút bút. Có bản in tên ở mặt trước nếu bạn chọn.

Lau bằng khăn ẩm. Không ngâm nước nóng.','/images/organizer.webp','["/images/organizer.webp","/images/organizer-detail.webp"]','',1792861349575,1792861349575);
UPDATE products SET name='Hộp đựng bút', description='Hộp đựng bút in 3D chia ngăn, giữ bút, thước, kéo đứng gọn trên bàn.

Hộp có nhiều ngăn cao thấp khác nhau. Đồ dài để ngăn sau, đồ ngắn để ngăn trước, nhìn là thấy.

Đáy dày và rộng để hộp không lật khi rút bút. Có bản in tên ở mặt trước nếu bạn chọn.

Lau bằng khăn ẩm. Không ngâm nước nóng.' WHERE id='organizer';
INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('organizer-1','organizer','ORGANIZER-1','Xanh navy','#223c4b','PLA',99000,22);
INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('organizer-2','organizer','ORGANIZER-2','Kem','#e5d6bc','PLA',99000,22);
INSERT OR IGNORE INTO products(id,slug,name,category,description,image,images,badge,created_at,updated_at) VALUES('robot','robot','Mô hình robot','mo-hinh-3d','Mô hình robot in 3D do shop tự thiết kế, dáng vuông vức, tay xoay được. Để bàn, kệ sách hoặc làm quà.

Chú robot thân hộp, đầu tròn với một mắt cảm biến, ăng-ten ngắn trên đỉnh. Tay gắn khớp xoay để đổi tư thế chào, cầm đồ nhỏ hoặc giơ cao.

Mẫu là thiết kế gốc của shop, không mô phỏng robot hay nhân vật của phim, truyện, game nào. Hợp với bàn học, góc làm việc, hoặc làm quà cho người thích đồ công nghệ.

Lưu ý: có chi tiết nhỏ, không phù hợp với trẻ dưới 3 tuổi. Đừng xoay khớp quá mạnh. Vân lớp in mỏng trên bề mặt là đặc trưng của in 3D.','/images/robot.webp','["/images/robot.webp","/images/robot-detail.webp"]','',1792861349575,1792861349575);
INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('robot-1','robot','ROBOT-1','Xám','#7d8794','PLA',189000,10);
INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('robot-2','robot','ROBOT-2','Kem','#e5d6bc','PLA',189000,10);
