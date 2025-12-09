from playwright.sync_api import sync_playwright

def verify_popup_layout(page):
    # Mock storage and state to simulate an active session
    page.add_init_script("""
    window.chrome = {
        storage: {
            local: {
                get: (keys, callback) => {
                    const data = {
                        focusLists: [{ id: 1, name: "Deep Work", focusTime: 25 }],
                        gardenInventory: { seeds: 10, stones: 5 }
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
                    // Simulate receiving state update for ACTIVE session
                    window.postMessage({ type: 'MOCK_STATE_UPDATE', state: {
                        isActive: true,
                        currentPhase: 'focus',
                        listName: 'Deep Work',
                        focusTime: 25,
                        endTime: Date.now() + 1500000, // 25 min remaining
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

    print("Navigating to popup...")
    page.goto("http://localhost:8000/popup/popup.html")

    # Wait for rendering
    page.wait_for_selector('#timer-display')

    # Screenshot Active Session
    page.screenshot(path="verification/popup_active_before.png")
    print("Screenshot taken: popup_active_before.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_popup_layout(page)
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()
