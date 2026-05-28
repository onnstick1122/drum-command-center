import streamlit as st
import pandas as pd
import numpy as np
from playwright.async_api import async_playwright
import asyncio

st.set_page_config(page_title="Drum's Master Dashboard", page_icon="🥁", layout="wide")

st.title("🥁 Drum's Ultimate Stream Stats Dashboard")
st.markdown("### Total Metrics Across All Platforms")

# --- USERNAME CONFIG ---
TWITCH_NAME = "ustayblowinHIGH"
UNP_NAME = "unpdrum"

# --- ASYNC TWITCH SCANNER ---
async def get_twitch_viewers(channel):
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(f"https://www.twitch.tv/{channel}", timeout=10000)
            await page.wait_for_timeout(3000)
            selector = 'span[data-a-target="animated-channel-viewers-count"]'
            viewers = await page.inner_text(selector)
            await browser.close()
            return f"{viewers} 🔥"
    except:
        return "Offline 💤"

# --- METRIC CARDS ---
m1, m2, m3, m4, m5 = st.columns(5)
m1.metric("🟪 Twitch Followers", "1.2K", "+14")
m2.metric("🟥 YouTube Subs", "840", "+5")
m3.metric("🟢 Kick Followers", "310", "+22")
m4.metric("🎵 TikTok Fans", "4.5K", "+110")
m5.metric("🟦 FB Page Likes", "520", "+3")

st.divider()

# --- LIVE SCANNER ---
st.subheader("📡 Real-Time Status")
if st.button("🚀 Run Live Twitch Scan"):
    with st.spinner("Pinging Twitch..."):
        # Running the async function in Streamlit
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(get_twitch_viewers(TWITCH_NAME))
        st.session_state['twitch_live_stat'] = result

st.info(f"Twitch Status: **{st.session_state.get('twitch_live_stat', 'Not Checked')}**")

st.divider()

# --- CHARTS ---
st.subheader("📈 Multi-Platform Growth History")
chart_data = pd.DataFrame(
    np.random.randint(100, 1500, size=(10, 5)),
    columns=['Twitch', 'YouTube', 'Kick', 'TikTok', 'Facebook']
)
st.line_chart(chart_data)

st.dataframe(chart_data, use_container_width=True)