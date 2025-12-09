from playwright.sync_api import sync_playwright

def verify_visuals(page):
    # Mock storage
    page.add_init_script("""
    window.chrome = {
        storage: {
            local: {
                get: (keys, callback) => {
                    const data = {
                        gardenInventory: { seeds: 5, stones: 2, xp: 150, pendingGrowth: 0 },
                        gardenLayout: {
                            '55': { type: 'tree', stage: 3, status: 'healthy' },
                            '45': { type: 'stone', status: 'healthy' }
                        }
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

    # 1. Verify Garden Visuals
    print("Navigating to garden...")
    page.goto("http://localhost:8000/garden/garden.html")
    page.wait_for_selector('.garden-cell')
    page.screenshot(path="verification/visual_garden.png")
    print("Garden screenshot taken.")

    # 2. Verify Popup Visuals
    print("Navigating to popup...")
    page.goto("http://localhost:8000/popup/popup.html")
    page.screenshot(path="verification/visual_popup.png")
    print("Popup screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_visuals(page)
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()
