import streamlit as st
import pandas as pd
import plotly.express as px

# 1. Page Configuration
st.set_page_config(page_title="Drum's Command Center", layout="wide", page_icon="🥁", initial_sidebar_state="collapsed")

# 2. Session State for Custom Colors
if 'accent_color' not in st.session_state:
    st.session_state.accent_color = '#00d4ff'

# 3. Dynamic Styling
st.markdown(f"""
    <style>
    .stApp {{ background-color: #050505; }}
    h1 {{ color: {st.session_state.accent_color}; text-align: center; text-transform: uppercase; }}
    h2, h3 {{ color: {st.session_state.accent_color}; }}
    [data-testid="stMetricValue"] {{ color: #ffffff; }}
    [data-testid="stMetricLabel"] {{ color: #888888; }}
    div.stButton > button {{ background-color: #1a1a1a; color: {st.session_state.accent_color}; border: 1px solid {st.session_state.accent_color}; width: 100%; }}
    a {{ color: {st.session_state.accent_color} !important; }}
    </style>
    """, unsafe_allow_html=True)

# 4. Tabs
tab1, tab2 = st.tabs(["📊 Dashboard", "⚙️ Settings"])

# --- DATA LOADING ---
@st.cache_data(ttl=60) 
def load_data():
    sheet_url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRFLd_9rZtKr3eF2vgWViTENOGZTUTirr-fajK2k5IRVL8hR2R4T_rq0Rooi1FbN9-P25SYtjIylAOA/pub?output=csv"
    return pd.read_csv(sheet_url)

# --- DASHBOARD TAB ---
with tab1:
    st.title("🥁 DRUM! Command Center")
    try:
        df = load_data()
        df['Timestamp'] = pd.to_datetime(df['Timestamp'], format='mixed')
        
        if st.button("🔄 Refresh Data"):
            st.cache_data.clear()
            st.rerun()

        latest = df.loc[df['Timestamp'].idxmax()] 
        cols = st.columns(2)
        for i, col in enumerate(df.columns[1:]):
            cols[i % 2].metric(col.replace(" Followers", ""), int(latest[col]))

        fig = px.line(df, x='Timestamp', y=df.columns[1:], template="plotly_dark")
        fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
        st.plotly_chart(fig, use_container_width=True)
    except Exception as e:
        st.error("Data loading...")

# --- SETTINGS TAB ---
with tab2:
    st.title("⚙️ Customization")
    st.session_state.accent_color = st.color_picker("Pick your Theme Color", st.session_state.accent_color)
    
    if st.button("Apply New Color"):
        st.rerun()

    st.subheader("🔗 My Links")
    # All 6 links are here, organized for mobile tapping
    col1, col2 = st.columns(2)
    with col1:
        st.link_button("Twitch", "https://twitch.tv/ustayblowinHIGH", use_container_width=True)
        st.link_button("TikTok", "https://tiktok.com/@unpdrum", use_container_width=True)
        st.link_button("YouTube", "https://youtube.com/@unpdrum", use_container_width=True)
    with col2:
        st.link_button("Facebook", "https://facebook.com/unpdrum", use_container_width=True)
        st.link_button("Instagram", "https://instagram.com/unpdrum", use_container_width=True)
        st.link_button("Kick", "https://kick.com/unpdrum", use_container_width=True)
