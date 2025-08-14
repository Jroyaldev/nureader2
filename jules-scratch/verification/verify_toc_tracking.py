import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            # 1. Navigate to the library page.
            await page.goto("http://localhost:3000/library", timeout=60000)

            # 2. Wait for the library to load and click the first book.
            #    We'll look for links inside a div that seems to contain the book list.
            #    This selector is a guess, might need refinement.
            book_link_selector = "a[href*='/reader?id=']"
            await expect(page.locator(book_link_selector).first()).to_be_visible(timeout=30000)
            await page.locator(book_link_selector).first().click()

            # 3. Wait for the reader to load.
            reader_container_selector = ".epub-container"
            await expect(page.locator(reader_container_selector)).to_be_visible(timeout=30000)

            # 4. Hover over the top of the page to make the toolbar appear.
            await page.hover("body", position={"x": 1, "y": 1})

            # 5. Click the "Contents" button to open the TOC.
            toc_button = page.get_by_title("Table of Contents")
            await expect(toc_button).to_be_visible(timeout=10000)
            await toc_button.click()

            # 6. Wait for the TOC to be visible.
            # The TOC is a <nav> element inside a div with class "side-panel-container"
            toc_panel_selector = "nav"
            await expect(page.locator(toc_panel_selector)).to_be_visible(timeout=10000)

            # 7. Scroll the reader container down to the middle of the book
            reader_container = page.locator(reader_container_selector)
            await reader_container.evaluate("(element) => { element.scrollTo(0, element.scrollHeight / 2); }")

            # Give it a moment for the scroll to register and the TOC to update
            await page.wait_for_timeout(2000)

            # 8. Take a screenshot.
            await page.screenshot(path="jules-scratch/verification/verification.png")

            print("Screenshot taken successfully.")

        except Exception as e:
            print(f"An error occurred: {e}")
            # Save a screenshot on error to help debug
            await page.screenshot(path="jules-scratch/verification/error.png")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
