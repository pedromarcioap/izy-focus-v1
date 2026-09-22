from playwright.sync_api import sync_playwright

def verify_garden_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to local file
        page.goto("file:///app/garden/garden.html")

        # Inject mock data
        page.evaluate("""
            const xpValue = document.getElementById('xp-value');
            if (xpValue) xpValue.textContent = '150 / 250 XP';

            const xpBar = document.getElementById('xp-bar-fill');
            if (xpBar) xpBar.style.width = '60%';

            // Re-render grid manually
            const grid = document.getElementById('garden-grid');
            grid.innerHTML = '';
            for(let i=0; i<100; i++) {
                const cell = document.createElement('div');
                cell.className = 'garden-cell';
                grid.appendChild(cell);
            }

            // Plant a tree at index 0
            const cell0 = grid.children[0];
            cell0.innerHTML = '<div class="pixel-art pixel-tree"></div>';

            // Place a stone at index 2
            const cell2 = grid.children[2];
            cell2.innerHTML = '<div class="pixel-art pixel-stone"></div>';

            // Withered plant at index 4
            const cell4 = grid.children[4];
            cell4.classList.add('withered');
            cell4.innerHTML = '<div class="pixel-art pixel-withered"></div>';
        """)

        # Take screenshot
        page.screenshot(path="/app/verification/garden_verification_grid.png")
        browser.close()

if __name__ == "__main__":
    verify_garden_ui()
