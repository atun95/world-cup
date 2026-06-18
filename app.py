import streamlit as st
import streamlit.components.v1 as components
import os

# Cấu hình trang Streamlit (hiển thị full màn hình)
st.set_page_config(
    page_title="CupPulse 2026 – World Cup Tracker",
    page_icon="⚽",
    layout="wide"
)

# Thao tác đọc các file nguồn
def load_web_app():
    # 1. Đọc nội dung file index.html
    with open("index.html", "r", encoding="utf-8") as f:
        html_content = f.read()

    # 2. Đọc nội dung file styles.css và nhúng vào head
    if os.path.exists("styles.css"):
        with open("styles.css", "r", encoding="utf-8") as f:
            css_content = f.read()
        style_tag = f"<style>{css_content}</style>"
        html_content = html_content.replace('<link rel="stylesheet" href="styles.css">', style_tag)

    # 3. Đọc nội dung file data.js và app.js để nhúng vào trước thẻ đóng </body>
    js_bundle = ""
    
    if os.path.exists("data.js"):
        with open("data.js", "r", encoding="utf-8") as f:
            js_bundle += f"\n{f.read()}\n"
        html_content = html_content.replace('<script src="data.js"></script>', '')

    if os.path.exists("app.js"):
        with open("app.js", "r", encoding="utf-8") as f:
            js_bundle += f"\n{f.read()}\n"
        html_content = html_content.replace('<script src="app.js"></script>', '')

    if js_bundle:
        script_tag = f"<script>{js_bundle}</script>"
        html_content = html_content.replace('</body>', f'{script_tag}</body>')

    return html_content

# Gọi hàm load toàn bộ nội dung đã gộp
try:
    final_html = load_web_app()
    
    # Hiển thị ứng dụng Web lên Streamlit. 
    # Chiều cao (height) đặt 1200 hoặc lớn hơn để thoải mái cuộn xem lịch thi đấu và bảng xếp hạng.
    components.html(final_html, height=1200, scrolling=True)

except Exception as e:
    st.error(f"Đã xảy ra lỗi khi nạp giao diện: {e}")
