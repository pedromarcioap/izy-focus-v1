from playwright.sync_api import sync_playwright

def verify_garden_nan_bug(page):
    # Injetar o mock simulando o bug de NaN
    page.add_init_script("""
    window.chrome = {
        storage: {
            local: {
                get: (keys, callback) => {
                    const data = {
                        gardenInventory: { seeds: "NaN", stones: 1, xp: 150, pendingGrowth: 0 },
                        gardenLayout: {
                            // Simulando "itens fantasma" ou inválidos nas primeiras células
                            '0': { type: 'unknown' },
                            '1': null, // null deve ser ignorado
                            '2': "corrupted"
                        }
                    };
                    if (callback) callback(data);
                    return Promise.resolve(data);
                },
                set: (data, callback) => {
                    console.log('Mock storage set:', data);
                    if (callback) callback();
                    return Promise.resolve();
                }
            }
        },
        runtime: {
            sendMessage: () => {}
        }
    };
    """)

    print("Navigating to garden...")
    page.goto("http://localhost:8000/garden/garden.html")

    # 2. Verificar estado inicial
    print("Verifying initial state...")
    page.wait_for_selector('#seed-count')

    seed_count = page.locator('#seed-count').text_content()
    print(f"Seeds: {seed_count}")

    # Se o bug existir, deve ser NaN
    if seed_count == 'NaN':
        print("Bug Reproduced: Seeds count is NaN")
    else:
        print(f"Unexpected: Seeds count is {seed_count}")

    # Screenshot Inicial
    page.screenshot(path="verification/garden_nan_repro.png")
    print("Reproduction screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_garden_nan_bug(page)
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()
