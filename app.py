import streamlit as st
import streamlit.components.v1 as components

st.title("Ứng dụng World Cup của tôi")

with open("index.html", "r", encoding="utf-8") as f:
    html_code = f.read()

components.html(html_code, height=600, scrolling=True)
