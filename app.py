import streamlit as st
import pandas as pd
import plotly.express as px

# 1. Page Configuration
st.set_page_config(page_title="Drum's Command Center", layout="wide", page_icon="🥁")

# 2. Permanent Session State for Colors
if 'accent_color' not in st.session_state:
    st.session_state.accent_color = '#00d4ff'

# 3. Styling
st.markdown(f"""
    <style>
    .stApp {{ background-color: #080808; }}
    [data-testid="stMetric"] {{ background: #161616; padding: 15px; border-radius: 12px; border-left: 4px solid {st.session_state.accent_color}; }}
    [data-testid="stMetricValue"] {{ color: #ffffff; }}
    div.stButton > button {{ background: linear-gradient(90deg, {st.session_state.accent_color}, #00aaff); color: white; border-radius: 8px; }}
    </style>
    """, unsafe_allow_html=True)

# 4. Tabs
tab1, tab2, tab3, tab4 = st.tabs(["📊 Dashboard", "🤖 AI Assistant", "🔗 Links", "⚙️ Settings"])

# --- DATA LOADING ---
@st.cache_data(ttl=60) 
def load_data():
    sheet_url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRFLd_9rZtKr3eF2vgWViTENOGZTUTirr-fajK2k5IRVL8hR2R4T_rq0Rooi1FbN9-P25SYtjIylAOA/pub?output=csv"
    return pd.read_csv(sheet_url)

# --- TAB 1: DASHBOARD ---
with tab1:
    st.title("Command Center")
    if st.button("🔄 Refresh Data"):
        st.cache_data.clear()
        st.rerun()
    
    df = load_data()
    latest = df.loc[df['Timestamp'].idxmax()]
    metrics = [col for col in df.columns if col != 'Timestamp']
    cols = st.columns(2)
    for i, col in enumerate(metrics):
        cols[i % 2].metric(col.replace(" Followers", ""), int(latest[col]))

# --- TAB 2: AI ASSISTANT (Google-Style) ---
with tab2:
    st.title("Drum AI")
    if "messages" not in st.session_state:
        st.session_state.messages = [{"role": "assistant", "content": "How can I help you optimize your stream today?"}]

    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    if prompt := st.chat_input("Ask me anything..."):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        # Logic to simulate an AI response
        response = f"I'm analyzing your request: '{prompt}'. As your collaborator, I suggest focusing on your growth metrics!"
        
        with st.chat_message("assistant"):
            st.markdown(response)
        st.session_state.messages.append({"role": "assistant", "content": response})

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
    # This automatically updates the session state
    st.session_state.accent_color = st.color_picker("Pick your Theme Color", st.session_state.accent_color)
    if st.button("Apply Theme"):
        st.rerun()
