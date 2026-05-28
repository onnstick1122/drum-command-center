import streamlit as st
import pandas as pd
import plotly.express as px

# 1. Page Configuration
st.set_page_config(page_title="Drum's Command Center", layout="wide", page_icon="🥁")

# 2. PERSISTENT COLOR STATE
if 'accent_color' not in st.session_state:
    st.session_state.accent_color = '#00d4ff'

# 3. Injecting Dynamic CSS
st.markdown(f"""
    <style>
    .stApp {{ background-color: #080808; }}
    [data-testid="stMetric"] {{ background: #161616; padding: 15px; border-radius: 12px; border-left: 4px solid {st.session_state.accent_color}; }}
    [data-testid="stMetricValue"] {{ color: #ffffff; }}
    div.stButton > button {{ background: {st.session_state.accent_color}; color: #000; font-weight: bold; }}
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
        
        # Display Metrics
        metrics = [col for col in df.columns if col != 'Timestamp']
        cols = st.columns(2)
        for i, col in enumerate(metrics):
            cols[i % 2].metric(col.replace(" Followers", ""), int(latest[col]))
        
        # ALWAYS SHOW THE CHART
        st.subheader("Growth Trends")
        fig = px.line(df, x='Timestamp', y=metrics, template="plotly_dark")
        fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
        st.plotly_chart(fig, use_container_width=True)
    except Exception as e:
        st.error("Waiting for data...")

# --- TAB 2: AI ASSISTANT ---
with tab2:
    st.title("Drum AI")
    if "messages" not in st.session_state:
        st.session_state.messages = []
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
    if prompt := st.chat_input("Ask about your stats..."):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)
        response = f"I am analyzing your data. You requested: {prompt}"
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
    new_color = st.color_picker("Choose Theme Color", st.session_state.accent_color)
    if st.button("Apply Color Permanently"):
        st.session_state.accent_color = new_color
        st.rerun()
