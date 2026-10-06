# Hướng dẫn chấm Bài thực hành 1 — Câu 1 đến câu 8

Bài dùng Express, Mongoose và MongoDB để CRUD sản phẩm gồm `pid`, `pname`, `price`, `quantity`. Làm lần lượt từ câu 1 đến câu 8. Câu 5 nhập request bằng tay trong Postman; các lệnh chạy trong Git Bash của VS Code.

## Chuẩn bị trước khi làm

1. Mở **Docker Desktop**, chờ Docker Engine chạy xong.
2. Mở **VS Code → File → Open Folder**, chọn thư mục bài thực hành 1 trên máy.
3. Chọn **Terminal → New Terminal**.
4. Nhấn mũi tên cạnh dấu **+** trong thanh Terminal → chọn **Git Bash**.
5. Nếu máy chưa cài dependencies của project, chạy `npm ci`. Nếu đã cài thì bỏ qua.
6. Giữ file `.env` hiện có. Chỉ khi chưa có `.env`, sao chép `.env.example` thành `.env` rồi cấu hình cho máy.

Các URL dưới đây dùng **cổng mẫu 3000**. Nếu `API_PORT` trong `.env` khác, thay 3000 bằng cổng đó. Không đưa `.env` thật, mật khẩu hoặc cấu hình riêng của máy lên GitHub.

## Câu 1. Kiểm tra .gitignore và .env trên GitHub

**Nơi thực hiện: trình duyệt và Git Bash.**

