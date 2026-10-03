# product-api — Thực hành 1

REST API CRUD cho Product gồm pid, pname, price, quantity, dùng Node.js 24, Express 5, Mongoose 9 và MongoDB 8. Project thực hiện hướng dẫn Prompt_Docker_CICD và tám mục Bảng chấm thực hành 1.

`.env`, cấu hình thực tế của máy và log local không được đưa lên GitHub/image. `.env.example` chỉ là mẫu để tự cấu hình. Các cổng trong Dockerfile/Compose và ví dụ dưới đây là mặc định ứng dụng, không phải bản cấu hình riêng của máy người dùng. Báo cáo/bằng chứng local giữ trong `docs/`, không version control.

## Thực hiện trong VS Code

Cần Node.js 24, npm, Git, Docker Desktop Linux containers và Compose. Cài Microsoft Container Tools; mở Terminal → Git Bash:

```bash
git clone https://github.com/NguyenTheAnh1005/product-api.git
cd product-api
code .
cp .env.example .env
# Sửa .env theo máy của bạn, không commit file này.
npm ci
docker compose up -d mongo --wait --wait-timeout 120
npm start
```

Node đọc .env và kết nối nammongodb qua loopback. Dừng Node bằng Ctrl+C, sau đó Dockerize API:

```bash
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 120
npm run health
```

Container Mongo tên nammongodb; API tên product-api. Volume product-api_mongo-data giữ dữ liệu. API trong Docker kết nối hostname service mongo. Cổng host chỉ bind loopback; Compose triển khai không publish cổng Mongo. Đây là demo local.

Windows PowerShell dùng npm.cmd nếu npm.ps1 bị chặn; không cần đổi execution policy toàn máy.

## Cấu trúc và cấu hình

`src/`: routes, validation, Mongoose model/repository, DB connection. `test/`: unit, contract HTTP, integration mongod thật. `scripts/`: health/test/deploy/local CD. `postman/`: collection/assertions. `.vscode/`: Git Bash/tasks/extension. `.github/workflows/`: đúng hai workflow theo đề.

| Biến trong .env mẫu | Ý nghĩa |
|---|---|
| PORT | Cổng Node ngoài container |
| MONGODB_URI | URI Mongo của Node local |
| MONGODB_URI_CONTAINER | URI Mongo trong mạng Compose |
| MONGO_PORT | Cổng Mongo loopback cho Node/VS Code |
| API_PORT | Cổng host API Compose |
| PRODUCT_IMAGE | Image Hub theo full commit SHA hoặc digest |
| GITHUB_REPOSITORY | Owner/repo local CD theo dõi |
| DOCKERHUB_NAMESPACE | Namespace image product-api |
| CD_POLL_SECONDS | Chu kỳ local CD, mặc định 300 giây, tối thiểu 60 |
| BASE_URL | URL cho health/HTTP test, mặc định mẫu http://127.0.0.1:3000 |
| TEST_MONGODB_URI | Tùy chọn MongoDB riêng cho integration |
| MONGOMS_SYSTEM_BINARY | Tùy chọn mongod có sẵn để tránh tải binary |
| GITHUB_READ_TOKEN | Tùy chọn repo private, chỉ giữ local |

## Hợp đồng API

| Method / URL | Request | Thành công |
|---|---|---|
| POST /api/products | đủ bốn trường | 201 + product + Location |
| GET /api/products | không body | 200 + array sort pid |
| GET /api/products/:pid | không body | 200 + product |
| PUT /api/products/:pid | đủ pname, price, quantity; cấm pid | 200 + product |
| DELETE /api/products/:pid | không body | 204 |
| GET /api/health | không body | 200 khi Mongo ping thành công; 503 khi DB không sẵn sàng |

Validation là lựa chọn triển khai, không phải tiêu chí riêng của giảng viên: pid nguyên dương an toàn, unique index MongoDB và bất biến; tên không rỗng sau trim; giá >0 tối đa hai số lẻ; quantity nguyên không âm. Không ép string thành number. PUT yêu cầu đủ ba trường sửa. Dữ liệu/trường sai 400, không tồn tại 404, pid trùng 409. Không trả stack hoặc URI bí mật.

Ví dụ với cổng mẫu:

