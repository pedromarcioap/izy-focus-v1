from playwright.sync_api import sync_playwright

def verify_garden_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to local file
        # Note: Playwright can load local files, but chrome.storage won't work perfectly.
        # However, we are testing the static HTML structure (CSS modal, XP display).
        page.goto("file:///app/garden/garden.html")

        # Inject mock data since chrome.storage is not available in file://
        # We need to mock the DOM elements directly or mock the GardenState loading.
        # Since GardenState uses chrome.storage, it will likely fail or return empty.
        # We can manually set the XP text and open the modal via JS evaluation.

        page.evaluate("""
            const xpValue = document.getElementById('xp-value');
            if (xpValue) xpValue.textContent = '150 / 250 XP';

            const xpBar = document.getElementById('xp-bar-fill');
            if (xpBar) xpBar.style.width = '60%';

            // Show modal
            const modal = document.getElementById('achievements-modal');
            const list = document.getElementById('achievements-list');
            modal.classList.remove('hidden');

            // Populate mock achievements
            list.innerHTML = `
                <div class="achievement-item unlocked">
                    <div class="achievement-icon">🌱</div>
                    <div class="achievement-details">
                        <h3>Primeiro Broto ✅</h3>
                        <p>Complete sua primeira sessão de foco.</p>
                    </div>
                </div>
                <div class="achievement-item">
                    <div class="achievement-icon">📅</div>
                    <div class="achievement-details">
                        <h3>Raízes Firmes 🔒</h3>
                        <p>Mantenha o foco por 3 dias seguidos.</p>
                    </div>
                </div>
            `;
        """)

        # Take screenshot
        page.screenshot(path="/app/verification/garden_verification.png")
        browser.close()

if __name__ == "__main__":
    verify_garden_ui()
