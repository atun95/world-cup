import streamlit as st
import streamlit.components.v1 as components
import os
import json

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
""", unsafe_allow_html=True)

# 3. Khai báo Streamlit Custom Component để giao tiếp 2 chiều
try:
    parent_dir = os.path.dirname(os.path.abspath(__file__))
except NameError:
    parent_dir = "."

world_cup_tracker = components.declare_component("world_cup_tracker", path=parent_dir)

# 4. Tải tỷ lệ kèo từ file manual_odds.json trên server
odds_file = os.path.join(parent_dir, "manual_odds.json")
if os.path.exists(odds_file):
    try:
        with open(odds_file, "r", encoding="utf-8") as f:
            server_manual_odds = json.load(f)
    except Exception:
        server_manual_odds = {}
else:
    server_manual_odds = {}

# 5. Xác định môi trường chạy (local vs deploy)
is_deployed = (
    os.path.exists('/app') or 
    os.path.exists('/mount/src') or 
    "STREAMLIT_SHARING_API_KEY" in os.environ
)
is_local = not is_deployed

# 6. Gọi component và truyền dữ liệu tỷ lệ kèo từ server xuống frontend
try:
    # Chiều cao ban đầu đặt tạm 1600, script bên Javascript sẽ tự động gửi chiều cao thực tế để kéo giãn iframe.
    new_manual_odds = world_cup_tracker(
        server_manual_odds=server_manual_odds, 
        is_local=is_local,
        key="wc_tracker_comp", 
        height=1600
    )
    
    # 7. Nếu người dùng nhập kèo mới từ giao diện, lưu vào file trên server và tải lại trang để đồng bộ (chỉ chạy ở local)
    if is_local and new_manual_odds is not None:
        # Kiểm tra xem dữ liệu trả về có hợp lệ không và có khác với dữ liệu hiện tại trên server không
        if isinstance(new_manual_odds, dict) and new_manual_odds != server_manual_odds:
            with open(odds_file, "w", encoding="utf-8") as f:
                json.dump(new_manual_odds, f, ensure_ascii=False, indent=2)
            st.rerun()
except Exception as e:
    st.error(f"Đã xảy ra lỗi khi nạp giao diện: {e}")
