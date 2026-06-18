import streamlit.components.v1 as components
import os

# 1. Đọc nội dung file index.html
with open("index.html", "r", encoding="utf-8") as f:
    html_code = f.read()

# 2. Đọc nội dung file style.css (nếu file tồn tại)
css_code = ""
if os.path.exists("style.css"):
    with open("style.css", "r", encoding="utf-8") as f:
        css_code = f.read()

# 3. Chèn code CSS vào ngay trước thẻ đóng </head> của HTML
if css_code:
    style_tag = f"<style>{css_code}</style>"
    html_code = html_code.replace("</head>", f"{style_tag}</head>")

# 4. Hiển thị lên Streamlit
# Bạn có thể tăng 'height' nếu trang web bị cuộn quá nhiều, hoặc thêm 'width'
components.html(html_code, height=1000, scrolling=True)
