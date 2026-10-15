# Tìm hiểu kỹ thuật chọn pivot Median-of-Three trong QuickSort

Tìm hiểu cách chọn pivot **Median-of-Three** và đối chiếu với pivot đầu mảng trên cùng thủ tục phân hoạch, dựa theo **Robert Sedgewick & Kevin Wayne — Algorithms, Fourth Edition**. Nội dung gồm cài đặt Java, mô phỏng và phân tích số phép so sánh.

## Nội dung

1. Vấn đề: pivot cố định có thể gây phân hoạch lệch và thời gian Θ(n²).
2. Giải pháp: chọn trung vị của ba phần tử đầu / giữa / cuối.
3. Mã Java: giữ nguyên two-way partition, chỉ đổi bước chọn pivot.
4. Animation: hai QuickSort chạy song song bằng các cột di chuyển theo hoán đổi thật, có Play/Pause, bước trước/sau, tốc độ, tua và chế độ quét chi tiết.
   Phần truy vết thủ công vẫn có sẵn ở bên dưới, mặc định thu gọn.
5. Đánh giá: so sánh hệ số kỳ vọng `2n ln n` và `(12/7)n ln n`, tính cả overhead chọn pivot và nêu giới hạn worst-case.

Giao diện là **một trang báo cáo tối giản**, không có thanh mục lục hay đồ họa trang trí.

## Cấu trúc

| File | Vai trò |
| --- | --- |
| `index.html` | Nội dung báo cáo và giao diện minh họa |
| `styles.css` | Kiểu chữ, bố cục đơn cột và responsive |
| `engine.js` | Lõi QuickSort, phân hoạch hai con trỏ, trace và định danh phần tử phục vụ animation |
| `app.js` | Điều khiển nhập dữ liệu, bảng so sánh và truy vết từng bước |
| `animation.js` | Hiển thị animation song song, quản lý Play/Pause và tốc độ |
| `src/QuickPivotSelection.java` | Mã Java tương ứng với thuật toán từ bài giảng |
| `tests/quicksort.test.cjs` | Kiểm thử thuật toán và bất biến phân hoạch |
| `.github/workflows/verify.yml` | Tự động chạy test Node.js và biên dịch Java |

## Chạy và kiểm thử

Website là HTML/CSS/JavaScript thuần, không dùng framework. Có thể mở `index.html` trong trình duyệt.

```bash
node --test tests/quicksort.test.cjs
javac src/QuickPivotSelection.java
java -cp src QuickPivotSelection
```

## Cách đọc kết quả

- **So sánh khóa**: đếm cả phép so sánh khi tìm trung vị (nếu có) và khi quét phân hoạch.
- **Hoán đổi**: chỉ đếm trao đổi giữa hai vị trí khác nhau, kể cả khi giá trị bằng nhau.
- **Độ sâu**: số mức đệ quy tối đa có thực hiện phân hoạch.
- **Phân hoạch đầu tiên**: so sánh kích thước hai mảng con sau khi pivot ở vị trí cuối cùng.
- **Không shuffle trong mô phỏng** nhằm quan sát tác động của pivot trên mảng đã chọn.

Con số khoảng **14,29%** nói đến giảm *hệ số dẫn đầu số phép so sánh kỳ vọng* trong mô hình hoán vị ngẫu nhiên có khóa phân biệt. Nó **không phải** kết quả benchmark tốc độ CPU hoặc bảo đảm tăng tốc cho mọi dữ liệu.

## Tài liệu

Robert Sedgewick & Kevin Wayne, *Algorithms, 4th Edition*, bài giảng 2.3 — *Quicksort*, các slide 13, 15, 23–24, 27–28 và 42–47.
