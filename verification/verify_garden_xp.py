from playwright.sync_api import sync_playwright

def verify_garden_xp(page):
    page.add_init_script("""
    window.chrome = {
        storage: {
            local: {
                get: (keys, callback) => {
                    // Simulate having XP
                    const data = {
                        gardenInventory: { seeds: 1, stones: 0, xp: 150, pendingGrowth: 0 },
                        gardenLayout: {}
                    };
                    if (callback) callback(data);
                    return Promise.resolve(data);
                },
                set: (data, callback) => { if (callback) callback(); return Promise.resolve(); }
            }
        },
        runtime: { sendMessage: () => {} }
    };
    """)

    print("Navigating to garden...")
    page.goto("http://localhost:8000/garden/garden.html")

    page.wait_for_selector('.xp-bar-fill')

    # Check if the width is set (non-zero)
    style = page.locator('#xp-bar-fill').get_attribute('style')
    print(f"XP Bar Style: {style}")

    page.screenshot(path="verification/garden_xp.png")
    print("Screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_garden_xp(page)
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()
