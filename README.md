# QuickSort: Pivot Selection & Optimization

Mini báo cáo tương tác bằng tiếng Việt về cách lựa chọn pivot trong QuickSort, tập trung vào **Median-of-Three**.

## Nội dung

- Vì sao pivot đầu mảng có thể gây phân hoạch mất cân bằng
- Đối chiếu mã **2-way partition của Sedgewick–Wayne** với cải tiến Median-of-Three
- Minh họa từng thao tác phân hoạch, theo dõi số phép so sánh, hoán đổi và độ sâu đệ quy
- Phân tích kỳ vọng: **2n ln n** và **(12/7)n ln n** (mô hình khóa phân biệt, lấy mẫu ngẫu nhiên)
- Hạn chế: worst-case, khóa trùng, chi phí chọn pivot và tối ưu thực tế

## Cấu trúc

- `index.html` — báo cáo trực quan
- `styles.css` — giao diện responsive, nhất quán với sorting-algorithms-uet
- `app.js` — mô phỏng deterministic của 2-way partition, không cần thư viện
- `src/QuickPivotSelection.java` — bản Java hoàn chỉnh, có thể biên dịch

## Chạy

Mở `index.html` trực tiếp hoặc dùng GitHub Pages (Deploy from branch `main`, thư mục `/ (root)`).

```bash
javac src/QuickPivotSelection.java
java -cp src QuickPivotSelection
```

## Nguồn

Robert Sedgewick & Kevin Wayne, *Algorithms, Fourth Edition*, lecture **2.3 Quicksort**, đặc biệt các trang 13, 15, 23–24, 27–28, 42–47, 53, 63.

- https://algs4.cs.princeton.edu/23quicksort/
- https://algs4.cs.princeton.edu/lectures/23Quicksort.pdf

**Ghi chú học thuật:** Giá trị `12/7` là hệ số dẫn đầu của số phép so sánh kỳ vọng trong mô hình median-of-three với lấy mẫu ngẫu nhiên. Đây không phải cam kết về thời gian thực tế. Mô phỏng trên trang sử dụng ba **vị trí đầu/giữa/cuối** và không tự shuffle nhằm làm rõ các trường hợp đối kháng.
