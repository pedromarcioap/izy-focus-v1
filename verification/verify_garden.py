from playwright.sync_api import sync_playwright

def verify_garden(page):
    # Injetar o mock antes do script da página carregar
    page.add_init_script("""
    window.chrome = {
        storage: {
            local: {
                get: (keys, callback) => {
                    const data = {
                        gardenInventory: { seeds: 5, stones: 5, xp: 150, pendingGrowth: 0 },
                        gardenLayout: {
                            '0': { type: 'tree', stage: 3, status: 'healthy' } // Uma árvore já existente
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

    # 1. Carregar a página do jardim
    print("Navigating to garden...")
    page.goto("http://localhost:8000/garden/garden.html")

    # 2. Verificar estado inicial
    print("Verifying initial state...")
    page.wait_for_selector('#seed-count')

    # Verificar textos
    seed_count = page.locator('#seed-count').text_content()
    level_text = page.locator('#level-display').text_content()
    print(f"Seeds: {seed_count}, Level: {level_text}")

    if seed_count != '5':
        print(f"ERROR: Expected 5 seeds, got {seed_count}")

    if "Nível 1" not in level_text:
        print(f"ERROR: Expected Level 1, got {level_text}")

    # Screenshot Inicial
    page.screenshot(path="verification/garden_initial.png")
    print("Initial screenshot taken.")

    # 3. Interação: Plantar uma semente
    print("Planting a seed...")

    # Selecionar ferramenta de semente
    page.locator('#tool-seed').click()

    # Clicar na célula 10 (vazia)
    cell = page.locator('.garden-cell[data-id="10"]')
    cell.click()

    # Verificar se plantou (classe pixel-sprout deve aparecer para stage 1)
    page.wait_for_selector('.garden-cell[data-id="10"] .pixel-sprout')
    print("Seed planted successfully.")

    # 4. Screenshot Final
    page.screenshot(path="verification/garden_planted.png")
    print("Final screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_garden(page)
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()
