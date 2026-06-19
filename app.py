import streamlit as st
import streamlit.components.v1 as components
import os

# 1. Cấu hình trang
st.set_page_config(
    page_title="WORLD CUP 2026",
    page_icon="⚽",
    layout="wide", 
    initial_sidebar_state="collapsed"
)

# 2. Cấu hình CSS tràn viền tuyệt đối
st.markdown("""
    <style>
        .block-container {
            padding: 0rem !important;
            max-width: 100% !important;
        }
        iframe {
            display: block;
            width: 100vw !important;
            max-width: 1400px !important;
            margin: 0 auto !important;
            border: none !important;
            /* Khóa không cho lag/giật khi cuộn */
            overflow: hidden !important; 
        }
        #MainMenu, footer {visibility: hidden;}
        header, [data-testid="stHeader"], .stAppHeader {
            display: none !important;
        }
    </style>
    <svg onload="
        window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'streamlit:setComponentValue') {
                const iframes = document.querySelectorAll('iframe');
                iframes.forEach(iframe => {
                    if (iframe.contentWindow === e.source) {
                        iframe.style.height = (e.data.value + 10) + 'px';
                    }
                });
            }
        });
    " style="display:none;"></svg>
""", unsafe_allow_html=True)

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

    # SỬA LỖI LAG: Thêm đoạn Script tự động cập nhật chiều cao thực tế lên trang mẹ Streamlit
    auto_height_script = """
    <script>
        function sendHeight() {
            const wrapper = document.getElementById('app-wrapper');
            const height = wrapper ? wrapper.offsetHeight : (document.documentElement.scrollHeight || document.body.scrollHeight);
            window.parent.postMessage({
                type: 'streamlit:setComponentValue',
                value: height
            }, '*');
            
            // Cập nhật lại khung height của iframe ngay lập tức (nếu cùng origin)
            try {
                if (window.frameElement) {
                    window.frameElement.style.height = height + 'px';
                }
            } catch (e) {}
        }
        // Chạy khi nạp trang xong
        window.addEventListener('load', () => {
            setTimeout(sendHeight, 300);
        });
        // Chạy lại khi người dùng bấm chuyển Tab (Matches, Standings...)
        document.addEventListener('click', () => {
            setTimeout(sendHeight, 100);
        });
        // Theo dõi sự thay đổi kích thước của trang
        const resizeObserver = new ResizeObserver(() => sendHeight());
        const wrapperEl = document.getElementById('app-wrapper');
        if (wrapperEl) {
            resizeObserver.observe(wrapperEl);
        } else {
            resizeObserver.observe(document.body);
        }
    </script>
    """
    
    if js_bundle:
        script_tag = f"<script>{js_bundle}</script>{auto_height_script}"
        html_content = html_content.replace('</body>', f'{script_tag}</body>')
    else:
        html_content = html_content.replace('</body>', f'{auto_height_script}</body>')

    return html_content

try:
    final_html = load_web_app()
    
    # ĐỔI THÀNH scrolling=False để loại bỏ hoàn toàn thanh cuộn lồng, giúp cuộn mượt 100%
    # Chiều cao ban đầu đặt tạm 1600, script phía trên sẽ tự động kéo giãn ra sau.
    components.html(final_html, height=1600, scrolling=False)
except Exception as e:
    st.error(f"Đã xảy ra lỗi khi nạp giao diện: {e}")
