import streamlit as st
import pandas as pd
import plotly.express as px

# 1. Page Configuration
st.set_page_config(page_title="Drum's Command Center", layout="wide", page_icon="🥁")

# 2. Persistence (Session State)
if 'accent_color' not in st.session_state:
    st.session_state.accent_color = '#FF0000'

# 3. Dynamic Styling (Applied across all tabs)
st.markdown(f"""
    <style>
    .stApp {{ background-color: #080808; }}
    [data-testid="stMetric"] {{ background: #161616; padding: 20px; border-radius: 16px; border-left: 6px solid {st.session_state.accent_color}; }}
    [data-testid="stMetricValue"] {{ color: #ffffff; font-weight: 800; font-size: 2rem; }}
    div.stButton > button {{ background: {st.session_state.accent_color}; color: white; border: none; border-radius: 8px; font-weight: bold; width: 100%; }}
    .stChatInput {{ border-color: {st.session_state.accent_color}; }}
    </style>
    """, unsafe_allow_html=True)

# 4. Data Loading
@st.cache_data(ttl=60) 
def load_data():
    sheet_url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRFLd_9rZtKr3eF2vgWViTENOGZTUTirr-fajK2k5IRVL8hR2R4T_rq0Rooi1FbN9-P25SYtjIylAOA/pub?output=csv"
    return pd.read_csv(sheet_url)

# 5. UI Structure
tab1, tab2, tab3, tab4 = st.tabs(["📊 Dashboard", "🤖 AI Assistant", "🔗 Links", "⚙️ Settings"])

# --- DASHBOARD ---
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
        st.warning("Data loading. Please ensure your Google Sheet is published to the web.")

# --- AI ASSISTANT ---
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

        df = load_data()
        latest = df.loc[df['Timestamp'].idxmax()]
        p = prompt.lower()

        if any(word in p for word in ["hello", "hi", "hey"]):
            response = "Hello! I'm your Command Center AI. I'm ready to help you analyze your growth trends."
        elif any(word in p for word in ["stats", "followers", "numbers"]):
            stats_str = ", ".join([f"{col.replace(' Followers', '')}: {int(latest[col])}" for col in df.columns[1:]])
            response = f"Your latest stats are: {stats_str}. Keep pushing!"
        else:
            response = "I'm still learning! Try asking me: 'What are my follower stats?'"

        with st.chat_message("assistant"):
            st.markdown(response)
        st.session_state.messages.append({"role": "assistant", "content": response})

# --- LINKS ---
with tab3:
    st.title("🔗 Quick Links")
    # Verified public-facing URLs
    links = [
        ("Twitch", "https://twitch.tv/ustayblowinHIGH"), 
        ("TikTok", "https://www.tiktok.com/@unpdrum"), 
        ("YouTube", "https://www.youtube.com/@unpdrum"), 
        ("Facebook", "https://www.facebook.com/profile.php?id=100082025942089"), 
        ("Instagram", "https://www.instagram.com/unpdrum/"), 
        ("Kick", "https://kick.com/unpdrum")
    ]
    for name, url in links:
        st.link_button(name, url, use_container_width=True)

# --- SETTINGS ---
with tab4:
    st.title("⚙️ Customization")
    st.session_state.accent_color = st.color_picker("Brand Color", st.session_state.accent_color)
    if st.button("Save & Apply"):
        st.rerun()
