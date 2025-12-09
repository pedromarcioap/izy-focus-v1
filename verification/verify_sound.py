from playwright.sync_api import sync_playwright

def verify_sound_and_cards(page):
    # Mock storage
    page.add_init_script("""
    window.chrome = {
        storage: {
            local: {
                get: (keys, callback) => {
                    const data = {
                        focusLists: [{ id: 1, name: "Test List", focusTime: 25 }],
                        gardenInventory: { seeds: 1, stones: 0, xp: 150, pendingGrowth: 0 },
                        gardenLayout: {}
                    };
                    if (callback) callback(data);
                    return Promise.resolve(data);
                },
                set: (data, callback) => { if (callback) callback(); return Promise.resolve(); }
            }
        },
        runtime: {
            sendMessage: (msg) => {
                if (msg.command === 'getState') {
                    // Simulate ACTIVE focus session to show Sound controls
                    window.postMessage({ type: 'MOCK_STATE_UPDATE', state: {
                        isActive: true,
                        currentPhase: 'focus',
                        listName: 'Test List',
                        focusTime: 25,
                        endTime: Date.now() + 1500000,
                        startTime: Date.now()
                    }}, '*');
                }
            },
            onMessage: {
                addListener: (callback) => {
                    window.addEventListener('message', (event) => {
                        if (event.data.type === 'MOCK_STATE_UPDATE') {
                            callback({ command: 'updateState', state: event.data.state });
                        }
                    });
                }
            },
            getURL: (path) => path,
            openOptionsPage: () => {}
        }
    };
    """)

    # 1. Verify Sound Controls in Popup
    print("Navigating to popup...")
    page.goto("http://localhost:8000/popup/popup.html")
    page.wait_for_selector('#sound-toggle-btn')

    # Toggle sound list
    page.click('#sound-toggle-btn')
    page.wait_for_selector('#sound-list', state='visible')

    # Check background color of sound list
    bg_color = page.evaluate("window.getComputedStyle(document.getElementById('sound-list')).backgroundColor")
    print(f"Sound List BG: {bg_color}")

    page.screenshot(path="verification/popup_sound_check.png")
    print("Popup screenshot taken.")

    # 2. Verify Garden Card Colors (Gray)
    print("Navigating to garden...")
    page.goto("http://localhost:8000/garden/garden.html")

    # Check toolbar item background
    tool_bg = page.evaluate("window.getComputedStyle(document.querySelector('.tool-item')).backgroundColor")
    print(f"Tool Item BG: {tool_bg}")

    # Check garden cell background
    cell_bg = page.evaluate("window.getComputedStyle(document.querySelector('.garden-cell')).backgroundColor")
    print(f"Garden Cell BG: {cell_bg}")

    page.screenshot(path="verification/garden_cards_check.png")
    print("Garden screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_sound_and_cards(page)
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()
