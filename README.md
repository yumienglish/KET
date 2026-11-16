# KET Self-study

Trang tự học KET (sách *Objective Key 2nd Edition*). Mỗi tuần mở 1 bài.

Link cho học sinh: https://yumienglish.github.io/KET/

## Cấu trúc
- `index.html`: trang chủ (danh sách bài) và trang bài làm (`?w=1`, `?w=2`…)
- `lessons.js`: **dữ liệu bài học**, gồm `OPEN_WEEK`, `VOCAB` (từ mới: nghĩa, phiên âm) và `LESSONS` (bài từng tuần)
- `app.js`: giao diện, chấm điểm, làm lại câu sai, ghi âm, gửi bài
- `audio/`: audio đã cắt bỏ phần giới thiệu ("1.1 … Exercise …"), chỉ giữ từ câu hỏi đầu tiên
- `img/`: hình cắt từ sách

## Mở bài tuần mới
1. Thêm `LESSONS[n]` trong `lessons.js` và thêm từ mới vào `VOCAB`.
2. Chép audio đã cắt vào `audio/` và hình vào `img/`.
3. Đổi `OPEN_WEEK = n`, tăng `?v=` trong `index.html`, rồi push.

## Nộp bài
Dùng chung máy chủ Code.gs với các trang BTVN (unit `KET`):
- **Lần 1**: gửi mail kèm các file ghi âm speaking và phần tự đánh giá.
- **Lần 2** (học sinh làm lại câu sai): gửi mail so sánh Lần 1 → Lần 2. Thời gian làm và số lần rời trang được tính riêng cho từng lần.
