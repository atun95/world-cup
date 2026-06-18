import streamlit as st
import streamlit.components.v1 as components
import os

# 1. Cấu hình trang (Bắt buộc ở đầu file)
st.set_page_config(
    page_title="CupPulse 2026 – World Cup Tracker",
    page_icon="⚽",
    layout="wide", 
    initial_sidebar_state="collapsed"
)

# 2. Cấu hình CSS tối ưu cho cả PC lẫn MOBILE
st.markdown("""
    <style>
        /* Xóa khoảng trống mặc định của Streamlit */
        .block-container {
            padding-top: 0rem !important;
            padding-bottom: 0rem !important;
            padding-left: 0rem !important;
            padding-right: 0rem !important;
            max-width: 100% !important;
        }
        
        /* Cấu hình khung chứa ứng dụng */
        iframe {
            display: block;
            width: 100vw !important;       /* Ép tràn hết màn hình thiết bị di động */
            max-width: 1400px !important;  /* Giới hạn độ rộng trên PC để không bị quá bự */
            margin: 0 auto !important;     /* Căn giữa trên PC */
            border: none !important;
        }
        
        /* Ẩn các thành phần thừa của Streamlit */
        #MainMenu, footer {visibility: hidden;}
    </style>
""", unsafe_allow_html=True)

# --- GIỮ NGUYÊN PHẦN CODE ĐỌC FILE VÀ RENDER PHÍA DƯỚI CỦA BẠN ---
def load_web_app():
    with open("index.html", "r", encoding="utf-8") as f:
        html_content = f.read()

    if os.path.exists("styles.css"):
        with open("styles.css", "r", encoding="utf-8") as f:
            css_content = f.read()
        style_tag = f"<style>{css_content}</style>"
        html_content = html_content.replace('<link rel="stylesheet" href="styles.css">', style_tag)

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

try:
    final_html = load_web_app()
    components.html(final_html, height=2000, scrolling=True)
except Exception as e:
    st.error(f"Đã xảy ra lỗi khi nạp giao diện: {e}")
