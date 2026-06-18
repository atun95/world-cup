import streamlit as st
import streamlit.components.v1 as components
import os

# 1. Cấu hình trang hiển thị FULL MÀN HÌNH (Bắt buộc phải đặt ở đầu file)
st.set_page_config(
    page_title="CupPulse 2026 – World Cup Tracker",
    page_icon="⚽",
    layout="wide",  # Thiết lập chế độ màn hình rộng
    initial_sidebar_state="collapsed"
)

# 2. Hack CSS để xóa padding thừa của Streamlit, ép component chiếm 100% không gian
st.markdown("""
    <style>
        /* Xóa khoảng cách trống ở đỉnh và 2 bên màn hình */
        .block-container {
            padding-top: 0rem !important;
            padding-bottom: 0rem !important;
            padding-left: 0rem !important;
            padding-right: 0rem !important;
            max-width: 100% !important;
        }
        /* Định hình khung chứa iframe luôn full width */
        iframe {
            width: 100% !important;
            border: none !important;
        }
        #MainMenu, footer {visibility: hidden;} /* Ẩn menu mặc định của Streamlit nếu muốn trang sạch hơn */
    </style>
""", unsafe_allow_html=True)

# Hàm đọc và gộp các file mã nguồn
def load_web_app():
    # Đọc nội dung file index.html
    with open("index.html", "r", encoding="utf-8") as f:
        html_content = f.read()

    # Nhúng file styles.css vào head
    if os.path.exists("styles.css"):
        with open("styles.css", "r", encoding="utf-8") as f:
            css_content = f.read()
        style_tag = f"<style>{css_content}</style>"
        html_content = html_content.replace('<link rel="stylesheet" href="styles.css">', style_tag)

    # Nhúng data.js và app.js vào cuối body
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

# Tiến hành render ứng dụng
try:
    final_html = load_web_app()
    
    # Đặt chiều cao lớn (height=2000 hoặc hơn) để chứa đủ 12 bảng đấu và danh sách trận đấu 
    # mà không bị xuất hiện 2 thanh cuộn lồng nhau (Double Scrollbar) gây khó chịu UX.
    components.html(final_html, height=2200, scrolling=True)

except Exception as e:
    st.error(f"Đã xảy ra lỗi khi nạp giao diện: {e}")
