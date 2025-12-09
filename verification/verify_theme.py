from playwright.sync_api import sync_playwright

def verify_white_theme(page):
    # Mock storage
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
            sendMessage: () => {},
            getURL: (path) => path,
            openOptionsPage: () => {}
        }
    };
    """)

    print("Navigating to popup...")
    page.goto("http://localhost:8000/popup/popup.html")

    page.wait_for_selector('body')

    # Check background color of body
    bg_color = page.evaluate("window.getComputedStyle(document.body).backgroundColor")
    print(f"Body BG Color: {bg_color}")

    # Check background color of a card
    card_bg_color = page.evaluate("window.getComputedStyle(document.querySelector('.card')).backgroundColor")
    print(f"Card BG Color: {card_bg_color}")

    # Check font family of h1
    h1_font = page.evaluate("window.getComputedStyle(document.querySelector('h1')).fontFamily")
    print(f"H1 Font Family: {h1_font}")

    page.screenshot(path="verification/popup_white_theme.png")
    print("Screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_white_theme(page)
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()
