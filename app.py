import streamlit as st
import pandas as pd
import plotly.express as px

# 1. Page Configuration
st.set_page_config(page_title="Drum's Command Center", layout="wide", page_icon="🥁")

# 2. Premium Designer Styling
if 'accent_color' not in st.session_state:
    st.session_state.accent_color = '#00d4ff'

st.markdown(f"""
    <style>
    /* Global Container */
    .stApp {{ background-color: #080808; }}
    
    /* Designer Cards */
    div[data-testid="stVerticalBlock"] {{ gap: 1rem; }}
    .css-1r6slp0 {{ background-color: #121212; border: 1px solid #222; border-radius: 16px; padding: 20px; }}
    
    /* Typography */
    h1, h2, h3 {{ font-family: 'Helvetica Neue', sans-serif; letter-spacing: -0.5px; }}
    
    /* Custom Metric Cards */
    [data-testid="stMetric"] {{ background: #161616; padding: 15px; border-radius: 12px; border-left: 4px solid {st.session_state.accent_color}; }}
    [data-testid="stMetricValue"] {{ color: #ffffff; font-weight: 700; }}
    
    /* AI Chat Styling */
    .stChatMessage {{ background-color: #1a1a1a; border-radius: 12px; }}
    
    /* Buttons */
    div.stButton > button {{ 
        background: linear-gradient(90deg, {st.session_state.accent_color}, #00aaff);
        color: white; border: none; border-radius: 8px; font-weight: bold; padding: 10px 24px;
    }}
    </style>
    """, unsafe_allow_html=True)

# 3. Tabs
tab1, tab2, tab3, tab4 = st.tabs(["📊 Dashboard", "🤖 AI Assistant", "🔗 Links", "⚙️ Settings"])

# --- DATA LOADING ---
@st.cache_data(ttl=60) 
def load_data():
    sheet_url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRFLd_9rZtKr3eF2vgWViTENOGZTUTirr-fajK2k5IRVL8hR2R4T_rq0Rooi1FbN9-P25SYtjIylAOA/pub?output=csv"
    return pd.read_csv(sheet_url)

# --- TAB 1: DASHBOARD ---
with tab1:
    st.title("Command Center")
    df = load_data()
    latest = df.loc[df['Timestamp'].idxmax()]
    
    cols = st.columns(3)
    for i, col in enumerate(df.columns[1:4]):
        cols[i % 3].metric(col.replace(" Followers", ""), int(latest[col]))
    
    fig = px.line(df, x='Timestamp', y=df.columns[1:], template="plotly_dark")
    fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
    st.plotly_chart(fig, use_container_width=True)

# --- TAB 2: AI ASSISTANT ---
with tab2:
    st.title("Drum AI")
    st.chat_message("assistant").write("Ready to optimize your stream. What's the plan?")
    st.chat_input("Ask for insights...")

# --- TAB 3: LINKS ---
with tab3:
    st.title("Quick Links")
    links = [("Twitch", "https://twitch.tv/ustayblowinHIGH"), ("TikTok", "https://tiktok.com/@unpdrum"), 
             ("YouTube", "https://youtube.com/@unpdrum"), ("Facebook", "https://facebook.com/unpdrum"), 
             ("Instagram", "https://instagram.com/@unpdrum"), ("Kick", "https://kick.com/unpdrum")]
    for name, url in links:
        st.link_button(name, url, use_container_width=True)

# --- TAB 4: SETTINGS ---
with tab4:
    st.title("Customization")
    st.session_state.accent_color = st.color_picker("Brand Color", st.session_state.accent_color)
    if st.button("Apply Changes"):
        st.rerun()
