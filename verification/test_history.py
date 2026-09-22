from playwright.sync_api import sync_playwright

def verify_history_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to local file
        page.goto("file:///app/history/history.html")

        # Inject mock data
        page.evaluate("""
            const container = document.getElementById('history-log-container');
            container.innerHTML = `
                <div class="log-item log-item--focus">
                    <div class="log-icon">🎯</div>
                    <div class="log-details">
                        <p class="log-title">Foco concluído: <strong>Estudo Profundo</strong> (45 min)</p>
                        <p class="log-time">09/12/2025 14:30</p>
                    </div>
                </div>
                <div class="log-item log-item--break">
                    <div class="log-icon">☕</div>
                    <div class="log-details">
                        <p class="log-title">Pausa concluída (10 min)</p>
                        <p class="log-time">09/12/2025 15:15</p>
                    </div>
                </div>
                <div class="log-item log-item--interrupt">
                    <div class="log-icon">⚡</div>
                    <div class="log-details">
                        <p class="log-title">Sessão interrompida: <strong>Leitura</strong></p>
                        <p class="log-time">09/12/2025 16:00</p>
                    </div>
                </div>
            `;
        """)

        # Take screenshot
        page.screenshot(path="/app/verification/history_verification.png")
        browser.close()

if __name__ == "__main__":
    verify_history_ui()
