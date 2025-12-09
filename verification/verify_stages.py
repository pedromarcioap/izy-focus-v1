from playwright.sync_api import sync_playwright

def verify_plant_stages(page):
    page.add_init_script("""
    window.chrome = {
        storage: {
            local: {
                get: (keys, callback) => {
                    const data = {
                        gardenInventory: { seeds: 1, stones: 0, xp: 150, pendingGrowth: 0 },
                        gardenLayout: {
                            '10': { type: 'tree', stage: 1, status: 'healthy' }, // Sprout
                            '20': { type: 'tree', stage: 2, status: 'healthy' }, // Small Tree
                            '30': { type: 'tree', stage: 3, status: 'healthy' }, // Big Tree
                            '40': { type: 'tree', stage: 4, status: 'healthy' }  // Flowering Tree (NEW)
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

    print("Navigating to garden...")
    page.goto("http://localhost:8000/garden/garden.html")

    page.wait_for_selector('.garden-cell')

    # Check for flowering class
    has_flower = page.locator('.pixel-flowering-tree').count() > 0
    print(f"Has Flowering Tree: {has_flower}")

    page.screenshot(path="verification/garden_stages.png")
    print("Screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_plant_stages(page)
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()