1. Mở [repository product-api](https://github.com/NguyenTheAnh1005/product-api).
2. Nhấn file **`.gitignore`**.
3. Chỉ dòng `.env`: Git bỏ qua file cấu hình thật này.
4. Quay lại danh sách file: có **`.env.example`** là cấu hình mẫu; không có `.env` thật.
5. Quay lại Git Bash trong VS Code, chạy:

```bash
git ls-files .env
```

**Kết quả đúng:** không hiện dòng nào. `.env` thật được giữ ở máy để ứng dụng sử dụng, không được Git theo dõi.

## Câu 2. Kiểm tra mã nguồn và chạy Docker Compose

**Nơi thực hiện: VS Code và Git Bash.**

1. Trong cây file bên trái VS Code, mở `src/` để xem mã nguồn CRUD.
2. Mở `Dockerfile`: cấu hình đóng gói ứng dụng API.
3. Mở `docker-compose.yaml`: cấu hình chạy MongoDB và API.
4. Trong Git Bash, chạy:

```bash
docker compose up -d --build --wait --wait-timeout 120
```

5. Chờ lệnh hoàn tất; lần đầu build có thể mất vài phút.

**Kết quả đúng:** có hai container:

- **`nammongodb`**: MongoDB lưu dữ liệu sản phẩm.
- **`product-api`**: API xử lý request và kết nối MongoDB.

Docker Desktop gộp chúng trong nhóm Compose **product-api**. Nhấn mũi tên bên trái nhóm để thấy hai container. Volume `product-api_mongo-data` giữ dữ liệu MongoDB.

## Câu 3. System health check

**Nơi thực hiện: Git Bash.**

1. Chạy:

```bash
npm run health
```

**Kết quả đúng:**

```text
API and MongoDB healthy
```

2. Tiếp tục chạy:

```bash
docker ps
```

3. Xem cột **STATUS**: cả hai container phải có chữ **healthy**. Nếu đang `health: starting`, chờ một chút rồi chạy lại.

API có endpoint `/api/health`, ping MongoDB thật: trả 200 khi kết nối tốt và 503 khi MongoDB không sẵn sàng.

Nếu đổi cổng API, chạy health bằng cổng của bạn; ví dụ với cổng mẫu:

```bash
BASE_URL=http://localhost:3000 npm run health
```

## Câu 4. CLI: kiểm tra danh sách container trong Docker Engine

**Nơi thực hiện: Git Bash. CLI ở đây là dùng lệnh trong Terminal.**

1. Chạy:

```bash
docker ps
```

2. Chỉ cho giảng viên hai dòng `nammongodb` và `product-api`.
3. Giải thích bảng hiển thị image, trạng thái, cổng và tên container đang chạy.

**Kết quả đúng:** cả hai container có mặt và đang chạy. Lệnh giống câu 3 nhưng câu này dùng để trình bày danh sách container.

## Câu 5. Postman: gõ tay request thêm sản phẩm

**Nơi thực hiện: ứng dụng Postman. Không import collection hoặc môi trường.**

1. Mở **Postman → New → HTTP Request**. Có thể mở tab request mới bằng dấu **+**.
2. Chọn phương thức **POST** ở bên trái ô URL.
3. Gõ URL trực tiếp:

```text
http://localhost:3000/api/products
```

4. Chọn tab **Body → raw → JSON** (menu loại dữ liệu ở bên phải vùng Body).
5. Gõ trực tiếp nội dung sau:

```json
{
  "pid": 101,
  "pname": "Ban phim",
  "price": 250000,
  "quantity": 10
}
```

6. Nhấn **Send**.
7. Xem status và nội dung Response ở phía dưới.

**Kết quả đúng:** **201 Created**, Response có đủ bốn trường vừa nhập. Chọn Body dạng JSON để Postman gửi header `Content-Type: application/json`.

Nếu nhận **409 Conflict**, pid 101 đã tồn tại: đổi thành 102 hoặc một số nguyên dương chưa dùng rồi gửi lại. Ghi nhớ pid đã tạo thành công để dùng ở câu 6.

**Giữ sản phẩm này trong database đến khi hoàn thành câu 6 và câu 7. Chưa gửi DELETE.**

## Câu 6. CLI: kiểm tra dữ liệu trong MongoDB container

**Nơi thực hiện: quay lại Git Bash trong VS Code.**

1. Nếu câu 5 tạo sản phẩm pid 101, chạy:

```bash
docker exec nammongodb mongosh productdb --quiet --eval 'db.products.find({pid:101}).toArray()'
```

2. Nếu đã dùng pid 102, thay `101` trong lệnh bằng `102`.
3. Đối chiếu dữ liệu với Response Postman ở câu 5.

**Kết quả đúng:** thấy sản phẩm có cùng pid, `pname: 'Ban phim'`, `price: 250000`, `quantity: 10`. MongoDB có thêm `_id` là bình thường.

Để xem toàn bộ sản phẩm:

```bash
docker exec nammongodb mongosh productdb --quiet --eval 'db.products.find().toArray()'
```

`productdb` là tên database mẫu. Nếu bạn đổi tên database trong URI ở `.env`, dùng tên đã cấu hình. Nếu kết quả là `[]`, kiểm tra lại pid, database và POST ở câu 5 đã nhận 201 chưa.

## Câu 7. CLI: kiểm tra log product-api container

**Nơi thực hiện: Git Bash.**

1. Chạy:

```bash
docker logs --tail 100 product-api
```

2. Tìm dòng:

```text
POST /api/products 201
```

**Kết quả đúng:** log thể hiện API nhận request thêm sản phẩm và xử lý thành công. Các dòng `GET /api/health 200` là những lần healthcheck, cũng bình thường.

## Câu 8. CLI: test script và CI/CD

### A. Chạy test — trong Git Bash

1. Chạy test cơ bản:

```bash
npm test
```

**Kết quả đúng:** `fail 0`.

2. Khi API đang chạy, kiểm tra CRUD qua HTTP:

```bash
npm run test:http
```

**Kết quả đúng:**

```text
HTTP contract passed against running API
```

Nếu đổi cổng, dùng cổng đó, ví dụ:

```bash
BASE_URL=http://localhost:3000 npm run test:http
```

HTTP test dùng bản ghi riêng và tự xóa bản ghi test của nó.

### B. Trình bày CI/CD — trên trình duyệt

1. Mở [GitHub Actions](https://github.com/NguyenTheAnh1005/product-api/actions).
2. Chỉ hai workflow theo hướng dẫn:
   - **Product basic CI** (`test-productci.yml`): cài dependencies và chạy unit test.
   - **Product tested image and local CD** (`test-productci-prod.yml`): test MongoDB, build Docker, kiểm tra health/CRUD/dữ liệu và publish image.
3. Mở một lần chạy đã hoàn thành có dấu tích xanh.
4. Trong workflow production, chỉ các job:
   - **verify**: kiểm tra trước khi phát hành.
   - **publish**: đẩy đúng image đã kiểm tra lên Docker Hub.
5. Có thể mở [lần chạy thành công của bản tinh gọn](https://github.com/NguyenTheAnh1005/product-api/actions/runs/37480814961) để xem bằng chứng.
6. Mở [Docker Hub product-api](https://hub.docker.com/r/nguyentheanh1005/product-api) để xem image.

### C. CD về máy local — trong Git Bash

Luồng đã cấu hình: **GitHub Actions → Docker Hub → tiến trình CD local → Docker Engine trên máy**.

1. Giữ Docker Desktop chạy. Nếu tiến trình CD chưa chạy hoặc vừa khởi động lại máy, mở một Terminal **Git Bash mới** và chạy:

```bash
npm run cd:local
```

2. Giữ Terminal này chạy; không mở thêm nếu đã có một tiến trình CD. `.env` cần có `GITHUB_REPOSITORY`, `DOCKERHUB_NAMESPACE`, `CD_POLL_SECONDS`.
3. Tiến trình nhận workflow main có job publish thành công, pull image và chạy `docker-compose-prod.yaml`; kiểm tra health rồi mới ghi nhận deploy thành công.
4. Khi log đã báo `Local CD healthy`, mở Terminal Git Bash khác và chạy:

```bash
docker inspect product-api --format '{{.Config.Image}}'
```

**Kết quả đúng sau CD:** tên image bắt đầu bằng `nguyentheanh1005/product-api@sha256:`. Nếu vừa build local ở câu 2, có thể đang thấy `product-api:local`; dùng bước dưới để chạy lại image từ Hub.

5. Nếu câu 2 vừa build image local và cần trình bày lại bản Hub đã kiểm tra, đợi tiến trình CD không còn deploy rồi chạy các lệnh sau trong Terminal riêng:

```bash
export PRODUCT_IMAGE=nguyentheanh1005/product-api:48dbdc942421bd99442ed4281b601d8620c8dac2
docker compose -f docker-compose-prod.yaml pull
docker compose -f docker-compose-prod.yaml up -d --no-build --wait --wait-timeout 120
```

Đây là tag của bản tinh gọn đã chạy CI/CD thành công. Bước này chạy lại image Hub bằng Compose prod, giữ nguyên volume MongoDB. Khi dùng tag, `docker inspect` hiển thị tên image kèm tag thay vì digest; cả hai đều là image Hub.

6. Kiểm tra lại:

```bash
docker inspect product-api --format '{{.Config.Image}}'
npm run health
docker ps
```

**Kết quả đúng:** dùng image Hub theo tag hoặc digest, API/Mongo healthy và cả hai container đang chạy.

## Lưu ý khi kết thúc

- `.env` thật giữ ở máy, không upload lên GitHub.
- Giữ bản ghi nhập tay ở câu 5 để trình bày câu 6 và 7.
- `docker compose stop` dừng container và giữ dữ liệu.
- Không dùng `docker compose down -v` vì sẽ xóa volume dữ liệu MongoDB.
