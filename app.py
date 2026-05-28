import streamlit as st
import pandas as pd
import plotly.express as px

# 1. Page Configuration
st.set_page_config(page_title="Drum's Command Center", layout="wide", page_icon="🥁")

# 2. Permanent Settings
if 'accent_color' not in st.session_state:
    st.session_state.accent_color = '#FF0000' # Red

# 3. Dynamic Styling
st.markdown(f"""
    <style>
    .stApp {{ background-color: #080808; }}
    [data-testid="stMetric"] {{ background: #161616; padding: 20px; border-radius: 16px; border-left: 6px solid {st.session_state.accent_color}; }}
    [data-testid="stMetricValue"] {{ color: #ffffff; font-weight: 800; font-size: 2rem; }}
    div.stButton > button {{ background: {st.session_state.accent_color}; color: white; border: none; border-radius: 8px; font-weight: bold; width: 100%; }}
    .stChatInput {{ border-color: {st.session_state.accent_color}; }}
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
    
    try:
        df = load_data()
        df['Timestamp'] = pd.to_datetime(df['Timestamp'], format='mixed')
        latest = df.loc[df['Timestamp'].idxmax()]
        
        metrics = [col for col in df.columns if col != 'Timestamp']
        cols = st.columns(2)
        for i, col in enumerate(metrics):
            cols[i % 2].metric(col.replace(" Followers", ""), int(latest[col]))
        
        st.subheader("📈 Growth Trends")
        fig = px.line(df, x='Timestamp', y=metrics, template="plotly_dark")
        fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", margin=dict(l=0, r=0, t=30, b=0))
        st.plotly_chart(fig, use_container_width=True)
    except Exception:
        st.warning("Loading data...")

# --- TAB 2: AI ASSISTANT ---
with tab2:
    st.title("Drum AI")
    if "messages" not in st.session_state:
        st.session_state.messages = []

    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    if prompt := st.chat_input("Ask me about your stats..."):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        # AI Logic
        df = load_data()
        latest = df.loc[df['Timestamp'].idxmax()]
        p = prompt.lower()

        if "hello" in p or "hi" in p:
            response = "Hello! I'm your Command Center AI. Ask me about your current follower counts or growth trends."
        elif "stats" in p or "followers" in p or "numbers" in p:
            response = f"Sure! Your latest stats are: " + ", ".join([f"{col.replace(' Followers', '')}: {int(latest[col])}" for col in df.columns[1:]])
        else:
            response = "I can currently report on your follower stats. Try asking 'What are my stats?'"

        with st.chat_message("assistant"):
            st.markdown(response)
        st.session_state.messages.append({"role": "assistant", "content": response})

# --- TAB 3: LINKS ---
with tab3:
    st.title("🔗 Quick Links")
    links = [("Twitch", "https://twitch.tv/ustayblowinHIGH"), ("TikTok", "https://tiktok.com/@unpdrum"), 
             ("YouTube", "https://youtube.com/@unpdrum"), ("Facebook", "https://facebook.com/unpdrum"), 
             ("Instagram", "https://instagram.com/@unpdrum"), ("Kick", "https://kick.com/unpdrum")]
    for name, url in links:
        st.link_button(name, url, use_container_width=True)

# --- TAB 4: SETTINGS ---
with tab4:
    st.title("⚙️ Customization")
    st.session_state.accent_color = st.color_picker("Brand Color", st.session_state.accent_color)
    if st.button("Save & Apply"):
        st.rerun()
