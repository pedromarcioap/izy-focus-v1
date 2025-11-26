import os
from playwright.sync_api import sync_playwright

def verify_extension_redesign():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            repo_path = os.getcwd()
            output_dir = os.path.join(repo_path, "verification")
            os.makedirs(output_dir, exist_ok=True)

            pages_to_verify = {
                "popup": "popup/popup.html",
                "garden": "garden/garden.html",
                "blocked": "blocked/blocked.html",
                "stats": "stats/stats.html",
                "options": "options/options.html"
            }

            for name, path in pages_to_verify.items():
                url = f'file://{os.path.join(repo_path, path)}'
                page.goto(url)
                page.wait_for_load_state('networkidle')
                page.screenshot(path=os.path.join(output_dir, f"{name}_view.png"))

        finally:
            browser.close()

if __name__ == "__main__":
    verify_extension_redesign()
