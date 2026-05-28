import streamlit as st
import pandas as pd
import plotly.express as px

# 1. Page Configuration - Optimized for Mobile
st.set_page_config(
    page_title="Drum's Command Center", 
    layout="wide", 
    page_icon="🥁",
    initial_sidebar_state="collapsed"
)

# 2. Styling
st.markdown("""
    <style>
    .stApp { background-color: #0e1117; }
    h1 { color: #ffffff; text-align: center; }
    .live-badge { 
        background-color: #262730; 
        padding: 10px; 
        border-radius: 10px; 
        text-align: center; 
        color: #00ff00;
        font-weight: bold;
    }
    </style>
    """, unsafe_allow_html=True)

# 3. Live Header
st.markdown('<div class="live-badge">● LIVE COMMAND CENTER</div>', unsafe_allow_html=True)
st.title("🥁 DRUM!")

# 4. Sidebar Links
st.sidebar.title("🔗 My Links")
st.sidebar.link_button("Twitch", "https://twitch.tv/ustayblowinHIGH")
st.sidebar.link_button("TikTok", "https://tiktok.com/@unpdrum")
st.sidebar.link_button("YouTube", "https://youtube.com/@unpdrum")
st.sidebar.link_button("Facebook", "https://facebook.com/unpdrum")
st.sidebar.link_button("Instagram", "https://instagram.com/unpdrum")
st.sidebar.link_button("Kick", "https://kick.com/unpdrum")

# 5. Data Loading
@st.cache_data(ttl=60) 
def load_data():
    sheet_url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRFLd_9rZtKr3eF2vgWViTENOGZTUTirr-fajK2k5IRVL8hR2R4T_rq0Rooi1FbN9-P25SYtjIylAOA/pub?output=csv"
    df = pd.read_csv(sheet_url)
    df['Timestamp'] = pd.to_datetime(df['Timestamp'], format='mixed')
    df = df.sort_values(by='Timestamp', ascending=True)
    return df

try:
    df = load_data()
    
    # 6. Display Metrics
    st.subheader("📊 Current Stats")

    if st.button("🔄 Refresh Data"):
        st.cache_data.clear()
        st.rerun()

    if df.empty:
        st.warning("No data found!")
    else:
        latest = df.loc[df['Timestamp'].idxmax()] 
        
        # Display stats in a grid
        cols = st.columns(2) # 2 columns for better mobile view
        for i, col_name in enumerate(df.columns[1:]):
            display_name = col_name.replace(" Followers", "").capitalize()
            cols[i % 2].metric(display_name, int(latest[col_name]))

        st.subheader("📈 Growth Trends")
        fig = px.line(df, x='Timestamp', y=df.columns[1:], markers=True)
        fig.update_layout(
            template="plotly_dark", 
            plot_bgcolor="rgba(0,0,0,0)", 
            paper_bgcolor="rgba(0,0,0,0)",
            margin=dict(l=20, r=20, t=30, b=20)
        )
        st.plotly_chart(fig, use_container_width=True)

except Exception as e:
    st.error(f"Data connection issue: {e}")
