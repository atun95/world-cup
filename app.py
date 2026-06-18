import streamlit as streamlit.components.v1 as components

# Đọc nội dung file index.html
with open("index.html", "r", encoding="utf-8") as f:
    html_code = f.read()

# Hiển thị file HTML lên Streamlit (thay đổi chiều rộng/cao tùy ý)
components.html(html_code, height=600, scrolling=True)