import streamlit as st
import pandas as pd
import plotly.express as px

# 1. Page Configuration
st.set_page_config(
    page_title="Drum's Command Center", 
    layout="wide", 
    page_icon="🥁", 
    initial_sidebar_state="collapsed"
)

# 2. Custom Styling
st.markdown("""
    <style>
    .stApp { background-color: #050505; }
    h1 { color: #ff0055; text-align: center; text-transform: uppercase; }
    h2, h3 { color: #00d4ff; }
    [data-testid="stMetricValue"] { color: #ffffff; }
    [data-testid="stMetricLabel"] { color: #888888; }
    div.stButton > button { background-color: #1a1a1a; color: #00d4ff; border: 1px solid #00d4ff; }
    </style>
    """, unsafe_allow_html=True)

# 3. Tabs for Navigation
tab1, tab2 = st.tabs(["📊 Dashboard", "⚙️ Settings"])

# --- DATA LOADING ---
@st.cache_data(ttl=60) 
def load_data():
    sheet_url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRFLd_9rZtKr3eF2vgWViTENOGZTUTirr-fajK2k5IRVL8hR2R4T_rq0Rooi1FbN9-P25SYtjIylAOA/pub?output=csv"
    df = pd.read_csv(sheet_url)
    df['Timestamp'] = pd.to_datetime(df['Timestamp'], format='mixed')
    df = df.sort_values(by='Timestamp', ascending=True)
    return df

# --- DASHBOARD TAB ---
with tab1:
    st.title("🥁 DRUM! Command Center")
    try:
        df = load_data()
        if st.button("🔄 Refresh Data"):
            st.cache_data.clear()
            st.rerun()

        if not df.empty:
            latest = df.loc[df['Timestamp'].idxmax()] 
            cols = st.columns(2)
            for i, col_name in enumerate(df.columns[1:]):
                display_name = col_name.replace(" Followers", "").capitalize()
                cols[i % 2].metric(display_name, int(latest[col_name]))

            st.subheader("📈 Growth Trends")
            fig = px.line(df, x='Timestamp', y=df.columns[1:], markers=True)
            fig.update_layout(template="plotly_dark", plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)")
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.warning("No data found!")
    except Exception as e:
        st.error(f"Error: {e}")

# --- SETTINGS TAB ---
with tab2:
    st.title("⚙️ Customization")
    st.write("Manage your app settings here.")
    theme = st.selectbox("Choose Color Scheme", ["Dark Neon", "Matrix Green"])
    if st.button("Apply Settings"):
        st.success(f"Theme '{theme}' selected! (Refresh to finalize changes)")
        
    st.markdown("### 🔗 Links")
    st.link_button("Twitch", "https://twitch.tv/ustayblowinHIGH")
    st.link_button("Kick", "https://kick.com/unpdrum")
