# Product API — Bài thực hành 1

CRUD Product (`pid`, `pname`, `price`, `quantity`) bằng Express, Mongoose và MongoDB. Phạm vi: 8 mục trang 2 của PHIEU_CHAM.pdf và Docker/CI/CD trong hướng dẫn P1.

## Chạy bài

Cần Node.js 24, Git, Docker Desktop (Linux containers), VS Code và Postman. Trong Terminal Git Bash của VS Code:

```bash
npm ci
cp .env.example .env
# Sửa .env cho máy của bạn; không commit file này.
docker compose up -d --build --wait --wait-timeout 120
```

Nếu đã có `.env`, giữ file hiện có. `.env.example` chỉ chứa cấu hình mẫu; `.env`, log và cấu hình riêng của máy không đưa lên GitHub hoặc image. PowerShell dùng `npm.cmd` nếu `npm.ps1` bị chặn.

Hai container là `nammongodb` (MongoDB) và `product-api` (API), nằm trong nhóm Compose `product-api`. Volume `product-api_mongo-data` giữ dữ liệu; API kết nối Mongo qua service `mongo`.

Để chạy Node trực tiếp từ VS Code theo hướng dẫn: `docker compose up -d mongo --wait`, rồi `npm start`. Dừng Node trước khi chạy cả stack Compose nếu dùng cùng cổng.

## Demo đúng 8 mục chấm

| Mục | Nội dung | Thao tác khi chấm |
|---|---|---|
| 1 | `.gitignore` và `.env` trên GitHub | Mở `.gitignore`, `.env.example`; `git ls-files .env` phải rỗng. `.env` thật giữ local. |
| 2 | Mã nguồn và Docker Compose | Mở `src/`, `Dockerfile`, `docker-compose.yaml`; chạy Compose ở trên. |
| 3 | System health check | `npm run health`; `docker ps` thấy cả hai healthy. `/api/health` ping Mongo thật, trả 200 hoặc 503. |
| 4 | CLI danh sách container | `docker ps` |
| 5 | Postman thêm sản phẩm | Import collection; chạy `1. Health`, rồi `2. Create`: mong đợi 201. |
| 6 | CLI dữ liệu MongoDB | Chạy lệnh Mongo bên dưới ngay sau Create, trước Delete. |
| 7 | CLI log API | `docker logs --tail 100 product-api`: thấy POST và status 201. |
| 8 | Test script và CI/CD | `npm test`, `npm run test:http`; mở hai workflow Actions thành công, image Hub và health sau CD local. |

Postman: import `postman/product-api.postman_collection.json`, đặt biến collection `baseUrl` theo cổng API trong `.env` (mẫu `http://127.0.0.1:3000`). Create tự sinh `pid`; body trả về có đủ bốn trường. **Dừng sau Create để demo mục 6 và 7**; các request còn lại kiểm tra CRUD và cuối cùng xóa bản ghi test.

```bash
docker exec nammongodb mongosh productdb --quiet --eval 'db.products.find().toArray()'
docker logs --tail 100 product-api
```

Nếu đổi database trong `.env`, dùng tên đó thay `productdb`. Newman kiểm tra collection qua CLI; khi chấm mục 5, thao tác trực tiếp trong Postman.

## API

| Method | URL | Thành công |
|---|---|---|
| POST | `/api/products` | 201; body gồm pid, pname, price, quantity |
| GET | `/api/products` | 200; danh sách |
| GET | `/api/products/:pid` | 200; một sản phẩm |
| PUT | `/api/products/:pid` | 200; body gồm pname, price, quantity |
| DELETE | `/api/products/:pid` | 204 |
| GET | `/api/health` | 200 khi Mongo hoạt động; 503 khi mất kết nối |

Body Create mẫu: `{"pid":101,"pname":"Ban phim","price":250.50,"quantity":10}`. pid nguyên dương, duy nhất; tên không rỗng; giá dương tối đa hai chữ số thập phân; quantity nguyên không âm. Dữ liệu sai trả 400, không tìm thấy 404, pid trùng 409.

## Test và CI/CD (mục 8)

```bash
npm test
npm run test:integration
npm run test:http
npm run test:docker
```

Unit kiểm tra API và điều kiện nhận release. Integration chạy mongod thật (lần đầu tải binary). HTTP test chạy trên API đang mở; đặt `BASE_URL` nếu đổi cổng. Docker test kiểm tra mất kết nối, phục hồi và dữ liệu qua recreate nên tạm dừng/restart stack demo. Test chỉ xóa bản ghi do chính nó tạo.

Đúng hai workflow theo hướng dẫn:

- `test-productci.yml`: cài dependencies và chạy unit test.
- `test-productci-prod.yml`: unit, Mongo integration, build, Compose health, CRUD/persistence; đạt mới push đúng image đã test lên Docker Hub với tag commit SHA.

GitHub variables: `ENABLE_PUBLISH=true`, `DOCKERHUB_USERNAME`, `DOCKERHUB_NAMESPACE`. Environment `dockerhub` có Secret `DOCKERHUB_TOKEN`; không ghi token vào source.

Local CD dùng một cách: tiến trình theo dõi release thành công, pull image từ Hub và chạy `docker-compose-prod.yaml` không build lại:

```bash
# .env: GITHUB_REPOSITORY, DOCKERHUB_NAMESPACE, CD_POLL_SECONDS
npm run cd:local
```

Giữ Docker Desktop và tiến trình này chạy; sau reboot cần khởi động lại. `npm run cd:local -- --once` kiểm tra một lần. Chỉ deploy khi workflow main và job publish thành công, kiểm tra health rồi lưu trạng thái local. Compose prod dùng cùng volume Mongo; tiến trình cấp `PRODUCT_IMAGE` theo digest.

`docker compose stop` giữ dữ liệu; `docker compose down` giữ named volume. Không dùng `down -v` để tránh mất dữ liệu.