```bash
curl -i http://127.0.0.1:3000/api/products \
  -H 'Content-Type: application/json' \
  -d '{"pid":101,"pname":"Ban phim","price":250.50,"quantity":10}'
```

## Test và Postman

```bash
npm test
npm run test:integration
npm run test:node-container
npm run test:http
npm run test:docker
npm exec --yes --package=newman@6 -- newman run postman/product-api.postman_collection.json
```

Unit kiểm tra logic HTTP/validation và nguồn release của local CD. Integration chạy mongod thật bằng mongodb-memory-server; lần đầu cần tải binary chính thức. Fail không được skip. Với TEST_MONGODB_URI, test không dừng DB ngoài; Docker test kiểm tra outage/recovery.

test:node-container dùng .env cho Node kết nối nammongodb. test:http cần API đang chạy. test:docker gây gián đoạn tạm thời stack demo để kiểm tra outage/restart/recreate/persistence; chỉ chạy trên demo. Test chỉ cleanup đúng pid, không drop DB/xóa volume.

Import collection trong Postman, đặt baseUrl theo .env, chạy request theo thứ tự. Create sinh pid thử riêng; assertions kiểm tra duplicate, invalid update, dữ liệu không đổi, update/delete. Newman chạy cùng collection từ CLI, không thay bằng chứng thao tác UI nếu giảng viên yêu cầu.

## Demo đúng tám mục P1

1. Trên GitHub mở .gitignore/.env.example; .env thật giữ local. `git ls-files .env` phải rỗng.
2. `docker compose up -d --build --wait --wait-timeout 120`.
3. `npm run health`; `docker compose stop mongo` → health 503; `docker compose start mongo` → chờ 200.
4. `docker ps` và `docker compose ps -a`.
5. Postman Health/Create → POST 201.
6. `docker exec nammongodb mongosh productdb --quiet --eval 'db.products.find().toArray()'`.
7. `docker logs --tail 100 product-api`.
8. Test; hai workflow Actions; image Hub theo commit; health sau CD local.

## CI/CD

test-productci.yml chạy npm ci/unit trên GitHub-hosted runner. test-productci-prod.yml chạy unit, mongod integration, build image, Compose healthy, Docker CRUD/outage/volume. Publish chỉ sau verify thành công, tải đúng image đã test từ artifact, không rebuild, tag full commit rồi resolve digest. PR chỉ test trên hosted runner, không dùng Docker Secrets/triển khai local.

| GitHub cấu hình | Tên |
|---|---|
| Repository variable | ENABLE_PUBLISH=true sau khi chuẩn bị Hub |
| Repository variables | DOCKERHUB_USERNAME, DOCKERHUB_NAMESPACE |
| Environment dockerhub secret | DOCKERHUB_TOKEN quyền write image |
| Phương án runner tùy chọn | ENABLE_LOCAL_DEPLOY=true; Windows X64 nhãn product-api-local |
| Environment local-demo secret cho runner | DOCKERHUB_READ_TOKEN |

Giới hạn Environment dockerhub tới main; không đặt token vào source/chat. Repo public có thể dùng tiến trình local CD để không mở máy làm runner:

```bash
# .env có GITHUB_REPOSITORY và DOCKERHUB_NAMESPACE đúng tài khoản
docker login
npm run cd:local
```

Tiến trình chỉ nhận đúng workflow/main/repository, event push/workflow_dispatch, run success và publish job success. Nó pull tag commit, resolve digest, Compose --no-build --wait và health; thành công mới lưu trạng thái trong cache local. Giữ tiến trình và Docker Desktop chạy để tự động CD. Ctrl+C dừng; `npm run cd:local -- --once` kiểm tra một lần. Chưa có publish thành công thì không triển khai.

Triển khai thủ công bằng PowerShell: `./scripts/deploy-local.ps1 -Image 'YOUR_NAMESPACE/product-api:FULL_COMMIT_SHA'`. Script pull/up không build/health. Chỉ push Hub chưa được coi là CD local hoàn tất. Rollback bằng digest bản tốt; dữ liệu không tự rollback.

## Dừng và giữ dữ liệu

`docker compose stop` giữ container/dữ liệu. `docker compose down` bỏ container/network và giữ named volume. Không down -v/volume prune để dọn test. Chỉ P1; chưa có auth/TLS/backup hoặc cấu hình production hoàn chỉnh.
