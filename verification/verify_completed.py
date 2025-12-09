from playwright.sync_api import sync_playwright

def verify_completed_layout(page):
    page.add_init_script("""
    window.chrome = {
        storage: {
            local: {
                get: (keys, callback) => {
                    if (callback) callback({});
                    return Promise.resolve({});
                },
                set: (data, callback) => { if (callback) callback(); return Promise.resolve(); }
            }
        },
        runtime: {
            sendMessage: (msg) => {
                if (msg.command === 'getState') {
                    // Simulate COMPLETED state
                    window.postMessage({ type: 'MOCK_STATE_UPDATE', state: {
                        isActive: true,
                        currentPhase: 'completed',
                        listName: 'Deep Work',
                        focusTime: 25,
                        endTime: Date.now(),
                        startTime: Date.now() - 1500000
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

    # Wait for completion view
    page.wait_for_selector('#completed-wrapper')

    # Screenshot
    page.screenshot(path="verification/popup_completed_before.png")
    print("Screenshot taken: popup_completed_before.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_completed_layout(page)
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()
